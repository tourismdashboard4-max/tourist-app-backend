// ============================================
// UPLOAD MIDDLEWARE
// رفع الملفات (الصور والمستندات)
// ============================================
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================
// التأكد من وجود مجلد uploads
// ============================================
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ============================================
// إعدادات التخزين
// ============================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // تحديد المجلد حسب نوع الملف
    let folder = 'others';
    
    if (file.mimetype.startsWith('image/')) {
      folder = 'images';
    } else if (file.mimetype === 'application/pdf') {
      folder = 'documents';
    }
    
    const destPath = path.join(uploadDir, folder);
    if (!fs.existsSync(destPath)) {
      fs.mkdirSync(destPath, { recursive: true });
    }
    
    cb(null, destPath);
  },
  
  filename: (req, file, cb) => {
    // إنشاء اسم فريد للملف
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = file.fieldname + '-' + uniqueSuffix + ext;
    cb(null, name);
  }
});

// ============================================
// فلتر الملفات المسموحة
// ============================================
const fileFilter = (req, file, cb) => {
  // الصور المسموحة
  const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  // المستندات المسموحة
  const documentTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  
  if (imageTypes.includes(file.mimetype) || documentTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('نوع الملف غير مدعوم. الأنواع المسموحة: صور (JPEG, PNG, GIF, WEBP) ومستندات (PDF, DOC, DOCX)'), false);
  }
};

// إنشاء كائن multer الأساسي
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB حد أقصى افتراضي
});

// ============================================
// رفع صورة واحدة
// ============================================
const uploadSingleImage = upload.single('image');

// ============================================
// رفع عدة صور
// ============================================
const uploadMultipleImages = upload.array('images', 5); // حد أقصى 5 صور

// ============================================
// رفع مستند
// ============================================
const uploadDocument = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: fileFilter
}).single('document');

// ============================================
// رفع صورة الملف الشخصي
// ============================================
const uploadAvatar = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('الرجاء رفع صورة فقط'), false);
    }
  }
}).single('avatar');

// ============================================
// رفع وثيقة الرخصة (لطلب الترقية)
// ============================================
const uploadLicense = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('الرجاء رفع صورة أو ملف PDF'), false);
    }
  }
}).single('license');

// ============================================
// معالجة أخطاء رفع الملفات
// ============================================
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'FILE_TOO_LARGE') {
      return res.status(400).json({
        success: false,
        message: 'حجم الملف كبير جداً'
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message
    });
  } else if (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  next();
};

// ============================================
// حذف ملف
// ============================================
const deleteFile = (filePath) => {
  try {
    const fullPath = path.join(__dirname, '../../', filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return true;
    }
  } catch (error) {
    console.error('Error deleting file:', error);
  }
  return false;
};

// ============================================
// ✅ تصدير الدوال (ES Modules)
// ============================================
export {
  upload, // ✅ التصدير المطلوب لـ guideRoutes.js
  uploadSingleImage,
  uploadMultipleImages,
  uploadDocument,
  uploadAvatar,
  uploadLicense,
  handleUploadError,
  deleteFile
};

// ✅ تصدير افتراضي أيضاً
export default {
  upload,
  uploadSingleImage,
  uploadMultipleImages,
  uploadDocument,
  uploadAvatar,
  uploadLicense,
  handleUploadError,
  deleteFile
};
