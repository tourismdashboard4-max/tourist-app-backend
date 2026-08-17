// server/src/routes/supportRoutes.js - النسخة المعدلة لدعم المعرفات المختلطة (UUID + رقمي) مع تحسين الصلاحيات والإشعارات ودعم الصور
// ✅ تمت إضافة مسار /read لتحديث حالة القراءة، وإصلاح مشكلة 500 عند إرسال الصور
// ✅ يتطلب وجود الأعمدة: type, image_url, read, read_at في جدول support_messages

import express from 'express';
import { pool } from '../../server.js';
import { protect } from '../middleware/authMiddleware.js';
import notificationService from '../services/notificationService.js';
import { io, onlineUsers } from '../../server.js';

const router = express.Router();

// ============================================
// ✅ دالة مساعدة لتحويل أي معرف إلى رقمي (old_id)
// ============================================
async function getUserIdNumber(userId) {
  if (!userId) return null;
  if (!isNaN(Number(userId))) return Number(userId);
  try {
    const result = await pool.query(
      `SELECT old_id FROM app.users WHERE id = $1`,
      [userId]
    );
    if (result.rows.length > 0 && result.rows[0].old_id) {
      return Number(result.rows[0].old_id);
    }
    const numeric = parseInt(userId);
    if (!isNaN(numeric)) return numeric;
    return null;
  } catch (error) {
    console.error('❌ Error getting user numeric ID:', error);
    return null;
  }
}

// ============================================
// ✅ الحصول على تذاكر المستخدم
// ============================================
router.get('/tickets', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, type } = req.query;

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
    res.status(500).json({ success: false, message: 'حدث خطأ', error: error.message });
  }
});

