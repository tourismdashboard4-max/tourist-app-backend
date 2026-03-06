// server/src/middleware/validation.middleware.js
import { validationResult } from 'express-validator';

/**
 * التحقق من صحة البيانات بناءً على قواعد express-validator
 */
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (errors.isEmpty()) {
    return next();
  }

  const extractedErrors = [];
  errors.array().map(err => extractedErrors.push({ [err.path]: err.msg }));

  return res.status(400).json({
    success: false,
    message: 'خطأ في صحة البيانات',
    errors: extractedErrors
  });
};

/**
 * التحقق من صحة معرف MongoDB
 */
export const validateObjectId = (id) => {
  const isValid = /^[0-9a-fA-F]{24}$/.test(id);
  if (!isValid) {
    throw new Error('معرف غير صالح');
  }
  return isValid;
};

/**
 * التحقق من صحة رقم الهاتف السعودي
 */
export const validateSaudiPhone = (phone) => {
  const saudiPhoneRegex = /^(05|5)[0-9]{8}$|^\+9665[0-9]{8}$/;
  return saudiPhoneRegex.test(phone);
};

/**
 * التحقق من صحة البريد الإلكتروني
 */
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * التحقق من صحة كلمة المرور (8 أحرف على الأقل، حرف كبير، حرف صغير، رقم)
 */
export const validatePassword = (password) => {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;
  return passwordRegex.test(password);
};