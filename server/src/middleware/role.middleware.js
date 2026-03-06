// server/src/middleware/role.middleware.js

/**
 * التحقق من أن المستخدم مرشد
 */
export const requireGuide = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'الرجاء تسجيل الدخول أولاً'
    });
  }

  if (req.user.role === 'guide' || req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'غير مصرح بالوصول، هذه الميزة للمرشدين فقط'
    });
  }
};

/**
 * التحقق من أن المستخدم مشرف
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'الرجاء تسجيل الدخول أولاً'
    });
  }

  if (req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'غير مصرح بالوصول، هذه الميزة للمشرفين فقط'
    });
  }
};

/**
 * التحقق من أن المستخدم سائح
 */
export const requireTourist = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'الرجاء تسجيل الدخول أولاً'
    });
  }

  if (req.user.role === 'tourist' || req.user.role === 'user') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'غير مصرح بالوصول، هذه الميزة للسياح فقط'
    });
  }
};

/**
 * التحقق من أن المستخدم هو صاحب الحساب أو مشرف
 */
export const requireOwnerOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'الرجاء تسجيل الدخول أولاً'
    });
  }

  const targetUserId = req.params.userId || req.body.userId;
  
  if (req.user.role === 'admin' || req.user.id === targetUserId) {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'غير مصرح بالوصول إلى هذا المورد'
    });
  }
};