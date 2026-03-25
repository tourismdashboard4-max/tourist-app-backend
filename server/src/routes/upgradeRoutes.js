// server/src/routes/upgradeRoutes.js
import express from 'express';
import { pool } from '../../server.js';
import { protect } from '../middleware/authMiddleware.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// ✅ Corrected multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads/documents';
    // Create directory if it doesn't exist
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    // ✅ Fixed: Pass the directory path, not false
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // ✅ Fixed: Proper filename generation
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only images and PDF files are allowed'));
  }
});

// ============================================
// ✅ الحصول على طلبات الترقية (للمسؤول)
// ============================================
router.get('/upgrade-requests', protect, async (req, res) => {
  try {
    // التحقق من صلاحيات المسؤول
    if (req.user.role !== 'admin' && req.user.role !== 'support') {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }
    
    const result = await pool.query(
      `SELECT r.*, u.email, u.full_name, u.phone, u.license_number, 
              u.civil_id, u.specialties, u.experience, u.license_document, 
              u.id_document, u.bio
       FROM app.upgrade_requests r
       LEFT JOIN app.users u ON r.user_id = u.id
       ORDER BY r.created_at DESC`
    );
    
    res.json({
      success: true,
      requests: result.rows
    });
    
  } catch (error) {
    console.error('❌ Get upgrade requests error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ' });
  }
});

// ============================================
// ✅ إنشاء طلب ترقية جديد
// ============================================
router.post('/upgrade-requests', protect, upload.fields([
  { name: 'licenseDocument', maxCount: 1 },
  { name: 'idDocument', maxCount: 1 }
]), async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      fullName, civilId, licenseNumber, experience, 
      specialties, bio, phone 
    } = req.body;
    
    // التحقق من وجود طلب سابق
    const existingRequest = await pool.query(
      `SELECT * FROM app.upgrade_requests 
       WHERE user_id = $1 AND status = 'pending'`,
      [userId]
    );
    
    if (existingRequest.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'لديك طلب ترقية قيد المراجعة بالفعل' 
      });
    }
    
    // حفظ المستندات
    const licenseDocument = req.files?.licenseDocument?.[0]?.filename || null;
    const idDocument = req.files?.idDocument?.[0]?.filename || null;
    
    // إنشاء طلب الترقية
    const result = await pool.query(
      `INSERT INTO app.upgrade_requests 
       (user_id, status, created_at, updated_at)
       VALUES ($1, 'pending', NOW(), NOW())
       RETURNING *`,
      [userId]
    );
    
    // تحديث معلومات المستخدم
    await pool.query(
      `UPDATE app.users 
       SET full_name = COALESCE($1, full_name),
           phone = COALESCE($2, phone),
           license_number = COALESCE($3, license_number),
           civil_id = COALESCE($4, civil_id),
           specialties = COALESCE($5, specialties),
           experience = COALESCE($6, experience),
           license_document = COALESCE($7, license_document),
           id_document = COALESCE($8, id_document),
           guide_status = 'pending'
       WHERE id = $9`,
      [fullName, phone, licenseNumber, civilId, specialties, 
       experience, licenseDocument, idDocument, userId]
    );
    
    // إرسال إشعار للمسؤولين
    const adminsResult = await pool.query(
      `SELECT id FROM app.users WHERE role IN ('admin', 'support')`
    );
    
    for (const admin of adminsResult.rows) {
      await pool.query(
        `INSERT INTO app.notifications 
         (user_id, title, message, type, is_read, created_at, action_url, data)
         VALUES ($1, $2, $3, $4, false, NOW(), $5, $6)`,
        [
          admin.id,
          'طلب ترقية جديد',
          `${fullName || `مستخدم ${userId}`} تقدم بطلب ترقية إلى مرشد سياحي`,
          'upgrade_request',
          '/admin-upgrade-requests',
          JSON.stringify({ userId, requestId: result.rows[0].id })
        ]
      );
    }
    
    res.json({
      success: true,
      message: 'تم إرسال طلب الترقية بنجاح',
      request: result.rows[0]
    });
    
  } catch (error) {
    console.error('❌ Create upgrade request error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ' });
  }
});

