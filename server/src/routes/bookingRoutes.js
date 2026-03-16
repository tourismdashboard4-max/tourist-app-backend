// server/src/routes/bookingRoutes.js
import express from 'express';
import * as bookingController from '../controllers/booking.controller.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validationMiddleware.js'; // ✅ تم التعديل هنا
import { body } from 'express-validator';

const router = express.Router();

// قواعد التحقق
const bookingValidation = [
  body('guideId').notEmpty().withMessage('معرف المرشد مطلوب'),
  body('programId').notEmpty().withMessage('معرف البرنامج مطلوب'),
  body('guidePrice').isFloat({ min: 25 }).withMessage('سعر البرنامج يجب أن يكون 25 ريال على الأقل'),
  body('totalPrice').isFloat({ min: 25 }).withMessage('السعر الإجمالي يجب أن يكون 25 ريال على الأقل'),
  body('paymentMethod').isIn(['WALLET', 'CASH', 'CARD']).withMessage('طريقة الدفع غير صحيحة'),
  body('bookingDate').isISO8601().withMessage('تاريخ الحجز غير صحيح')
];

const ratingValidation = [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('التقييم يجب أن يكون بين 1 و 5')
];

// جميع مسارات الحجوزات تتطلب مصادقة
router.use(protect);

// ===================== مسارات الحجوزات =====================

/**
 * @route   POST /api/bookings
 * @desc    إنشاء حجز جديد
 * @access  Private
 */
router.post('/', bookingValidation, validate, bookingController.createBooking);

/**
 * @route   GET /api/bookings/user/:userId
 * @desc    الحصول على حجوزات مستخدم
 * @access  Private
 */
router.get('/user/:userId', bookingController.getUserBookings);

/**
 * @route   GET /api/bookings/guide/:guideId
 * @desc    الحصول على حجوزات مرشد
 * @access  Private
 */
router.get('/guide/:guideId', bookingController.getGuideBookings);

/**
 * @route   GET /api/bookings/:bookingId
 * @desc    الحصول على حجز محدد
 * @access  Private
 */
router.get('/:bookingId', bookingController.getBookingById);

/**
 * @route   PUT /api/bookings/:bookingId/confirm
 * @desc    تأكيد حجز (للمرشد فقط)
 * @access  Private (Guide)
 */
router.put('/:bookingId/confirm', authorize('guide'), bookingController.confirmBooking);

/**
 * @route   PUT /api/bookings/:bookingId/start
 * @desc    بدء حجز (للمرشد فقط)
 * @access  Private (Guide)
 */
router.put('/:bookingId/start', authorize('guide'), bookingController.startBooking);

/**
 * @route   PUT /api/bookings/:bookingId/complete
 * @desc    إكمال حجز (للمرشد فقط)
 * @access  Private (Guide)
 */
router.put('/:bookingId/complete', authorize('guide'), bookingController.completeBooking);

/**
 * @route   PUT /api/bookings/:bookingId/cancel
 * @desc    إلغاء حجز
 * @access  Private
 */
router.put('/:bookingId/cancel', bookingController.cancelBooking);

/**
 * @route   POST /api/bookings/:bookingId/rate
 * @desc    تقييم حجز
 * @access  Private
 */
router.post('/:bookingId/rate', ratingValidation, validate, bookingController.rateBooking);

/**
 * @route   GET /api/bookings/stats/:userId
 * @desc    الحصول على إحصائيات الحجوزات
 * @access  Private
 */
router.get('/stats/:userId', bookingController.getBookingStats);

export default router;
