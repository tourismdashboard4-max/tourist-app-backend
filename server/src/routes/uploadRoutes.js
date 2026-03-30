import { Router } from 'express';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// تهيئة Supabase Client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// إعداد multer للتخزين المؤقت
const storage = multer.memoryStorage();
const upload = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('نوع الملف غير مدعوم. يرجى رفع صورة (JPEG, PNG, GIF, WEBP)'));
        }
    }
});

// رفع صورة شخصية
router.post('/upload/avatar', authenticate, upload.single('image'), async (req, res) => {
    try {
        const userId = req.user.id;
        const file = req.file;
        
        if (!file) {
            return res.status(400).json({ 
                success: false, 
                message: 'الرجاء اختيار صورة' 
            });
        }

        // إنشاء اسم فريد للصورة
        const fileExt = file.originalname.split('.').pop();
        const fileName = `${userId}-${Date.now()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        // رفع الصورة إلى Supabase Storage
        const { data, error } = await supabase.storage
            .from('avatars')
            .upload(filePath, file.buffer, {
                contentType: file.mimetype,
                cacheControl: '3600'
            });

        if (error) throw error;

        // الحصول على URL العام
        const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);

        // تحديث قاعدة البيانات
        const result = await req.pool.query(
            'UPDATE app.users SET avatar_url = $1 WHERE id = $2 RETURNING avatar_url',
            [publicUrl, userId]
        );

        res.json({
            success: true,
            message: 'تم رفع الصورة بنجاح',
            avatarUrl: result.rows[0].avatar_url
        });

    } catch (error) {
        console.error('Error uploading avatar:', error);
        res.status(500).json({ 
            success: false, 
            message: 'فشل رفع الصورة' 
        });
    }
});

// رفع صورة برنامج (للمرشدين فقط)
router.post('/upload/program', authenticate, upload.single('image'), async (req, res) => {
    try {
        const userId = req.user.id;
        const { programId } = req.body;
        const file = req.file;

        // التحقق من أن المستخدم مرشد
        const guideCheck = await req.pool.query(
            'SELECT id FROM app.guides WHERE user_id = $1',
            [userId]
        );

        if (guideCheck.rows.length === 0) {
            return res.status(403).json({ 
                success: false, 
                message: 'غير مصرح لك برفع صور للبرامج' 
            });
        }

        if (!file) {
            return res.status(400).json({ 
                success: false, 
                message: 'الرجاء اختيار صورة' 
            });
        }

        const fileExt = file.originalname.split('.').pop();
        const fileName = `program-${programId || Date.now()}-${Date.now()}.${fileExt}`;
        const filePath = `programs/${fileName}`;

        const { data, error } = await supabase.storage
            .from('programs')
            .upload(filePath, file.buffer, {
                contentType: file.mimetype
            });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
            .from('programs')
            .getPublicUrl(filePath);

        if (programId) {
            await req.pool.query(
                'UPDATE app.programs SET image_url = $1 WHERE id = $2 AND guide_id = (SELECT id FROM app.guides WHERE user_id = $3)',
                [publicUrl, programId, userId]
            );
        }

        res.json({
            success: true,
            message: 'تم رفع صورة البرنامج بنجاح',
            imageUrl: publicUrl
        });

    } catch (error) {
        console.error('Error uploading program image:', error);
        res.status(500).json({ 
            success: false, 
            message: 'فشل رفع الصورة' 
        });
    }
});

// حذف صورة
router.delete('/upload/:bucket/:fileName', authenticate, async (req, res) => {
    try {
        const { bucket, fileName } = req.params;
        const userId = req.user.id;

        // التحقق من صلاحية الحذف
        if (bucket === 'avatars' && !fileName.startsWith(userId)) {
            return res.status(403).json({ 
                success: false, 
                message: 'غير مصرح لك بحذف هذه الصورة' 
            });
        }

        const { error } = await supabase.storage
            .from(bucket)
            .remove([`${bucket}/${fileName}`]);

        if (error) throw error;

        // تحديث قاعدة البيانات
        if (bucket === 'avatars') {
            await req.pool.query(
                'UPDATE app.users SET avatar_url = NULL WHERE id = $1',
                [userId]
            );
        }

        res.json({
            success: true,
            message: 'تم حذف الصورة بنجاح'
        });

    } catch (error) {
        console.error('Error deleting image:', error);
        res.status(500).json({ 
            success: false, 
            message: 'فشل حذف الصورة' 
        });
    }
});

export default router;
