import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { protect } from '../middleware/authMiddleware.js';
import { pool } from '../../server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = Router();

// ============================================
// ✅ إعداد مجلدات التحميل
// ============================================
const uploadsDir = path.join(__dirname, '../../uploads');
const chatImagesDir = path.join(uploadsDir, 'chat_images');
const avatarsDir = path.join(uploadsDir, 'avatars');
const programsDir = path.join(uploadsDir, 'programs');

// إنشاء المجلدات إذا لم تكن موجودة
[chatImagesDir, avatarsDir, programsDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ============================================
// ✅ إعداد Multer مع تخزين محلي
// ============================================
const chatStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, chatImagesDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `chat-${uniqueSuffix}${ext}`);
  }
});

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${uniqueSuffix}${ext}`);
  }
});

const programStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, programsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const programId = req.body.programId || Date.now();
    cb(null, `program_${programId}_${uniqueSuffix}${ext}`);
  }
});

// فلتر الصور
const imageFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  if (mimetype && extname) return cb(null, true);
  cb(new Error('نوع الملف غير مدعوم. استخدم JPG, PNG, GIF, WEBP فقط.'));
};

const uploadChat = multer({ storage: chatStorage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: imageFilter });
const uploadAvatar = multer({ storage: avatarStorage, limits: { fileSize: 2 * 1024 * 1024 }, fileFilter: imageFilter });
const uploadProgram = multer({ storage: programStorage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: imageFilter });

// ============================================
// ✅ رفع صورة شخصية
// ============================================
router.post('/upload/avatar', protect, uploadAvatar.single('image'), async (req, res) => {
  try {
    const userId = req.user.id;
    if (!req.file) return res.status(400).json({ success: false, message: 'الرجاء اختيار صورة' });

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    const result = await pool.query(
      'UPDATE app.users SET avatar_url = $1, updated_at = NOW() WHERE id = $2 RETURNING avatar_url',
      [avatarUrl, userId]
    );
    if (result.rows.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }
    res.json({ success: true, message: 'تم رفع الصورة بنجاح', avatarUrl });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    res.status(500).json({ success: false, message: 'فشل رفع الصورة' });
  }
});

// ============================================
// ✅ رفع صورة برنامج (للمرشدين فقط)
// ============================================
router.post('/upload/program', protect, uploadProgram.single('image'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { programId } = req.body;
    if (!req.file) return res.status(400).json({ success: false, message: 'الرجاء اختيار صورة' });

    const guideCheck = await pool.query('SELECT id FROM app.guides WHERE user_id = $1', [userId]);
    if (guideCheck.rows.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(403).json({ success: false, message: 'غير مصرح لك برفع صور للبرامج' });
    }

    const imageUrl = `/uploads/programs/${req.file.filename}`;
    if (programId) {
      await pool.query(
        'UPDATE app.programs SET image_url = $1 WHERE id = $2 AND guide_id = (SELECT id FROM app.guides WHERE user_id = $3)',
        [imageUrl, programId, userId]
      );
    }
    res.json({ success: true, message: 'تم رفع الصورة بنجاح', imageUrl });
  } catch (error) {
    console.error('Error uploading program image:', error);
    res.status(500).json({ success: false, message: 'فشل رفع الصورة' });
  }
});

// ============================================
// ✅ رفع صورة للمحادثة (دعم الدردشة)
// ============================================
router.post('/upload/chat-image', protect, uploadChat.single('image'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { ticketId } = req.body;
    if (!req.file) return res.status(400).json({ success: false, message: 'الرجاء اختيار صورة' });

    // التحقق من مشاركة المستخدم في التذكرة
    if (ticketId) {
      const ticketCheck = await pool.query(
        `SELECT id FROM app.support_tickets 
         WHERE id = $1 
         AND (user_id = $2 
              OR (metadata ? 'participants' AND metadata->'participants' ? $2::text)
              OR (metadata ? 'guideId' AND metadata->>'guideId' = $2::text)
              OR (metadata ? 'touristId' AND metadata->>'touristId' = $2::text))
         LIMIT 1`,
        [ticketId, userId]
      );
      if (ticketCheck.rows.length === 0) {
        fs.unlinkSync(req.file.path);
        return res.status(403).json({ success: false, message: 'غير مصرح لك برفع صور لهذه المحادثة' });
      }
    }

    const imageUrl = `/uploads/chat_images/${req.file.filename}`;
    res.json({
      success: true,
      message: 'تم رفع الصورة بنجاح',
      imageUrl,
      url: imageUrl
    });
  } catch (error) {
    console.error('Error uploading chat image:', error);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ success: false, message: 'فشل رفع الصورة' });
  }
});

// ============================================
// ✅ حذف صورة (بسيط)
// ============================================
router.delete('/upload/:bucket/:fileName', protect, async (req, res) => {
  try {
    const { bucket, fileName } = req.params;
    const userId = req.user.id;
    const filePath = path.join(uploadsDir, bucket, fileName);

    if (bucket === 'avatars' && !fileName.startsWith('avatar-')) {
      return res.status(403).json({ success: false, message: 'غير مصرح لك بحذف هذه الصورة' });
    }

    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    if (bucket === 'avatars') {
      await pool.query('UPDATE app.users SET avatar_url = NULL WHERE id = $1', [userId]);
    }

    res.json({ success: true, message: 'تم حذف الصورة بنجاح' });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ success: false, message: 'فشل حذف الصورة' });
  }
});

export default router;
