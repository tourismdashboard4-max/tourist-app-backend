import express from 'express';
import * as bookingController from '../controllers/booking.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireGuide } from '../middleware/role.middleware.js';
import { validate } from '../middleware/validation.middleware.js';
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

// ===================== مسارات الحجوزات =====================

router.post('/', authenticate, bookingValidation, validate, bookingController.createBooking);
router.get('/user/:userId', authenticate, bookingController.getUserBookings);
router.get('/guide/:guideId', authenticate, bookingController.getGuideBookings);
router.get('/:bookingId', authenticate, bookingController.getBookingById);
router.put('/:bookingId/confirm', authenticate, requireGuide, bookingController.confirmBooking);
router.put('/:bookingId/start', authenticate, requireGuide, bookingController.startBooking);
router.put('/:bookingId/complete', authenticate, requireGuide, bookingController.completeBooking);
router.put('/:bookingId/cancel', authenticate, bookingController.cancelBooking);
router.post('/:bookingId/rate', authenticate, ratingValidation, validate, bookingController.rateBooking);
router.get('/stats/:userId', authenticate, bookingController.getBookingStats);

export default router;