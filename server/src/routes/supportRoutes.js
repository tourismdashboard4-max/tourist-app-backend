// server/src/routes/supportRoutes.js
import express from 'express';
import { pool } from '../../server.js';
import { protect } from '../middleware/authMiddleware.js';
import notificationService from '../services/notificationService.js'; // ✅ أضف هذا

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
      await notificationService.create(admin.id, {
        title: 'تذكرة دعم جديدة',
        message: `${userName} فتح تذكرة دعم جديدة`,
        type: 'support_ticket',
        priority: 'high',
        action_url: `/admin/support?ticket=${ticket.id}`,
        data: JSON.stringify({ ticketId: ticket.id, userId, type: 'new_ticket' })
      });
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
// ✅ الحصول على رسائل التذكرة (معدل)
// ============================================
router.get('/tickets/:ticketId/messages', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { ticketId } = req.params;

    console.log('🔍 [Support] Get messages - userId:', userId, 'ticketId:', ticketId);

    // التحقق من أن التذكرة موجودة
    const ticketResult = await pool.query(
      `SELECT * FROM app.support_tickets WHERE id = $1`,
      [ticketId]
    );

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'التذكرة غير موجودة' });
    }

    const ticket = ticketResult.rows[0];
    const isAdmin = req.user.role === 'admin' || req.user.role === 'support';
    const isOwner = ticket.user_id === userId;

    console.log('🔍 [Support] Ticket owner:', ticket.user_id, 'Current user:', userId, 'isAdmin:', isAdmin, 'isOwner:', isOwner);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'غير مصرح لك برؤية هذه التذكرة' });
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

    console.log('📤 [Support] Send message - userId:', userId, 'ticketId:', ticketId);

    // التحقق من أن التذكرة موجودة
    const ticketResult = await pool.query(
      `SELECT * FROM app.support_tickets WHERE id = $1`,
      [ticketId]
    );

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'التذكرة غير موجودة' });
    }

    const ticket = ticketResult.rows[0];
    const isAdmin = req.user.role === 'admin' || req.user.role === 'support';
    const isOwner = ticket.user_id === userId;

    console.log('📤 [Support] Ticket owner:', ticket.user_id, 'Current user:', userId, 'isAdmin:', isAdmin, 'isOwner:', isOwner);

    // ✅ السماح للمالك والمسؤولين بإرسال الرسائل
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'غير مصرح لك بإرسال رسائل لهذه التذكرة' });
    }

    // التحقق من أن التذكرة غير مغلقة
    if (ticket.status === 'closed') {
      return res.status(400).json({ success: false, message: 'التذكرة مغلقة لا يمكن إرسال رسائل' });
    }

    const messageResult = await pool.query(
      `INSERT INTO app.support_messages (ticket_id, user_id, message, is_from_user, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [ticketId, userId, message, isOwner || !isAdmin]
    );

    await pool.query(
      `UPDATE app.support_tickets SET updated_at = NOW() WHERE id = $1`,
      [ticketId]
    );

    console.log('✅ [Support] Message sent:', { ticketId, userId, isFromUser: isOwner || !isAdmin });

    // ✅ إنشاء إشعار للمسؤولين إذا كانت الرسالة من مستخدم عادي (وليس مسؤول)
    // ✅ التعديل: أي مستخدم ليس مسؤولاً (حتى لو كان مالكاً)
    if (!isAdmin) {
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
        await notificationService.create(admin.id, {
          title: 'رسالة دعم جديدة',
          message: `رسالة جديدة من ${userName}: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`,
          type: 'support_message',
          priority: 'high',
          action_url: `/admin/support?ticket=${ticketId}`,
          data: JSON.stringify({ ticketId, userId, message: message.substring(0, 200) })
        });
      }
      console.log('✅ [Support] Notification sent to admins for new message from user');
    }
    
    // ✅ إذا كانت الرسالة من مسؤول، أرسل إشعار للمستخدم صاحب التذكرة
    if (isAdmin && !isOwner) {
      await notificationService.create(ticket.user_id, {
        title: 'رد على تذكرة الدعم',
        message: `تم الرد على تذكرتك: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`,
        type: 'support_reply',
        priority: 'high',
        action_url: `/support?ticket=${ticketId}`,
        data: JSON.stringify({ ticketId, message: message.substring(0, 200) })
      });
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
