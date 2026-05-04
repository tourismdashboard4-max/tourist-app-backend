// server/src/routes/supportRoutes.js - النسخة النهائية المصححة (تعرض التذاكر للمشاركين عبر metadata بشكل آمن)
import express from 'express';
import { pool } from '../../server.js';
import { protect } from '../middleware/authMiddleware.js';
import notificationService from '../services/notificationService.js';

const router = express.Router();

// ============================================
// ✅ الحصول على تذاكر المستخدم (مع دعم metadata.guideId, touristId, participants، ...)
//    مع تحسين الأداء وتجنب أخطاء JSONB
// ============================================
router.get('/tickets', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, type } = req.query;

    // ✅ استعلام آمن: يتحقق من وجود المفاتيح قبل استخدامها، ويقارن النصوص بطريقة آمنة
    let query = `
      SELECT t.*, u.email, u.full_name as user_name
      FROM app.support_tickets t
      LEFT JOIN app.users u ON t.user_id = u.id
      WHERE (
        t.user_id = $1
        OR (t.metadata ? 'guideId' AND t.metadata->>'guideId' = $1::text)
        OR (t.metadata ? 'touristId' AND t.metadata->>'touristId' = $1::text)
        OR (t.metadata ? 'created_by_id' AND t.metadata->>'created_by_id' = $1::text)
        OR (t.metadata ? 'participants' AND t.metadata->'participants' ? $1::text)
        OR (t.assigned_to IS NOT NULL AND t.assigned_to = $1)
      )
    `;
    const params = [userId];
    let paramIndex = 2;

    if (status && status !== 'all') {
      query += ` AND t.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    if (type && type !== 'all') {
      query += ` AND t.type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }
    query += ` ORDER BY t.created_at DESC`;

    const result = await pool.query(query, params);
    res.json({ success: true, tickets: result.rows });
  } catch (error) {
    console.error('❌ Get tickets error:', error);
    // إرسال تفاصيل الخطأ للمطور (في بيئة الإنتاج يمكن إخفاءها)
    res.status(500).json({ success: false, message: 'حدث خطأ', error: error.message });
  }
});

