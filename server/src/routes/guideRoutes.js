// server/src/routes/guideRoutes.js
import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';
import * as guideController from '../controllers/guideController.js';
import { validate } from '../middleware/validationMiddleware.js';
import { body } from 'express-validator';
import { pool } from '../../server.js';

const router = express.Router();

// ============================================
// ✅ قواعد التحقق المبسطة جداً (للتجربة فقط)
// ============================================
const upgradeValidation = [
  body('fullName').notEmpty().withMessage('الاسم الكامل مطلوب'),
  body('civilId').notEmpty().withMessage('رقم الهوية مطلوب'),
  body('licenseNumber').notEmpty().withMessage('رقم الرخصة مطلوب'),
  body('phone').notEmpty().withMessage('رقم الجوال مطلوب'),
  body('experience').optional().isNumeric().withMessage('سنوات الخبرة يجب أن تكون رقماً')
];

// ============================================
// ✅ جلب جميع المرشدين المعتمدين (للمستخدمين) - نسخة مبسطة
// ============================================
router.get('/', async (req, res) => {
  try {
    console.log('📥 Fetching approved guides...');
    
    // ✅ استعلام مبسط - فقط الأعمدة الموجودة بالتأكيد
    const result = await pool.query(
      `SELECT id, full_name, email, phone, specialties, experience, bio, created_at
       FROM app.users 
       WHERE role = 'guide' AND guide_status = 'approved'
       ORDER BY created_at DESC`
    );
    
    console.log(`✅ Found ${result.rows.length} approved guides`);
    
    // تنسيق البيانات لإضافة حقول افتراضية للتخصصات إذا كانت فارغة
    const formattedGuides = result.rows.map(guide => ({
      ...guide,
      specialties: guide.specialties || [],
      rating: 4.5, // قيمة افتراضية
      reviews_count: 0,
      programs_count: 0,
      distance: (Math.random() * 10 + 1).toFixed(1) // قيمة افتراضية للاختبار
    }));
    
    res.json({
      success: true,
      guides: formattedGuides
    });
  } catch (error) {
    console.error('❌ Error fetching guides:', error);
    console.error('❌ Error details:', error.message);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب المرشدين',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ============================================
// ✅ جلب تفاصيل مرشد محدد - نسخة مبسطة
// ============================================
router.get('/:guideId', async (req, res) => {
  try {
    const { guideId } = req.params;
    console.log(`📥 Fetching guide details for ID: ${guideId}`);
    
    const result = await pool.query(
      `SELECT id, full_name, email, phone, specialties, experience, bio, created_at
       FROM app.users 
       WHERE id = $1 AND role = 'guide' AND guide_status = 'approved'`,
      [guideId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'المرشد غير موجود'
      });
    }
    
    const guide = result.rows[0];
    
    res.json({
      success: true,
      guide: {
        ...guide,
        specialties: guide.specialties || [],
        rating: 4.5,
        reviews_count: 0,
        programs_count: 0
      }
    });
  } catch (error) {
    console.error('❌ Error fetching guide:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب بيانات المرشد'
    });
  }
});

// ============================================
// ✅ مسار الترقية
// ============================================
router.post(
  '/upgrade',
  protect,
  upload.fields([
    { name: 'licenseDocument', maxCount: 1 },
    { name: 'idDocument', maxCount: 1 }
  ]),
  upgradeValidation,
  validate,
  guideController.requestUpgrade
);

// ============================================
// ✅ مسار تسجيل الدخول (بدون تحقق معقد)
// ============================================
router.post('/login', guideController.loginGuide);

// ============================================
// ✅ باقي المسارات (مبسطة)
// ============================================
router.get('/profile', protect, guideController.getGuideProfile);
router.put('/profile', protect, guideController.updateGuideProfile);
router.post('/change-password', protect, guideController.changePassword);

// مسارات المشرف
router.get('/pending-registrations', protect, authorize('admin'), guideController.getPendingRegistrations);
router.put('/approve/:registrationId', protect, authorize('admin'), guideController.approveGuideRegistration);
router.put('/reject/:registrationId', protect, authorize('admin'), guideController.rejectGuideRegistration);

// مسار الاختبار
router.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: '✅ Guide routes are working with PostgreSQL',
    timestamp: new Date().toISOString()
  });
});

export default router;