// ============================================
// ✅ إنشاء تذكرة جديدة
// ============================================
router.post('/tickets', protect, async (req, res) => {
  try {
    const { subject, message, priority = 'normal', type = 'general', user_id, metadata } = req.body;
    const userId = user_id || req.user.id;
    
    console.log('📝 [Support] Creating ticket for user_id:', userId);
    console.log('📝 [Support] Type:', type, 'Metadata:', metadata);

    if (!subject) {
      return res.status(400).json({ success: false, message: 'الموضوع مطلوب' });
    }

    // التأكد من وجود participants في metadata
    if (type === 'guide_chat' && metadata) {
      if (!metadata.participants) {
        const participants = [];
        if (metadata.guideId) participants.push(metadata.guideId);
        if (metadata.touristId) participants.push(metadata.touristId);
        if (metadata.created_by) participants.push(metadata.created_by);
        if (metadata.created_by_id) participants.push(metadata.created_by_id);
        if (userId && !participants.includes(userId)) participants.push(userId);
        metadata.participants = participants;
      }
      if (!metadata.guideId && metadata.participants) {
        const other = metadata.participants.find(p => p !== userId);
        if (other) metadata.guideId = other;
      }
    }

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
        `INSERT INTO app.support_messages (ticket_id, user_id, message, type, image_url, is_from_user, created_at)
         VALUES ($1, $2, $3, 'text', NULL, true, NOW())`,
        [ticket.id, userId, message]
      );
    }

    const userResult = await pool.query(
      `SELECT full_name, email FROM app.users WHERE id = $1`,
      [userId]
    );
    const userName = userResult.rows[0]?.full_name || userResult.rows[0]?.email || `مستخدم ${userId}`;
    
    // إشعار للمرشد
    if (type === 'guide_chat' && metadata?.guideId) {
      const guideNumericId = await getUserIdNumber(metadata.guideId);
      if (guideNumericId) {
        await notificationService.create(guideNumericId, {
          title: 'محادثة جديدة من مسافر',
          message: `${userName} بدأ محادثة معك: ${message?.substring(0, 100) || 'يريد التواصل معك'}`,
          type: 'guide_chat',
          priority: 'high',
          action_url: `/support?ticket=${ticket.id}`,
          data: JSON.stringify({ ticketId: ticket.id, userId, type: 'new_chat', guideId: metadata.guideId })
        });
        console.log(`✅ [Support] Notification sent to guide (numeric ID: ${guideNumericId})`);
      } else {
        console.warn(`⚠️ [Support] Could not convert guideId ${metadata.guideId} to numeric ID, skipping notification.`);
      }
    }
    
    // إشعارات للمسؤولين
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
// ✅ الحصول على رسائل التذكرة (مع تحسين الصلاحيات)
// ============================================
router.get('/tickets/:ticketId/messages', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { ticketId } = req.params;

    const ticketResult = await pool.query(
      `SELECT * FROM app.support_tickets WHERE id = $1`,
      [ticketId]
    );

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'التذكرة غير موجودة' });
    }

    const ticket = ticketResult.rows[0];
    const isAdmin = req.user.role === 'admin' || req.user.role === 'support';
    
    let isParticipant = false;
    if (ticket.metadata && ticket.metadata.participants) {
      isParticipant = ticket.metadata.participants.some(p => String(p) === String(userId));
    }
    if (!isParticipant) {
      const isOwner = ticket.user_id === userId;
      const isGuide = ticket.type === 'guide_chat' && ticket.metadata?.guideId === userId;
      isParticipant = isOwner || isGuide;
    }

    if (!isAdmin && !isParticipant) {
      console.warn(`⚠️ Access denied for user ${userId} to ticket ${ticketId}`);
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
// ✅ إرسال رسالة (مع دعم الصور)
// ============================================
router.post('/tickets/:ticketId/messages', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { ticketId } = req.params;
    const { message, type = 'text', image_url } = req.body;

    // السماح برسالة فارغة إذا كانت صورة
    if ((!message || !message.trim()) && type !== 'image') {
      return res.status(400).json({ success: false, message: 'الرسالة مطلوبة' });
    }

    console.log('📤 [Support] Send message - userId:', userId, 'ticketId:', ticketId, 'type:', type);

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
    const isGuide = ticket.type === 'guide_chat' && ticket.metadata?.guideId === userId;

    // التحقق من الصلاحيات
    let isParticipant = false;
    if (ticket.metadata && ticket.metadata.participants) {
      isParticipant = ticket.metadata.participants.some(p => String(p) === String(userId));
    }
    if (!isParticipant) {
      isParticipant = isOwner || isGuide;
    }

    if (!isAdmin && !isParticipant) {
      return res.status(403).json({ success: false, message: 'غير مصرح لك بإرسال رسائل لهذه التذكرة' });
    }

    if (ticket.status === 'closed') {
      return res.status(400).json({ success: false, message: 'التذكرة مغلقة لا يمكن إرسال رسائل' });
    }

    // إدراج الرسالة مع دعم الصور
    const messageResult = await pool.query(
      `INSERT INTO app.support_messages (ticket_id, user_id, message, type, image_url, is_from_user, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
      [ticketId, userId, message || '', type, image_url || null, !isAdmin && !isGuide]
    );

    await pool.query(
      `UPDATE app.support_tickets SET updated_at = NOW() WHERE id = $1`,
      [ticketId]
    );

    console.log('✅ [Support] Message sent:', { ticketId, userId, isFromUser: !isAdmin && !isGuide });

    const senderResult = await pool.query(
      `SELECT full_name, email FROM app.users WHERE id = $1`,
      [userId]
    );
    const senderName = senderResult.rows[0]?.full_name || senderResult.rows[0]?.email || `مستخدم ${userId}`;

    // ===== WebSocket =====
    const participants = new Set();
    participants.add(ticket.user_id);
    if (ticket.metadata?.guideId) participants.add(ticket.metadata.guideId);
    if (ticket.metadata?.touristId) participants.add(ticket.metadata.touristId);
    if (ticket.metadata?.created_by_id) participants.add(ticket.metadata.created_by_id);
    if (ticket.metadata?.participants && Array.isArray(ticket.metadata.participants)) {
      ticket.metadata.participants.forEach(p => participants.add(p));
    }
    const admins = await pool.query(`SELECT id FROM app.users WHERE role IN ('admin', 'support')`);
    admins.rows.forEach(admin => participants.add(admin.id));

    const displayMessage = type === 'image' ? '📷 صورة' : message;

    participants.forEach(participantId => {
      const participantStr = String(participantId);
      const socketId = onlineUsers.get(participantStr);
      if (socketId && io) {
        io.to(socketId).emit('new_message', {
          ticketId: ticket.id,
          message: displayMessage,
          type: type,
          imageUrl: image_url || null,
          senderId: userId,
          senderName: senderName,
          createdAt: messageResult.rows[0].created_at,
          messageId: messageResult.rows[0].id,
        });
        console.log(`📡 WebSocket new_message sent to participant ${participantStr}`);
      } else {
        console.log(`ℹ️ Participant ${participantStr} not online, will fetch via polling`);
      }
    });

    participants.forEach(participantId => {
      const participantStr = String(participantId);
      const socketId = onlineUsers.get(participantStr);
      if (socketId && io) {
        io.to(socketId).emit('update_last_message', {
          ticketId: ticket.id,
          lastMessage: displayMessage,
          lastMessageTime: messageResult.rows[0].created_at
        });
      }
    });

    // ===== إشعارات قاعدة البيانات =====
    if (ticket.type === 'guide_chat' && ticket.metadata?.guideId && userId !== ticket.metadata.guideId) {
      const guideNumericId = await getUserIdNumber(ticket.metadata.guideId);
      if (guideNumericId) {
        await notificationService.create(guideNumericId, {
          title: 'رسالة جديدة من مسافر',
          message: `${senderName}: ${displayMessage.substring(0, 100)}${displayMessage.length > 100 ? '...' : ''}`,
          type: 'guide_chat_message',
          priority: 'high',
          action_url: `/support?ticket=${ticketId}`,
          data: JSON.stringify({ ticketId, userId, message: displayMessage, type: 'new_message' })
        });
        console.log(`✅ [Support] Notification sent to guide (numeric ID: ${guideNumericId})`);
      }
    }
    
    if ((isGuide || isAdmin) && !isOwner) {
      await notificationService.create(ticket.user_id, {
        title: isGuide ? 'رد من المرشد' : 'رد على تذكرة الدعم',
        message: `${senderName}: ${displayMessage.substring(0, 100)}${displayMessage.length > 100 ? '...' : ''}`,
        type: isGuide ? 'guide_reply' : 'support_reply',
        priority: 'high',
        action_url: `/support?ticket=${ticketId}`,
        data: JSON.stringify({ ticketId, message: displayMessage, type: 'reply' })
      });
    }
    
    if (!isAdmin && !isGuide) {
      const adminsResult = await pool.query(`SELECT id FROM app.users WHERE role IN ('admin', 'support')`);
      for (const admin of adminsResult.rows) {
        await notificationService.create(admin.id, {
          title: ticket.type === 'guide_chat' ? 'رسالة جديدة في محادثة مرشد' : 'رسالة دعم جديدة',
          message: `رسالة جديدة من ${senderName}: ${displayMessage.substring(0, 50)}${displayMessage.length > 50 ? '...' : ''}`,
          type: 'support_message',
          priority: 'high',
          action_url: `/admin/support?ticket=${ticketId}`,
          data: JSON.stringify({ ticketId, userId, message: displayMessage, chatType: ticket.type })
        });
      }
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
// ✅ تحديث حالة قراءة التذكرة (تعليم الرسائل كمقروءة)
// ============================================
router.put('/tickets/:ticketId/read', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { ticketId } = req.params;

    // التحقق من أن المستخدم مشارك في التذكرة
    const ticketResult = await pool.query(
      `SELECT * FROM app.support_tickets WHERE id = $1`,
      [ticketId]
    );
    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'التذكرة غير موجودة' });
    }

    const ticket = ticketResult.rows[0];
    const isAdmin = req.user.role === 'admin' || req.user.role === 'support';
    let isParticipant = false;
    if (ticket.metadata?.participants) {
      isParticipant = ticket.metadata.participants.some(p => String(p) === String(userId));
    }
    if (!isParticipant) {
      const isOwner = ticket.user_id === userId;
      const isGuide = ticket.type === 'guide_chat' && ticket.metadata?.guideId === userId;
      isParticipant = isOwner || isGuide;
    }
    if (!isAdmin && !isParticipant) {
      return res.status(403).json({ success: false, message: 'غير مصرح لك بهذه العملية' });
    }

    // تحديث حالة قراءة الرسائل (تحديث عمود read إلى true لجميع رسائل التذكرة باستثناء رسائل المرسل)
    await pool.query(
      `UPDATE app.support_messages 
       SET read = true, read_at = NOW() 
       WHERE ticket_id = $1 AND user_id != $2`,
      [ticketId, userId]
    );

    // إرجاع عدد الرسائل التي تم تحديثها
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM app.support_messages 
       WHERE ticket_id = $1 AND user_id != $2 AND read = true`,
      [ticketId, userId]
    );

    res.json({
      success: true,
      message: 'تم تحديث حالة القراءة',
      updatedCount: parseInt(countResult.rows[0].count)
    });
  } catch (error) {
    console.error('❌ Error marking ticket as read:', error);
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

    const ticketResult = await pool.query(`SELECT * FROM app.support_tickets WHERE id = $1`, [ticketId]);
    if (ticketResult.rows.length === 0) return res.status(404).json({ success: false, message: 'التذكرة غير موجودة' });
    const ticket = ticketResult.rows[0];
    const isAdmin = req.user.role === 'admin' || req.user.role === 'support';
    const isOwner = ticket.user_id === userId;
    const isGuide = ticket.type === 'guide_chat' && ticket.metadata?.guideId === userId;
    if (!isOwner && !isAdmin && !isGuide) return res.status(403).json({ success: false, message: 'غير مصرح لك بإغلاق هذه التذكرة' });

    const result = await pool.query(`UPDATE app.support_tickets SET status = 'closed', updated_at = NOW() WHERE id = $1 AND status != 'closed' RETURNING *`, [ticketId]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'التذكرة غير موجودة أو مغلقة بالفعل' });
    res.json({ success: true, message: 'تم إغلاق التذكرة بنجاح' });
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
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ success: false, message: 'التقييم يجب أن يكون بين 1 و 5' });
    const result = await pool.query(`UPDATE app.support_tickets SET rating = $1, feedback = $2, updated_at = NOW() WHERE id = $3 AND user_id = $4 AND status = 'closed' RETURNING *`, [rating, feedback || null, ticketId, userId]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'التذكرة غير موجودة أو غير مغلقة' });
    res.json({ success: true, message: 'شكراً لتقييمك!' });
  } catch (error) {
    console.error('❌ Rate ticket error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ' });
  }
});

