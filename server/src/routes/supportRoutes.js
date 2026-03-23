// server/src/middleware/auth.js
import jwt from 'jsonwebtoken';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'غير مصرح بالدخول. يرجى تسجيل الدخول'
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('❌ Auth error:', error.message);
    return res.status(401).json({
      success: false,
      message: 'غير مصرح بالدخول. يرجى تسجيل الدخول'
    });
  }
};
