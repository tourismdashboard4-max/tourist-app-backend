// server/src/routes/supportRoutes.js
import express from 'express';
import { pool } from '../../server.js';  // تغيير المسار
import { authenticate } from '../middleware/auth.js';  // استخدام authenticate بدلاً من protect

const router = express.Router();

// ============================================
// ✅ الحصول على تذاكر المستخدم (محادثات)
// ============================================
router.get('/tickets', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT t.*, 
             COUNT(m.id) as messages_count,
             MAX(m.created_at) as last_message,
             (SELECT COUNT(*) FROM app.support_messages WHERE ticket_id = t.id AND is_read = false AND is_from_user = false) as unread_count
      FROM app.support_tickets t
      LEFT JOIN app.support_messages m ON t.id = m.ticket_id
      WHERE t.user_id = $1
    `;
    const params = [userId];
    let paramIndex = 2;

    if (status) {
      query += ` AND t.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += `
      GROUP BY t.id
      ORDER BY t.updated_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const ticketsResult = await pool.query(query, params);

    res.json({
      success: true,
      tickets: ticketsResult.rows,
      pagination: { page: parseInt(page), limit: parseInt(limit) }
    });

  } catch (error) {
    console.error('❌ Get tickets error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ' });
  }
});

// ============================================
// ✅ الحصول على تفاصيل تذكرة (محادثة)
// ============================================
router.get('/tickets/:ticketId', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { ticketId } = req.params;

    const ticketResult = await pool.query(
      `SELECT * FROM app.support_tickets 
       WHERE id = $1 AND user_id = $2`,
      [ticketId, userId]
    );

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'التذكرة غير موجودة' });
    }

    const ticket = ticketResult.rows[0];

    const messagesResult = await pool.query(
      `SELECT m.*, u.full_name as sender_name
       FROM app.support_messages m
       LEFT JOIN app.users u ON m.user_id = u.id
       WHERE m.ticket_id = $1
       ORDER BY m.created_at ASC`,
      [ticketId]
    );

    // تحديث حالة القراءة
    await pool.query(
      `UPDATE app.support_messages 
       SET is_read = true 
       WHERE ticket_id = $1 AND user_id != $2 AND is_read = false`,
      [ticketId, userId]
    );

    res.json({
      success: true,
      ticket,
      messages: messagesResult.rows
    });

  } catch (error) {
    console.error('❌ Get ticket error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ' });
  }
});

// ============================================
// ✅ إنشاء تذكرة جديدة
// ============================================
router.post('/tickets', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { subject, message, priority = 'normal', type = 'general' } = req.body;

    if (!subject) {
      return res.status(400).json({ success: false, message: 'الموضوع مطلوب' });
    }

    const ticketResult = await pool.query(
      `INSERT INTO app.support_tickets (user_id, subject, type, priority, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'open', NOW(), NOW())
       RETURNING *`,
      [userId, subject, type, priority]
    );

    const ticket = ticketResult.rows[0];

    // إذا كان هناك رسالة أولية، أضفها
    if (message) {
      await pool.query(
        `INSERT INTO app.support_messages (ticket_id, user_id, message, is_from_user, created_at)
         VALUES ($1, $2, $3, true, NOW())`,
        [ticket.id, userId, message]
      );
    }

    res.json({
      success: true,
      ticket,
      message: 'تم إنشاء تذكرة الدعم بنجاح'
    });

  } catch (error) {
    console.error('❌ Create ticket error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ' });
  }
});

// ============================================
// ✅ إرسال رسالة
// ============================================
router.post('/tickets/:ticketId/messages', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { ticketId } = req.params;
    const { message, attachments } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: 'الرسالة مطلوبة' });
    }

    // التحقق من وجود التذكرة
    const ticketResult = await pool.query(
      `SELECT * FROM app.support_tickets 
       WHERE id = $1 AND user_id = $2 AND status != 'closed'`,
      [ticketId, userId]
    );

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'التذكرة غير موجودة أو مغلقة' });
    }

    const messageResult = await pool.query(
      `INSERT INTO app.support_messages (ticket_id, user_id, message, is_from_user, attachments, created_at)
       VALUES ($1, $2, $3, true, $4, NOW())
       RETURNING *`,
      [ticketId, userId, message, attachments || '[]']
    );

    // تحديث وقت آخر تعديل
    await pool.query(
      `UPDATE app.support_tickets 
       SET updated_at = NOW()
       WHERE id = $1`,
      [ticketId]
    );

    res.json({
      success: true,
      message: messageResult.rows[0]
    });

  } catch (error) {
    console.error('❌ Send message error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ' });
  }
});

// ============================================
// ✅ إغلاق التذكرة
// ============================================
router.put('/tickets/:ticketId/close', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { ticketId } = req.params;

    const result = await pool.query(
      `UPDATE app.support_tickets 
       SET status = 'closed', updated_at = NOW()
       WHERE id = $1 AND user_id = $2 AND status != 'closed'
       RETURNING *`,
      [ticketId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'التذكرة غير موجودة أو مغلقة بالفعل' });
    }

    res.json({
      success: true,
      message: 'تم إغلاق التذكرة بنجاح'
    });

  } catch (error) {
    console.error('❌ Close ticket error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ' });
  }
});

// ============================================
// ✅ تقييم التذكرة
// ============================================
router.post('/tickets/:ticketId/rate', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { ticketId } = req.params;
    const { rating, feedback } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'التقييم يجب أن يكون بين 1 و 5' });
    }

    const result = await pool.query(
      `UPDATE app.support_tickets 
       SET rating = $1, feedback = $2, updated_at = NOW()
       WHERE id = $3 AND user_id = $4 AND status = 'closed'
       RETURNING *`,
      [rating, feedback || null, ticketId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'التذكرة غير موجودة أو غير مغلقة' });
    }

    res.json({
      success: true,
      message: 'شكراً لتقييمك!'
    });

  } catch (error) {
    console.error('❌ Rate ticket error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ' });
  }
});

// ============================================
// ✅ مسارات المسؤول
// ============================================

// الحصول على جميع التذاكر (للمسؤول)
router.get('/admin/tickets', authenticate, async (req, res) => {
  try {
    // التحقق من أن المستخدم مسؤول
    if (req.user.role !== 'admin' && req.user.role !== 'support') {
      return res.status(403).json({ 
        success: false, 
        message: 'غير مصرح. يرجى تسجيل الدخول' 
      });
    }
    
    const result = await pool.query(
      `SELECT t.*, u.email, u.full_name as user_name
       FROM app.support_tickets t
       LEFT JOIN app.users u ON t.user_id = u.id
       ORDER BY t.created_at DESC`
    );
    
    res.json({
      success: true,
      tickets: result.rows
    });
  } catch (error) {
    console.error('❌ Error fetching all tickets:', error);
    res.status(500).json({ success: false, message: 'فشل تحميل التذاكر' });
  }
});

export default router;