// ============================================
// ✅ تذاكر المسؤول
// ============================================
router.get('/admin/tickets', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'support') return res.status(403).json({ success: false, message: 'غير مصرح' });
    const result = await pool.query(`SELECT t.*, u.email, u.full_name as user_name FROM app.support_tickets t LEFT JOIN app.users u ON t.user_id = u.id ORDER BY t.created_at DESC`);
    res.json({ success: true, tickets: result.rows });
  } catch (error) {
    console.error('❌ Admin tickets error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ' });
  }
});

// ============================================
// ✅ تذاكر المرشد
// ============================================
router.get('/guide/tickets', protect, async (req, res) => {
  try {
    const guideId = req.user.id;
    const isGuide = req.user.role === 'guide';
    if (!isGuide) return res.status(403).json({ success: false, message: 'غير مصرح' });
    const result = await pool.query(`SELECT t.*, u.full_name as user_name, u.email as user_email FROM app.support_tickets t LEFT JOIN app.users u ON t.user_id = u.id WHERE t.type = 'guide_chat' AND t.metadata->>'guideId' = $1 ORDER BY t.created_at DESC`, [guideId]);
    res.json({ success: true, tickets: result.rows });
  } catch (error) {
    console.error('❌ Guide tickets error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ' });
  }
});

export default router;
