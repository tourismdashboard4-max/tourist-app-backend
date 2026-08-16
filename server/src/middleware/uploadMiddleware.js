// ============================================
// UPLOAD MIDDLEWARE (مع دعم Cloudinary)
// رفع الملفات (الصور والمستندات)
// ============================================
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import cloudinary from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================
// تكوين Cloudinary
// ============================================
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ============================================
// هل نستخدم التخزين المحلي أم السحابي؟
// ============================================
const USE_CLOUDINARY = process.env.USE_CLOUDINARY === 'true' || process.env.NODE_ENV === 'production';

// ============================================
// التخزين المحلي (للتطوير)
// ============================================
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
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
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = file.fieldname + '-' + uniqueSuffix + ext;
    cb(null, name);
  }
});

// ============================================
// التخزين السحابي (Cloudinary)
// ============================================
const cloudinaryStorage = new CloudinaryStorage({
  cloudinary: cloudinary.v2,
  params: {
    folder: (req, file) => {
      // تحديد المجلد حسب نوع الملف
      if (file.mimetype.startsWith('image/')) {
        return 'programs/images';
      } else if (file.mimetype === 'application/pdf') {
        return 'programs/documents';
      }
      return 'programs/others';
    },
    format: async (req, file) => {
      // استخراج التنسيق من الملف
      const ext = path.extname(file.originalname).toLowerCase();
      if (ext === '.png') return 'png';
      if (ext === '.gif') return 'gif';
      if (ext === '.webp') return 'webp';
      return 'jpg'; // افتراضي
    },
    public_id: (req, file) => {
      // إنشاء اسم فريد
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const name = file.fieldname + '-' + uniqueSuffix;
      return name;
    },
    transformation: [
      { quality: 'auto:good', fetch_format: 'auto' } // تحسين الصور
    ]
  }
});

// اختيار محرك التخزين المناسب
const storage = USE_CLOUDINARY ? cloudinaryStorage : localStorage;

// ============================================
// فلتر الملفات المسموحة
// ============================================
const fileFilter = (req, file, cb) => {
  const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const documentTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  
  if (imageTypes.includes(file.mimetype) || documentTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('نوع الملف غير مدعوم. الأنواع المسموحة: صور (JPEG, PNG, GIF, WEBP) ومستندات (PDF, DOC, DOCX)'), false);
  }
};

// ============================================
// إنشاء كائن multer الأساسي
// ============================================
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// ============================================
// دوال الرفع المختلفة
// ============================================
const uploadSingleImage = upload.single('image');
const uploadMultipleImages = upload.array('images', 5);
const uploadDocument = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: fileFilter
}).single('document');

const uploadAvatar = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('الرجاء رفع صورة فقط'), false);
    }
  }
}).single('avatar');

const uploadLicense = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
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
// حذف ملف (محلي أو سحابي)
// ============================================
const deleteFile = async (filePath) => {
  if (USE_CLOUDINARY) {
    // حذف من Cloudinary
    try {
      // استخراج public_id من الرابط
      const publicId = filePath.split('/').pop().split('.')[0];
      const result = await cloudinary.v2.uploader.destroy(publicId);
      return result.result === 'ok';
    } catch (error) {
      console.error('Error deleting from Cloudinary:', error);
      return false;
    }
  } else {
    // حذف من التخزين المحلي
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
  }
};

// ============================================
// ✅ تصدير الدوال
// ============================================
export {
  upload,
  uploadSingleImage,
  uploadMultipleImages,
  uploadDocument,
  uploadAvatar,
  uploadLicense,
  handleUploadError,
  deleteFile
};

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
