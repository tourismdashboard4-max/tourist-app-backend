// server/src/routes/supportRoutes.js
import express from 'express';
import { pool } from '../config/database.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// ============================================
// ✅ الحصول على محادثات المستخدم
// ============================================
router.get('/conversations', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT c.*, 
             COUNT(m.id) as messages_count,
             MAX(m.created_at) as last_message,
             (SELECT COUNT(*) FROM app.support_messages WHERE conversation_id = c.id AND is_read = false AND is_from_user = false) as unread_count
      FROM app.support_conversations c
      LEFT JOIN app.support_messages m ON c.id = m.conversation_id
      WHERE c.user_id = $1
    `;
    const params = [userId];
    let paramIndex = 2;

    if (status) {
      query += ` AND c.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += `
      GROUP BY c.id
      ORDER BY c.updated_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const conversationsResult = await pool.query(query, params);

    res.json({
      success: true,
      conversations: conversationsResult.rows,
      pagination: { page: parseInt(page), limit: parseInt(limit) }
    });

  } catch (error) {
    console.error('❌ Get conversations error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ' });
  }
});

// ============================================
// ✅ الحصول على تفاصيل محادثة
// ============================================
router.get('/conversations/:conversationId', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;

    const conversationResult = await pool.query(
      `SELECT * FROM app.support_conversations 
       WHERE id = $1 AND user_id = $2`,
      [conversationId, userId]
    );

    if (conversationResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'المحادثة غير موجودة' });
    }

    const conversation = conversationResult.rows[0];

    const messagesResult = await pool.query(
      `SELECT m.*, u.full_name as sender_name, u.avatar as sender_avatar
       FROM app.support_messages m
       LEFT JOIN app.users u ON m.user_id = u.id
       WHERE m.conversation_id = $1
       ORDER BY m.created_at ASC`,
      [conversationId]
    );

    // تحديث حالة القراءة
    await pool.query(
      `UPDATE app.support_messages 
       SET is_read = true 
       WHERE conversation_id = $1 AND user_id != $2 AND is_read = false`,
      [conversationId, userId]
    );

    res.json({
      success: true,
      conversation,
      messages: messagesResult.rows
    });

  } catch (error) {
    console.error('❌ Get conversation error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ' });
  }
});

// ============================================
// ✅ إنشاء محادثة جديدة
// ============================================
router.post('/conversations', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { subject, message, priority = 'normal' } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ success: false, message: 'الموضوع والرسالة مطلوبان' });
    }

    const conversationResult = await pool.query(
      `INSERT INTO app.support_conversations (user_id, subject, priority, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING *`,
      [userId, subject, priority, 'open']
    );

    const conversation = conversationResult.rows[0];

    await pool.query(
      `INSERT INTO app.support_messages (conversation_id, user_id, message, is_from_user, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [conversation.id, userId, message, true]
    );

    res.json({
      success: true,
      conversation,
      message: 'تم إنشاء المحادثة بنجاح'
    });

  } catch (error) {
    console.error('❌ Create conversation error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ' });
  }
});

// ============================================
// ✅ إرسال رسالة
// ============================================
router.post('/conversations/:conversationId/messages', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: 'الرسالة مطلوبة' });
    }

    const conversationResult = await pool.query(
      `SELECT * FROM app.support_conversations 
       WHERE id = $1 AND user_id = $2 AND status != 'closed'`,
      [conversationId, userId]
    );

    if (conversationResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'المحادثة غير موجودة أو مغلقة' });
    }

    const messageResult = await pool.query(
      `INSERT INTO app.support_messages (conversation_id, user_id, message, is_from_user, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [conversationId, userId, message, true]
    );

    await pool.query(
      `UPDATE app.support_conversations 
       SET updated_at = NOW()
       WHERE id = $1`,
      [conversationId]
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
// ✅ إغلاق المحادثة
// ============================================
router.put('/conversations/:conversationId/close', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;

    const result = await pool.query(
      `UPDATE app.support_conversations 
       SET status = 'closed', updated_at = NOW()
       WHERE id = $1 AND user_id = $2 AND status != 'closed'
       RETURNING *`,
      [conversationId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'المحادثة غير موجودة أو مغلقة بالفعل' });
    }

    res.json({
      success: true,
      message: 'تم إغلاق المحادثة بنجاح'
    });

  } catch (error) {
    console.error('❌ Close conversation error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ' });
  }
});

// ============================================
// ✅ تقييم المحادثة
// ============================================
router.post('/conversations/:conversationId/rate', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;
    const { rating, feedback } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'التقييم يجب أن يكون بين 1 و 5' });
    }

    const result = await pool.query(
      `UPDATE app.support_conversations 
       SET rating = $1, feedback = $2, updated_at = NOW()
       WHERE id = $3 AND user_id = $4 AND status = 'closed'
       RETURNING *`,
      [rating, feedback || null, conversationId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'المحادثة غير موجودة أو غير مغلقة' });
    }

    res.json({
      success: true,
      message: 'شكراً لتقييمك!'
    });

  } catch (error) {
    console.error('❌ Rate conversation error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ' });
  }
});

export default router;
