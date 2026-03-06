// server/src/middleware/errorHandler.js
// ============================================
// 404 Not Found Handler
// ============================================
export const notFound = (req, res, next) => {
  const error = new Error(`❌ Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// ============================================
// Global Error Handler
// ============================================
export const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  res.status(statusCode).json({
    success: false,
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack,
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
};

// ============================================
// Mongoose Error Handler
// ============================================
export const mongooseErrorHandler = (err, req, res, next) => {
  // Handle duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    let message = '';

    switch (field) {
      case 'civilId':
        message = 'رقم الهوية مستخدم بالفعل';
        break;
      case 'licenseNumber':
        message = 'رقم الرخصة مستخدم بالفعل';
        break;
      case 'email':
        message = 'البريد الإلكتروني مستخدم بالفعل';
        break;
      default:
        message = 'بيانات مكررة';
    }

    return res.status(400).json({
      success: false,
      message,
      field
    });
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message
    }));

    return res.status(400).json({
      success: false,
      message: 'خطأ في صحة البيانات',
      errors
    });
  }

  // Handle cast errors (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'معرف غير صالح'
    });
  }

  next(err);
};