// ============================================
// ✅ إنشاء تذكرة جديدة (مع دعم guide_chat و metadata)
// ============================================
router.post('/tickets', protect, async (req, res) => {
  try {
    const { subject, message, priority = 'normal', type = 'general', user_id, metadata } = req.body;
    const userId = user_id || req.user.id;
    
    console.log('📝 [Support] Creating ticket for user_id:', userId);
    console.log('📝 [Support] From token user_id:', req.user.id);
    console.log('📝 [Support] From body user_id:', user_id);
    console.log('📝 [Support] Type:', type, 'Metadata:', metadata);

    if (!subject) {
      return res.status(400).json({ success: false, message: 'الموضوع مطلوب' });
    }

    // إدراج التذكرة مع دعم metadata
    const ticketResult = await pool.query(
      `INSERT INTO app.support_tickets (user_id, subject, type, priority, status, metadata, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'open', $5, NOW(), NOW())
       RETURNING *`,
      [userId, subject, type, priority, metadata || {}]
    );

    const ticket = ticketResult.rows[0];
    console.log('✅ [Support] Ticket created:', { id: ticket.id, user_id: ticket.user_id, type: ticket.type });

    if (message) {
      await pool.query(
        `INSERT INTO app.support_messages (ticket_id, user_id, message, is_from_user, created_at)
         VALUES ($1, $2, $3, true, NOW())`,
        [ticket.id, userId, message]
      );
    }

    // جلب اسم المستخدم
    const userResult = await pool.query(
      `SELECT full_name, email FROM app.users WHERE id = $1`,
      [userId]
    );
    const userName = userResult.rows[0]?.full_name || userResult.rows[0]?.email || `مستخدم ${userId}`;
    
    // ✅ إذا كانت التذكرة من نوع guide_chat، أرسل إشعار للمرشد
    if (type === 'guide_chat' && metadata?.guideId) {
      const guideId = metadata.guideId;
      const guideName = metadata.guideName || 'المرشد';
      
      console.log(`📢 Sending notification to guide ${guideId} for new chat ticket`);
      
      await notificationService.create(guideId, {
        title: 'محادثة جديدة من مسافر',
        message: `${userName} بدأ محادثة معك: ${message?.substring(0, 100) || 'يريد التواصل معك'}`,
        type: 'guide_chat',
        priority: 'high',
        action_url: `/support?ticket=${ticket.id}`,
        data: JSON.stringify({ ticketId: ticket.id, userId, type: 'new_chat', guideId })
      });
      console.log(`✅ Notification sent to guide ${guideId}`);
    }
    
    // ✅ إرسال إشعار للمسؤولين (لجميع أنواع التذاكر)
    const adminsResult = await pool.query(
      `SELECT id FROM app.users WHERE role IN ('admin', 'support')`
    );
    
    for (const admin of adminsResult.rows) {
      await notificationService.create(admin.id, {
        title: type === 'guide_chat' ? 'محادثة جديدة مع مرشد' : 'تذكرة دعم جديدة',
        message: `${userName} ${type === 'guide_chat' ? 'بدأ محادثة مع مرشد' : 'فتح تذكرة دعم جديدة'}: ${subject.substring(0, 50)}`,
        type: 'support_ticket',
        priority: 'high',
        action_url: `/admin/support?ticket=${ticket.id}`,
        data: JSON.stringify({ ticketId: ticket.id, userId, type: 'new_ticket', chatType: type })
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
// ✅ الحصول على رسائل التذكرة
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
    
    // ✅ السماح للمرشد بالوصول إذا كانت التذكرة من نوع guide_chat وهو المرشد المحدد
    const isGuide = ticket.type === 'guide_chat' && ticket.metadata?.guideId === userId;

    console.log('🔍 [Support] Ticket owner:', ticket.user_id, 'Current user:', userId, 'isAdmin:', isAdmin, 'isOwner:', isOwner, 'isGuide:', isGuide);

    if (!isOwner && !isAdmin && !isGuide) {
      return res.status(403).json({ success: false, message: 'غير مصرح لك برؤية هذه التذكرة' });
    }

    const messagesResult = await pool.query(
      `SELECT m.*, u.full_name as sender_name, u.avatar_url as sender_avatar
       FROM app.support_messages m
       LEFT JOIN app.users u ON m.user_id = u.id
       WHERE m.ticket_id = $1 
       ORDER BY m.created_at ASC`,
      [ticketId]
    );

    res.json({
      success: true,
      messages: messagesResult.rows,
      ticket: ticket
    });

  } catch (error) {
    console.error('❌ Get messages error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ' });
  }
});

// ============================================
// ✅ إرسال رسالة (مع إشعارات للمرشدين)
// ============================================
router.post('/tickets/:ticketId/messages', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { ticketId } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'الرسالة مطلوبة' });
    }

    console.log('📤 [Support] Send message - userId:', userId, 'ticketId:', ticketId);

    // التحقق من أن التذكرة موجودة
    const ticketResult = await pool.query(
      `SELECT t.*, u.full_name as user_name, u.email as user_email
       FROM app.support_tickets t
       LEFT JOIN app.users u ON t.user_id = u.id
       WHERE t.id = $1`,
      [ticketId]
    );

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'التذكرة غير موجودة' });
    }

    const ticket = ticketResult.rows[0];
    const isAdmin = req.user.role === 'admin' || req.user.role === 'support';
    const isOwner = ticket.user_id === userId;
    
    // ✅ السماح للمرشد بالرد إذا كانت التذكرة من نوع guide_chat وهو المرشد المحدد
    const isGuide = ticket.type === 'guide_chat' && ticket.metadata?.guideId === userId;

    console.log('📤 [Support] Ticket owner:', ticket.user_id, 'Current user:', userId, 'isAdmin:', isAdmin, 'isOwner:', isOwner, 'isGuide:', isGuide);

    // ✅ السماح للمالك والمسؤولين والمرشدين بإرسال الرسائل
    if (!isOwner && !isAdmin && !isGuide) {
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
      [ticketId, userId, message, !isAdmin && !isGuide]
    );

    await pool.query(
      `UPDATE app.support_tickets SET updated_at = NOW() WHERE id = $1`,
      [ticketId]
    );

    console.log('✅ [Support] Message sent:', { ticketId, userId, isFromUser: !isAdmin && !isGuide });

    // جلب اسم المرسل
    const senderResult = await pool.query(
      `SELECT full_name, email FROM app.users WHERE id = $1`,
      [userId]
    );
    const senderName = senderResult.rows[0]?.full_name || senderResult.rows[0]?.email || `مستخدم ${userId}`;

    // ✅ إرسال إشعار للمرشد إذا كانت التذكرة من نوع guide_chat والمرسل ليس المرشد
    if (ticket.type === 'guide_chat' && ticket.metadata?.guideId && userId !== ticket.metadata.guideId) {
      const guideId = ticket.metadata.guideId;
      console.log(`📢 Sending notification to guide ${guideId} for new message`);
      
      await notificationService.create(guideId, {
        title: 'رسالة جديدة من مسافر',
        message: `${senderName}: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`,
        type: 'guide_chat_message',
        priority: 'high',
        action_url: `/support?ticket=${ticketId}`,
        data: JSON.stringify({ ticketId, userId, message: message.substring(0, 200), type: 'new_message' })
      });
      console.log(`✅ Notification sent to guide ${guideId}`);
    }
    
    // ✅ إرسال إشعار للمستخدم (المسافر) إذا رد المرشد أو المسؤول
    if ((isGuide || isAdmin) && !isOwner) {
      console.log(`📢 Sending notification to user ${ticket.user_id} for reply`);
      
      await notificationService.create(ticket.user_id, {
        title: isGuide ? 'رد من المرشد' : 'رد على تذكرة الدعم',
        message: `${senderName}: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`,
        type: isGuide ? 'guide_reply' : 'support_reply',
        priority: 'high',
        action_url: `/support?ticket=${ticketId}`,
        data: JSON.stringify({ ticketId, message: message.substring(0, 200), type: 'reply' })
      });
      console.log(`✅ Notification sent to user ${ticket.user_id}`);
    }
    
    // ✅ إرسال إشعار للمسؤولين إذا كانت الرسالة من مستخدم عادي (وليس مسؤول وليس مرشد)
    if (!isAdmin && !isGuide) {
      const adminsResult = await pool.query(
        `SELECT id FROM app.users WHERE role IN ('admin', 'support')`
      );
      
      for (const admin of adminsResult.rows) {
        await notificationService.create(admin.id, {
          title: ticket.type === 'guide_chat' ? 'رسالة جديدة في محادثة مرشد' : 'رسالة دعم جديدة',
          message: `رسالة جديدة من ${senderName}: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`,
          type: 'support_message',
          priority: 'high',
          action_url: `/admin/support?ticket=${ticketId}`,
          data: JSON.stringify({ ticketId, userId, message: message.substring(0, 200), chatType: ticket.type })
        });
      }
      console.log('✅ [Support] Notifications sent to admins for new message from user');
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

    // التحقق من التذكرة
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
    const isGuide = ticket.type === 'guide_chat' && ticket.metadata?.guideId === userId;
    
    if (!isOwner && !isAdmin && !isGuide) {
      return res.status(403).json({ success: false, message: 'غير مصرح لك بإغلاق هذه التذكرة' });
    }

    const result = await pool.query(
      `UPDATE app.support_tickets 
       SET status = 'closed', updated_at = NOW()
       WHERE id = $1 AND status != 'closed'
       RETURNING *`,
      [ticketId]
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

// ============================================
// ✅ الحصول على تذكرة محددة للمرشد (للوحة التحكم)
// ============================================
router.get('/guide/tickets', protect, async (req, res) => {
  try {
    const guideId = req.user.id;
    const isGuide = req.user.role === 'guide';
    
    if (!isGuide) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }
    
    const result = await pool.query(
      `SELECT t.*, u.full_name as user_name, u.email as user_email
       FROM app.support_tickets t
       LEFT JOIN app.users u ON t.user_id = u.id
       WHERE t.type = 'guide_chat' 
       AND t.metadata->>'guideId' = $1
       ORDER BY t.created_at DESC`,
      [guideId]
    );
    
    res.json({
      success: true,
      tickets: result.rows
    });
  } catch (error) {
    console.error('❌ Guide tickets error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ' });
  }
});

export default router;
