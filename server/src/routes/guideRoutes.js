// server/routes/guides.js
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

/**
 * @route   GET /api/guides/test
 * @desc    اختبار الاتصال بالراوت
 * @access  Public
 */
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

/**
 * @route   POST /api/guides/upgrade
 * @desc    طلب ترقية إلى مرشد سياحي (مع رفع الملفات)
 * @access  Private (مستخدم عادي)
 */
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

      // التحقق من البيانات المطلوبة
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

      // التحقق من وجود الملفات
      if (!req.files || !req.files['licenseDocument'] || !req.files['idDocument']) {
        return res.status(400).json({
          success: false,
          message: 'الرجاء رفع جميع الوثائق المطلوبة (وثيقة مزاولة المهنة وصورة البطاقة)'
        });
      }

      // توليد رقم طلب فريد
      const requestId = `REQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      // معلومات الملفات المرفوعة
      const licenseFile = req.files['licenseDocument'][0];
      const idFile = req.files['idDocument'][0];

      // هنا يمكن حفظ البيانات في قاعدة البيانات
      // مثال مع MongoDB:
      /*
      const upgradeRequest = new UpgradeRequest({
        requestId,
        userId,
        email,
        fullName,
        civilId,
        licenseNumber,
        experience: parseInt(experience),
        specialties: specialties.split(',').map(s => s.trim()),
        bio,
        phone,
        licenseDocumentPath: licenseFile.path,
        idDocumentPath: idFile.path,
        status: 'pending',
        createdAt: new Date()
      });
      
      await upgradeRequest.save();
      */

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

/**
 * @route   GET /api/guides/upgrade-status/:userId
 * @desc    الحصول على حالة طلب الترقية
 * @access  Private
 */
router.get('/upgrade-status/:userId', async (req, res) => {
  const { userId } = req.params;
  
  console.log(`📥 Getting upgrade status for user: ${userId}`);
  
  try {
    // هنا يمكن جلب البيانات من قاعدة البيانات
    // const request = await UpgradeRequest.findOne({ userId }).sort({ createdAt: -1 });
    
    // مثال للرد
    const mockRequest = {
      userId,
      status: 'pending', // pending, approved, rejected
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

/**
 * @route   POST /api/guides/register
 * @desc    تسجيل مرشد جديد (للمرشحين المعتمدين فقط)
 * @access  Private (Admin only)
 */
router.post('/register', async (req, res) => {
  console.log('📥 New guide registration received:', req.body);
  
  try {
    const {
      userId,
      fullName,
      email,
      phone,
      licenseNumber,
      specialties,
      experience,
      bio
    } = req.body;

    // التحقق من البيانات المطلوبة
    if (!userId || !fullName || !email) {
      return res.status(400).json({
        success: false,
        message: 'بيانات المستخدم مطلوبة'
      });
    }

    // هنا يمكن تحديث حالة المستخدم في قاعدة البيانات
    // await User.findByIdAndUpdate(userId, { isGuide: true, role: 'guide' });

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

/**
 * @route   POST /api/guides/login
 * @desc    تسجيل دخول مرشد
 * @access  Public
 */
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

    // هنا يمكن التحقق من بيانات الدخول في قاعدة البيانات
    // const user = await User.findOne({ email, isGuide: true });
    
    // مثال للرد
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

/**
 * @route   GET /api/guides/profile/:guideId
 * @desc    الحصول على ملف المرشد
 * @access  Public
 */
router.get('/profile/:guideId', async (req, res) => {
  const { guideId } = req.params;
  
  try {
    // هنا يمكن جلب بيانات المرشد من قاعدة البيانات
    
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

// ==================== Admin Routes ====================

/**
 * @route   PUT /api/guides/approve/:requestId
 * @desc    الموافقة على طلب ترقية (للمسؤول فقط)
 * @access  Private (Admin only)
 */
router.put('/approve/:requestId', async (req, res) => {
  const { requestId } = req.params;
  const { userId } = req.body;
  
  try {
    console.log(`✅ Approving upgrade request: ${requestId} for user: ${userId}`);
    
    // هنا يمكن تحديث حالة الطلب في قاعدة البيانات
    // await UpgradeRequest.findOneAndUpdate({ requestId }, { status: 'approved' });
    // await User.findByIdAndUpdate(userId, { isGuide: true, guideStatus: 'approved' });

    res.json({
      success: true,
      message: 'تم الموافقة على طلب الترقية بنجاح',
      data: {
        requestId,
        userId,
        status: 'approved',
        approvedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error approving request:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الموافقة على الطلب'
    });
  }
});

/**
 * @route   PUT /api/guides/reject/:requestId
 * @desc    رفض طلب ترقية (للمسؤول فقط)
 * @access  Private (Admin only)
 */
router.put('/reject/:requestId', async (req, res) => {
  const { requestId } = req.params;
  const { userId, reason } = req.body;
  
  try {
    console.log(`❌ Rejecting upgrade request: ${requestId} for user: ${userId}`);
    
    // هنا يمكن تحديث حالة الطلب في قاعدة البيانات
    // await UpgradeRequest.findOneAndUpdate({ requestId }, { status: 'rejected', rejectReason: reason });

    res.json({
      success: true,
      message: 'تم رفض طلب الترقية',
      data: {
        requestId,
        userId,
        status: 'rejected',
        reason: reason || 'لم يتم تقديم سبب',
        rejectedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error rejecting request:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في رفض الطلب'
    });
  }
});

/**
 * @route   GET /api/guides/pending-requests
 * @desc    الحصول على جميع طلبات الترقية المعلقة (للمسؤول فقط)
 * @access  Private (Admin only)
 */
router.get('/pending-requests', async (req, res) => {
  try {
    console.log('📥 Getting all pending upgrade requests');
    
    // هنا يمكن جلب جميع الطلبات المعلقة من قاعدة البيانات
    // const requests = await UpgradeRequest.find({ status: 'pending' }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        total: 5,
        requests: [
          {
            requestId: 'REQ-123456',
            userId: 'user1',
            fullName: 'أحمد محمد',
            civilId: '1234567890',
            licenseNumber: 'TRL-1234-5678',
            experience: 3,
            specialties: ['تاريخ', 'تراث'],
            createdAt: new Date().toISOString()
          }
          // ... المزيد من الطلبات
        ]
      }
    });

  } catch (error) {
    console.error('❌ Error getting pending requests:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب الطلبات المعلقة'
    });
  }
});

export default router;