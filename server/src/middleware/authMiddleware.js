// server/src/middleware/authMiddleware.js
import jwt from 'jsonwebtoken';
import { pool } from '../config/database.js';

/**
 * التحقق من صحة التوكن وحماية المسارات (لـ PostgreSQL)
 */
export const protect = async (req, res, next) => {
  try {
    let token;

    // التحقق من وجود التوكن في الهيدر
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'غير مصرح بالدخول. يرجى تسجيل الدخول'
      });
    }

    // التحقق من صحة التوكن
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    
    // جلب بيانات المستخدم من PostgreSQL
    const userResult = await pool.query(
      `SELECT id, email, full_name, role, avatar, phone, created_at 
       FROM app.users 
       WHERE id = $1`,
      [decoded.id]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

    // إضافة المستخدم للـ request
    req.user = userResult.rows[0];
    next();
    
  } catch (error) {
    console.error('❌ Auth middleware error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'غير مصرح بالدخول. توكن غير صالح'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'انتهت صلاحية التوكن. يرجى تسجيل الدخول مرة أخرى'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
};

/**
 * التحقق من صلاحيات الأدوار
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'غير مصرح بالدخول'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالدخول - صلاحيات غير كافية'
      });
    }

    next();
  };
};

/**
 * التحقق من وجود المستخدم (اختياري - للمسارات العامة)
 */
export const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
      
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
        const userResult = await pool.query(
          'SELECT id, email, full_name, role FROM app.users WHERE id = $1',
          [decoded.id]
        );
        
        if (userResult.rows.length > 0) {
          req.user = userResult.rows[0];
        }
      }
    }
    
    next();
  } catch (error) {
    // إذا فشل التحقق، نكمل بدون مستخدم
    next();
  }
};

/**
 * التحقق من صلاحية المستخدم (لنفسه فقط)
 */
export const isSelf = async (req, res, next) => {
  try {
    const userId = req.params.userId || req.params.id;
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'غير مصرح بالدخول'
      });
    }

    // تحويل إلى رقم للمقارنة
    if (parseInt(req.user.id) !== parseInt(userId) && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالدخول - يمكنك الوصول لبياناتك فقط'
      });
    }

    next();
  } catch (error) {
    console.error('❌ isSelf middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
};

// ✅ تصدير جميع الدوال
export default {
  protect,
  authorize,
  optionalAuth,
  isSelf
};
