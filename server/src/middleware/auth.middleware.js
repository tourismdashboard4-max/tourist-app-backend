// server/src/middleware/auth.middleware.js
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// التحقق من صحة التوكن
export const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'الرجاء تسجيل الدخول أولاً'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('❌ Auth error:', error);
    res.status(401).json({
      success: false,
      message: 'انتهت صلاحية الجلسة، الرجاء تسجيل الدخول مرة أخرى'
    });
  }
};

// التحقق من أن المستخدم مشرف
export const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'غير مصرح بالوصول، هذه الميزة للمشرفين فقط'
    });
  }
};

// التحقق من أن المستخدم مرشد
export const requireGuide = (req, res, next) => {
  if (req.user && (req.user.role === 'guide' || req.user.role === 'admin')) {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'غير مصرح بالوصول، هذه الميزة للمرشدين فقط'
    });
  }
};

// التحقق من أن المستخدم سائح
export const requireTourist = (req, res, next) => {
  if (req.user && req.user.role === 'tourist') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'غير مصرح بالوصول، هذه الميزة للسياح فقط'
    });
  }
};