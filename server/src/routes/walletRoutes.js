// server/src/routes/walletRoutes.js
import express from 'express';
import { authenticate, requireAdmin, requireGuide } from '../middleware/auth.middleware.js';
import * as walletController from '../controllers/wallet.controller.js';
import { body } from 'express-validator';
import { validate } from '../middleware/validation.middleware.js';

const router = express.Router();

// ===================== Route عام للاختبار (بدون مصادقة) =====================
/**
 * @route   GET /api/wallet/public/:userId
 * @desc    الحصول على بيانات المحفظة (عام - للاختبار)
 * @access  Public
 */
router.get('/public/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`📥 Public fetch wallet for user: ${userId}`);
    
    const { pool } = await import('../config/database.js');
    
    const result = await pool.query(
      'SELECT * FROM app.wallets WHERE user_id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Wallet not found' 
      });
    }
    
    res.json({ 
      success: true, 
      wallet: result.rows[0] 
    });
  } catch (error) {
    console.error('❌ Error fetching wallet:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// قواعد التحقق
const depositValidation = [
  body('amount').isFloat({ min: 10 }).withMessage('المبلغ يجب أن يكون 10 ريال على الأقل'),
  body('paymentMethod').isIn(['CARD', 'BANK_TRANSFER', 'APPLE_PAY', 'STC_PAY']).withMessage('طريقة الدفع غير صحيحة')
];

const withdrawValidation = [
  body('amount').isFloat({ min: 100 }).withMessage('المبلغ يجب أن يكون 100 ريال على الأقل'),
  body('bankAccountId').notEmpty().withMessage('معرف الحساب البنكي مطلوب')
];

const bankAccountValidation = [
  body('bankName').notEmpty().withMessage('اسم البنك مطلوب'),
  body('accountNumber').notEmpty().withMessage('رقم الحساب مطلوب'),
  body('iban').notEmpty().withMessage('IBAN مطلوب'),
  body('accountHolder').notEmpty().withMessage('صاحب الحساب مطلوب')
];

// جميع مسارات المحفظة تتطلب مصادقة
router.use(authenticate);

// ===================== مسارات المحفظة =====================

/**
 * @route   GET /api/wallet/:userId/balance
 * @desc    الحصول على رصيد المحفظة
 * @access  Private
 */
router.get('/:userId/balance', walletController.getBalance);

/**
 * @route   GET /api/wallet/:userId/transactions
 * @desc    الحصول على سجل المعاملات
 * @access  Private
 */
router.get('/:userId/transactions', walletController.getTransactions);

/**
 * @route   POST /api/wallet/deposit
 * @desc    إيداع في المحفظة
 * @access  Private
 */
router.post('/deposit', depositValidation, validate, walletController.deposit);

/**
 * @route   POST /api/wallet/withdraw-request
 * @desc    طلب سحب (للمرشد فقط)
 * @access  Private (Guide)
 */
router.post('/withdraw-request', requireGuide, withdrawValidation, validate, walletController.requestWithdraw);

/**
 * @route   PUT /api/wallet/withdraw-request/:requestId
 * @desc    معالجة طلب سحب (للمشرف فقط)
 * @access  Private (Admin)
 */
router.put('/withdraw-request/:requestId', requireAdmin, walletController.processWithdrawRequest);

/**
 * @route   GET /api/wallet/withdraw-requests
 * @desc    الحصول على طلبات السحب (للمشرف)
 * @access  Private (Admin)
 */
router.get('/withdraw-requests', requireAdmin, walletController.getWithdrawRequests);

// ===================== مسارات الحسابات البنكية =====================

/**
 * @route   POST /api/wallet/bank-account
 * @desc    إضافة حساب بنكي
 * @access  Private
 */
router.post('/bank-account', bankAccountValidation, validate, walletController.addBankAccount);

/**
 * @route   GET /api/wallet/:userId/bank-accounts
 * @desc    الحصول على الحسابات البنكية
 * @access  Private
 */
router.get('/:userId/bank-accounts', walletController.getBankAccounts);

/**
 * @route   DELETE /api/wallet/bank-account/:accountId
 * @desc    حذف حساب بنكي
 * @access  Private
 */
router.delete('/bank-account/:accountId', walletController.deleteBankAccount);

/**
 * @route   PUT /api/wallet/bank-account/:accountId/default
 * @desc    تعيين حساب بنكي افتراضي
 * @access  Private
 */
router.put('/bank-account/:accountId/default', walletController.setDefaultBankAccount);

export default router;