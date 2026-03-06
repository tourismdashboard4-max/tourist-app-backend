const multer = require('multer');
const path = require('path');
const fs = require('fs');

// التأكد من وجود مجلد التحميل
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// إعداد التخزين
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// فلترة أنواع الملفات
const fileFilter = (req, file, cb) => {
  // الصور المسموحة
  if (file.fieldname === 'avatar' || file.fieldname === 'images') {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('الملف يجب أن يكون صورة'), false);
    }
  }
  
  // الملفات المسموحة
  else if (file.fieldname === 'documents') {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('نوع الملف غير مسموح به'), false);
    }
  }
  
  else {
    cb(new Error('حقل غير معروف'), false);
  }
};

// رفع ملف واحد
const uploadSingle = (fieldName) => {
  return multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
      fileSize: 5 * 1024 * 1024 // 5 ميجابايت
    }
  }).single(fieldName);
};

// رفع عدة ملفات
const uploadMultiple = (fieldName, maxCount = 10) => {
  return multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
      fileSize: 5 * 1024 * 1024 // 5 ميجابايت
    }
  }).array(fieldName, maxCount);
};

// Middleware لرفع الصورة الشخصية
const uploadAvatar = (req, res, next) => {
  const upload = uploadSingle('avatar');
  
  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        success: false,
        message: 'خطأ في رفع الملف: ' + err.message
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    next();
  });
};

// Middleware لرفع الصور
const uploadImages = (req, res, next) => {
  const upload = uploadMultiple('images', 10);
  
  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        success: false,
        message: 'خطأ في رفع الملفات: ' + err.message
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    next();
  });
};

// Middleware لرفع المستندات
const uploadDocuments = (req, res, next) => {
  const upload = uploadMultiple('documents', 5);
  
  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        success: false,
        message: 'خطأ في رفع الملفات: ' + err.message
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    next();
  });
};

// حذف الملفات المؤقتة
const cleanupTempFiles = (files) => {
  if (!files) return;
  
  const filesArray = Array.isArray(files) ? files : [files];
  
  filesArray.forEach(file => {
    if (file && file.path) {
      fs.unlink(file.path, (err) => {
        if (err) console.error('Error deleting temp file:', err);
      });
    }
  });
};

module.exports = {
  uploadAvatar,
  uploadImages,
  uploadDocuments,
  cleanupTempFiles
};