// ============================================
// ✅ الموافقة على طلب الترقية
// ============================================
router.post('/upgrade-requests/:requestId/approve', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'support') {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }
    
    const { requestId } = req.params;
    const { notes } = req.body;
    
    // جلب تفاصيل الطلب
    const requestResult = await pool.query(
      `SELECT * FROM app.upgrade_requests WHERE id = $1`,
      [requestId]
    );
    
    if (requestResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
    }
    
    const request = requestResult.rows[0];
    const userId = request.user_id;
    
    // تحديث حالة الطلب
    await pool.query(
      `UPDATE app.upgrade_requests 
       SET status = 'approved', approved_at = NOW(), admin_notes = $1, updated_at = NOW()
       WHERE id = $2`,
      [notes, requestId]
    );
    
    // تحديث دور المستخدم إلى مرشد
    await pool.query(
      `UPDATE app.users 
       SET role = 'guide', guide_status = 'approved', updated_at = NOW()
       WHERE id = $1`,
      [userId]
    );
    
    // إرسال إشعار للمستخدم
    await pool.query(
      `INSERT INTO app.notifications 
       (user_id, title, message, type, is_read, created_at, data)
       VALUES ($1, $2, $3, $4, false, NOW(), $5)`,
      [
        userId,
        'تمت الموافقة على طلب الترقية',
        'تهانينا! تمت الموافقة على طلب ترقيتك إلى مرشد سياحي',
        'upgrade_approved',
        JSON.stringify({ requestId, userId })
      ]
    );
    
    res.json({
      success: true,
      message: 'تمت الموافقة على طلب الترقية'
    });
    
  } catch (error) {
    console.error('❌ Approve upgrade request error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ' });
  }
});

// ============================================
// ✅ رفض طلب الترقية
// ============================================
router.post('/upgrade-requests/:requestId/reject', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'support') {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }
    
    const { requestId } = req.params;
    const { reason } = req.body;
    
    // جلب تفاصيل الطلب
    const requestResult = await pool.query(
      `SELECT * FROM app.upgrade_requests WHERE id = $1`,
      [requestId]
    );
    
    if (requestResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
    }
    
    const request = requestResult.rows[0];
    const userId = request.user_id;
    
    // تحديث حالة الطلب
    await pool.query(
      `UPDATE app.upgrade_requests 
       SET status = 'rejected', rejected_at = NOW(), admin_notes = $1, updated_at = NOW()
       WHERE id = $2`,
      [reason, requestId]
    );
    
    // تحديث حالة المستخدم
    await pool.query(
      `UPDATE app.users 
       SET guide_status = 'rejected', updated_at = NOW()
       WHERE id = $1`,
      [userId]
    );
    
    // إرسال إشعار للمستخدم
    await pool.query(
      `INSERT INTO app.notifications 
       (user_id, title, message, type, is_read, created_at, data)
       VALUES ($1, $2, $3, $4, false, NOW(), $5)`,
      [
        userId,
        'تم رفض طلب الترقية',
        `عذراً، تم رفض طلب ترقيتك. السبب: ${reason || 'غير محدد'}`,
        'upgrade_rejected',
        JSON.stringify({ requestId, userId, reason })
      ]
    );
    
    res.json({
      success: true,
      message: 'تم رفض طلب الترقية'
    });
    
  } catch (error) {
    console.error('❌ Reject upgrade request error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ' });
  }
});

// ============================================
// ✅ الحصول على حالة طلب الترقية للمستخدم الحالي
// ============================================
router.get('/upgrade-requests/my-status', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await pool.query(
      `SELECT * FROM app.upgrade_requests 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [userId]
    );
    
    res.json({
      success: true,
      request: result.rows[0] || null
    });
    
  } catch (error) {
    console.error('❌ Get upgrade status error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ' });
  }
});

export default router;
