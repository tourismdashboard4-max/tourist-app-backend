const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { authenticate } = require('../middleware/auth.middleware');

/**
 * @route   POST /api/payments/create-intent
 * @desc    إنشاء نية دفع
 * @access  Private
 */
router.post('/create-intent', authenticate, paymentController.createPaymentIntent);

/**
 * @route   POST /api/payments/confirm
 * @desc    تأكيد الدفع
 * @access  Private
 */
router.post('/confirm', authenticate, paymentController.confirmPayment);

/**
 * @route   POST /api/payments/webhook
 * @desc    Webhook لبوابة الدفع
 * @access  Public
 */
router.post('/webhook', express.raw({ type: 'application/json' }), paymentController.handleWebhook);

/**
 * @route   GET /api/payments/methods
 * @desc    الحصول على طرق الدفع المتاحة
 * @access  Public
 */
router.get('/methods', paymentController.getPaymentMethods);

/**
 * @route   POST /api/payments/refund
 * @desc    استرداد مبلغ
 * @access  Private (Admin)
 */
router.post('/refund', authenticate, paymentController.processRefund);

module.exports = router;