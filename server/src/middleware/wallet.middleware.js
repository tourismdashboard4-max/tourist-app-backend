const Wallet = require('../models/Wallet');
const { body, validationResult } = require('express-validator');

/**
 * التحقق من وجود المحفظة
 * @param {Object} req - الطلب
 * @param {Object} res - الرد
 * @param {Function} next - التالي
 */
const validateWalletExists = async (req, res, next) => {
  try {
    const userId = req.params.userId || req.body.userId || req.user.id;
    
    const wallet = await Wallet.findOne({ userId });
    
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'المحفظة غير موجودة'
      });
    }

    req.wallet = wallet;
    next();
  } catch (error) {
    console.error('Wallet validation error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في التحقق من المحفظة'
    });
  }
};

/**
 * التحقق من نشاط المحفظة
 * @param {Object} req - الطلب
 * @param {Object} res - الرد
 * @param {Function} next - التالي
 */
const validateWalletActive = (req, res, next) => {
  const wallet = req.wallet || res.locals.wallet;

  if (!wallet) {
    return res.status(404).json({
      success: false,
      message: 'المحفظة غير موجودة'
    });
  }

  if (wallet.status !== 'active') {
    return res.status(403).json({
      success: false,
      message: 'المحفظة غير نشطة حالياً'
    });
  }

  next();
};

/**
 * التحقق من صحة مبلغ الإيداع
 */
const validateDeposit = [
  body('amount')
    .notEmpty().withMessage('المبلغ مطلوب')
    .isFloat({ min: 10 }).withMessage('المبلغ يجب أن يكون 10 ريال على الأقل')
    .isFloat({ max: 100000 }).withMessage('المبلغ يجب أن لا يتجاوز 100,000 ريال'),
  
  body('paymentMethod')
    .notEmpty().withMessage('طريقة الدفع مطلوبة')
    .isIn(['CARD', 'BANK_TRANSFER', 'APPLE_PAY', 'STC_PAY']).withMessage('طريقة الدفع غير صحيحة'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    next();
  }
];

/**
 * التحقق من صحة طلب السحب
 */
const validateWithdraw = [
  body('amount')
    .notEmpty().withMessage('المبلغ مطلوب')
    .isFloat({ min: 100 }).withMessage('المبلغ يجب أن يكون 100 ريال على الأقل')
    .isFloat({ max: 50000 }).withMessage('المبلغ يجب أن لا يتجاوز 50,000 ريال'),
  
  body('bankAccountId')
    .notEmpty().withMessage('معرف الحساب البنكي مطلوب')
    .isMongoId().withMessage('معرف الحساب البنكي غير صحيح'),
  
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      // التحقق من كفاية الرصيد
      const wallet = await Wallet.findOne({ userId: req.user.id });
      
      if (!wallet) {
        return res.status(404).json({
          success: false,
          message: 'المحفظة غير موجودة'
        });
      }

      if (wallet.balance < req.body.amount) {
        return res.status(400).json({
          success: false,
          message: 'الرصيد غير كافٍ'
        });
      }

      // التحقق من الحدود اليومية
      const today = new Date();
      const lastWithdraw = wallet.lastWithdrawDate;

      if (lastWithdraw && lastWithdraw.toDateString() === today.toDateString()) {
        if (wallet.dailyWithdrawn + req.body.amount > wallet.dailyLimit) {
          return res.status(400).json({
            success: false,
            message: `تجاوزت الحد اليومي للسحب (الحد المتبقي: ${wallet.dailyLimit - wallet.dailyWithdrawn} ريال)`
          });
        }
      }

      next();
    } catch (error) {
      console.error('Withdraw validation error:', error);
      res.status(500).json({
        success: false,
        message: 'حدث خطأ في التحقق من طلب السحب'
      });
    }
  }
];

/**
 * التحقق من صحة الحساب البنكي
 */
const validateBankAccount = [
  body('bankName')
    .notEmpty().withMessage('اسم البنك مطلوب')
    .isLength({ min: 3, max: 50 }).withMessage('اسم البنك يجب أن يكون بين 3 و 50 حرف'),
  
  body('accountNumber')
    .notEmpty().withMessage('رقم الحساب مطلوب')
    .isLength({ min: 8, max: 20 }).withMessage('رقم الحساب غير صحيح'),
  
  body('iban')
    .notEmpty().withMessage('IBAN مطلوب')
    .matches(/^SA\d{22}$/).withMessage('IBAN غير صحيح (يجب أن يبدأ بـ SA ويتبعه 22 رقم)'),
  
  body('accountHolder')
    .notEmpty().withMessage('صاحب الحساب مطلوب')
    .isLength({ min: 3, max: 100 }).withMessage('اسم صاحب الحساب يجب أن يكون بين 3 و 100 حرف'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    next();
  }
];

/**
 * التحقق من صلاحية الوصول للمحفظة
 */
const checkWalletAccess = (req, res, next) => {
  const requestedUserId = req.params.userId || req.body.userId;
  
  if (req.user.type === 'admin' || req.user.id === requestedUserId) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'غير مصرح بالوصول إلى هذه المحفظة'
  });
};

module.exports = {
  validateWalletExists,
  validateWalletActive,
  validateDeposit,
  validateWithdraw,
  validateBankAccount,
  checkWalletAccess
};