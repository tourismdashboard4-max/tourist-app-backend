import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// التأكد من وجود مجلدات التحميل
const uploadDir = path.join(__dirname, '../../uploads');
const licensesDir = path.join(uploadDir, 'licenses');
const idsDir = path.join(uploadDir, 'ids');

// إنشاء المجلدات إذا لم تكن موجودة
[uploadDir, licensesDir, idsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Created directory: ${dir}`);
  }
});

// تكوين multer للملفات
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === 'licenseDocument') {
      cb(null, licensesDir);
    } else if (file.fieldname === 'idDocument') {
      cb(null, idsDir);
    } else {
      cb(null, uploadDir);
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('الملفات المسموحة: PDF, JPG, JPEG, PNG فقط'));
    }
  }
});

// ==================== Test Routes ====================

router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: '✅ Guide routes are working',
    timestamp: new Date().toISOString(),
    endpoints: {
      upgrade: 'POST /api/guides/upgrade',
      status: 'GET /api/guides/upgrade-status/:userId',
      register: 'POST /api/guides/register',
      login: 'POST /api/guides/login'
    }
  });
});

// ==================== Guide Upgrade Routes ====================

router.post('/upgrade', 
  upload.fields([
    { name: 'licenseDocument', maxCount: 1 },
    { name: 'idDocument', maxCount: 1 }
  ]),
  async (req, res) => {
    console.log('📥 New guide upgrade request received');
    console.log('📦 Body:', req.body);
    console.log('📎 Files:', req.files ? Object.keys(req.files) : 'No files');
    
    try {
      const {
        userId,
        email,
        fullName,
        civilId,
        licenseNumber,
        experience,
        specialties,
        bio,
        phone
      } = req.body;

      const requiredFields = [
        { field: 'userId', value: userId, name: 'معرف المستخدم' },
        { field: 'civilId', value: civilId, name: 'رقم الهوية' },
        { field: 'licenseNumber', value: licenseNumber, name: 'رقم الرخصة' },
        { field: 'experience', value: experience, name: 'سنوات الخبرة' },
        { field: 'specialties', value: specialties, name: 'التخصصات' },
        { field: 'phone', value: phone, name: 'رقم الجوال' }
      ];

      const missingFields = requiredFields.filter(f => !f.value);
      
      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: `الحقول التالية مطلوبة: ${missingFields.map(f => f.name).join(', ')}`
        });
      }

      if (!req.files || !req.files['licenseDocument'] || !req.files['idDocument']) {
        return res.status(400).json({
          success: false,
          message: 'الرجاء رفع جميع الوثائق المطلوبة (وثيقة مزاولة المهنة وصورة البطاقة)'
        });
      }

      const requestId = `REQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const licenseFile = req.files['licenseDocument'][0];
      const idFile = req.files['idDocument'][0];

      console.log('✅ Upgrade request processed successfully:', {
        requestId,
        userId,
        civilId,
        licenseNumber,
        experience,
        phone
      });

      res.status(201).json({
        success: true,
        message: 'تم إرسال طلب الترقية بنجاح',
        requestId: requestId,
        data: {
          requestId,
          status: 'pending',
          receivedAt: new Date().toISOString(),
          estimatedTime: '24 ساعة',
          files: {
            license: licenseFile.filename,
            id: idFile.filename
          }
        }
      });

    } catch (error) {
      console.error('❌ Error in upgrade request:', error);
      res.status(500).json({
        success: false,
        message: 'حدث خطأ في السيرفر',
        error: error.message
      });
    }
  }
);

router.get('/upgrade-status/:userId', async (req, res) => {
  const { userId } = req.params;
  
  console.log(`📥 Getting upgrade status for user: ${userId}`);
  
  try {
    const mockRequest = {
      userId,
      status: 'pending',
      requestId: `REQ-${Date.now()}`,
      createdAt: new Date().toISOString(),
      estimatedTime: '24 ساعة',
      notes: 'طلبك قيد المراجعة من قبل الإدارة'
    };

    res.json({
      success: true,
      data: mockRequest
    });

  } catch (error) {
    console.error('❌ Error getting upgrade status:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب حالة الطلب'
    });
  }
});

// ==================== Guide Management Routes ====================

router.post('/register', async (req, res) => {
  console.log('📥 New guide registration received:', req.body);
  
  try {
    const { userId, fullName, email } = req.body;

    if (!userId || !fullName || !email) {
      return res.status(400).json({
        success: false,
        message: 'بيانات المستخدم مطلوبة'
      });
    }

    console.log('✅ Guide registered successfully:', { userId, fullName, email });

    res.status(201).json({
      success: true,
      message: 'تم تسجيل المرشد بنجاح',
      data: {
        userId,
        isGuide: true,
        role: 'guide',
        registeredAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error in guide registration:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في تسجيل المرشد'
    });
  }
});

router.post('/login', async (req, res) => {
  console.log('🔐 Guide login attempt:', req.body.email);
  
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني وكلمة المرور مطلوبان'
      });
    }

    res.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      token: 'jwt-token-' + Date.now(),
      data: {
        id: '123456',
        email,
        name: 'مرشد سياحي',
        isGuide: true
      }
    });

  } catch (error) {
    console.error('❌ Error in guide login:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في تسجيل الدخول'
    });
  }
});

router.get('/profile/:guideId', async (req, res) => {
  const { guideId } = req.params;
  
  try {
    res.json({
      success: true,
      data: {
        id: guideId,
        name: 'مرشد سياحي',
        specialties: ['تاريخ', 'تراث', 'مغامرات'],
        experience: 5,
        rating: 4.8,
        reviews: 124,
        bio: 'مرشد سياحي معتمد بخبرة 5 سنوات'
      }
    });

  } catch (error) {
    console.error('❌ Error getting guide profile:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب بيانات المرشد'
    });
  }
});

export default router;
