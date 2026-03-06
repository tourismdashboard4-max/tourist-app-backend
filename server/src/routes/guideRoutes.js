import express from 'express';

const router = express.Router();

// ✅ Test route - موجود مسبقاً
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: '✅ Guide routes are working',
    timestamp: new Date().toISOString()
  });
});

// ✅ NEW: Register guide - تسجيل مرشد جديد
router.post('/register', (req, res) => {
  console.log('📥 New guide registration received:', req.body);
  
  res.status(201).json({
    success: true,
    message: 'تم إرسال طلب التسجيل بنجاح',
    data: req.body
  });
});

// ✅ NEW: Login guide - تسجيل دخول مرشد
router.post('/login', (req, res) => {
  console.log('🔐 Guide login attempt:', req.body.email);
  
  res.json({
    success: true,
    message: 'تم تسجيل الدخول بنجاح',
    token: 'jwt-token-' + Date.now()
  });
});

export default router;