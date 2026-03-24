// server/src/routes/supportRoutes.js
import express from 'express';
import { pool } from '../../server.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// ============================================
// ✅ الحصول على تذاكر المستخدم
// ============================================
router.get('/tickets', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const targetUserId = req.query.user_id || userId;
    
    const result = await pool.query(
      `SELECT * FROM app.support_tickets 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [targetUserId]
    );
    
    res.json({
      success: true,
      tickets: result.rows
    });
  } catch (error) {
    console.error('❌ Get tickets error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ' });
  }
});

// ============================================
// ✅ إنشاء تذكرة جديدة
// ============================================
router.post('/tickets', protect, async (req, res) => {
  try {
    const { subject, message, priority = 'normal', type = 'general', user_id } = req.body;
    const userId = user_id || req.user.id;
    
    console.log('📝 [Support] Creating ticket for user_id:', userId);
    console.log('📝 [Support] From token user_id:', req.user.id);
    console.log('📝 [Support] From body user_id:', user_id);

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
    console.log('✅ [Support] Ticket created:', { id: ticket.id, user_id: ticket.user_id });

    if (message) {
      await pool.query(
        `INSERT INTO app.support_messages (ticket_id, user_id, message, is_from_user, created_at)
         VALUES ($1, $2, $3, true, NOW())`,
        [ticket.id, userId, message]
      );
    }

    // ✅ إنشاء إشعار للمسؤولين عند إنشاء تذكرة جديدة
    const userResult = await pool.query(
      `SELECT full_name, email FROM app.users WHERE id = $1`,
      [userId]
    );
    const userName = userResult.rows[0]?.full_name || userResult.rows[0]?.email || `مستخدم ${userId}`;
    
    // الحصول على جميع المسؤولين
    const adminsResult = await pool.query(
      `SELECT id FROM app.users WHERE role IN ('admin', 'support')`
    );
    
    for (const admin of adminsResult.rows) {
      await pool.query(
        `INSERT INTO app.notifications (user_id, title, message, type, is_read, created_at, action_url, data)
         VALUES ($1, $2, $3, $4, false, NOW(), $5, $6)`,
        [
          admin.id,
          'تذكرة دعم جديدة',
          `${userName} فتح تذكرة دعم جديدة`,
          'support_ticket',
          `/admin/support?ticket=${ticket.id}`,
          JSON.stringify({ ticketId: ticket.id, userId, type: 'new_ticket' })
        ]
      );
    }
    console.log('✅ [Support] Notifications sent to admins for new ticket');

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
// ✅ الحصول على رسائل التذكرة
// ============================================
router.get('/tickets/:ticketId/messages', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { ticketId } = req.params;

    const ticketResult = await pool.query(
      `SELECT * FROM app.support_tickets 
       WHERE id = $1 AND user_id = $2`,
      [ticketId, userId]
    );

    if (ticketResult.rows.length === 0) {
      const isAdmin = req.user.role === 'admin' || req.user.role === 'support';
      if (!isAdmin) {
        return res.status(404).json({ success: false, message: 'التذكرة غير موجودة' });
      }
    }

    const messagesResult = await pool.query(
      `SELECT * FROM app.support_messages 
       WHERE ticket_id = $1 
       ORDER BY created_at ASC`,
      [ticketId]
    );

    res.json({
      success: true,
      messages: messagesResult.rows
    });

  } catch (error) {
    console.error('❌ Get messages error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ' });
  }
});

// ============================================
// ✅ إرسال رسالة (معدل مع إشعارات)
// ============================================
router.post('/tickets/:ticketId/messages', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { ticketId } = req.params;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: 'الرسالة مطلوبة' });
    }

    // التحقق من أن التذكرة موجودة وغير مغلقة
    const ticketResult = await pool.query(
      `SELECT * FROM app.support_tickets 
       WHERE id = $1 AND status != 'closed'`,
      [ticketId]
    );

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'التذكرة غير موجودة أو مغلقة' });
    }

    const ticket = ticketResult.rows[0];
    
    // ✅ السماح للمستخدم صاحب التذكرة فقط بإرسال رسائل (أو المسؤول)
    const isOwner = ticket.user_id === userId;
    const isAdmin = req.user.role === 'admin' || req.user.role === 'support';
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'غير مصرح لك بإرسال رسائل لهذه التذكرة' });
    }

    const senderUserId = isOwner ? userId : (ticket.user_id === userId ? userId : req.user.id);
    
    const messageResult = await pool.query(
      `INSERT INTO app.support_messages (ticket_id, user_id, message, is_from_user, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [ticketId, senderUserId, message, isOwner]
    );

    await pool.query(
      `UPDATE app.support_tickets 
       SET updated_at = NOW()
       WHERE id = $1`,
      [ticketId]
    );

    console.log('✅ [Support] Message sent:', { ticketId, userId: senderUserId, isFromUser: isOwner });

    // ✅ إنشاء إشعار للمسؤولين إذا كانت الرسالة من مستخدم عادي
    if (!isOwner && !isAdmin) {
      // جلب اسم المستخدم
      const userResult = await pool.query(
        `SELECT full_name, email FROM app.users WHERE id = $1`,
        [userId]
      );
      const userName = userResult.rows[0]?.full_name || userResult.rows[0]?.email || `مستخدم ${userId}`;
      
      // الحصول على جميع المسؤولين
      const adminsResult = await pool.query(
        `SELECT id FROM app.users WHERE role IN ('admin', 'support')`
      );
      
      for (const admin of adminsResult.rows) {
        await pool.query(
          `INSERT INTO app.notifications (user_id, title, message, type, is_read, created_at, action_url, data)
           VALUES ($1, $2, $3, $4, false, NOW(), $5, $6)`,
          [
            admin.id,
            'رسالة دعم جديدة',
            `رسالة جديدة من ${userName}: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`,
            'support_message',
            `/admin/support?ticket=${ticketId}`,
            JSON.stringify({ ticketId, userId, message: message.substring(0, 200) })
          ]
        );
      }
      console.log('✅ [Support] Notification sent to admins for new message');
    }
    
    // ✅ إذا كانت الرسالة من مسؤول، أرسل إشعار للمستخدم صاحب التذكرة
    if ((isAdmin || req.user.role === 'admin' || req.user.role === 'support') && !isOwner) {
      await pool.query(
        `INSERT INTO app.notifications (user_id, title, message, type, is_read, created_at, action_url, data)
         VALUES ($1, $2, $3, $4, false, NOW(), $5, $6)`,
        [
          ticket.user_id,
          'رد على تذكرة الدعم',
          `تم الرد على تذكرتك: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`,
          'support_reply',
          `/support?ticket=${ticketId}`,
          JSON.stringify({ ticketId, message: message.substring(0, 200) })
        ]
      );
      console.log('✅ [Support] Notification sent to user for admin reply');
    }

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
router.put('/tickets/:ticketId/close', protect, async (req, res) => {
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
router.post('/tickets/:ticketId/rate', protect, async (req, res) => {
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
router.get('/admin/tickets', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'support') {
      return res.status(403).json({ 
        success: false, 
        message: 'غير مصرح' 
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
    console.error('❌ Admin tickets error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ' });
  }
});

export default router;
