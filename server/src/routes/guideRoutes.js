// server/src/routes/guideRoutes.js
import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';
import * as guideController from '../controllers/guideController.js';
import { validate } from '../middleware/validationMiddleware.js';
import { body } from 'express-validator';

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
