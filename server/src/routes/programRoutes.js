// backend/src/routes/programRoutes.js - نسخة أصلية (تخزين محلي)
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validationMiddleware.js';
import { body } from 'express-validator';
import { pool } from '../config/database.js';

const router = express.Router();

// ============================================
// إعداد Multer لرفع الصور (تخزين محلي)
// ============================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/programs';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `program-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// ============================================
// Helper: جلب الصور لبرنامج معين
// ============================================
const getProgramImages = async (programId) => {
  const result = await pool.query(
    `SELECT id, image_url, is_primary, created_at 
     FROM program_images 
     WHERE program_id = $1 
     ORDER BY is_primary DESC, created_at ASC`,
    [programId]
  );
  return result.rows;
};

const enrichWithImages = async (program) => {
  const images = await getProgramImages(program.id);
  return {
    ...program,
    images: images.map(img => ({
      id: img.id,
      url: img.image_url,
      is_primary: img.is_primary
    }))
  };
};

// ============================================
// قواعد التحقق
// ============================================
const programValidation = [
  body('name').notEmpty().withMessage('اسم البرنامج مطلوب'),
  body('price').isFloat({ min: 0 }).withMessage('السعر يجب أن يكون رقماً موجباً'),
  body('location').notEmpty().withMessage('الموقع مطلوب')
];

const programUpdateValidation = [
  body('name').optional().notEmpty().withMessage('اسم البرنامج لا يمكن أن يكون فارغاً'),
  body('price').optional().isFloat({ min: 0 }).withMessage('السعر يجب أن يكون رقماً موجباً'),
  body('location').optional().notEmpty().withMessage('الموقع لا يمكن أن يكون فارغاً')
];

// ============================================
// ✅ GET /api/programs
// ============================================
router.get('/', async (req, res) => {
  try {
    const { guide_id, minPrice, maxPrice, location, limit = 50, offset = 0 } = req.query;
    
    let query = `
      SELECT p.*, u.name as guide_name, u.email as guide_email
      FROM programs p
      LEFT JOIN users u ON p.guide_id = u.id
      WHERE (p.status = 'active' OR p.status IS NULL)
    `;
    
    const queryParams = [];
    let paramIndex = 1;
    
    if (guide_id) {
      query += ` AND p.guide_id = $${paramIndex}::uuid`;
      queryParams.push(guide_id);
      paramIndex++;
    }
    
    if (minPrice) {
      query += ` AND p.price >= $${paramIndex}`;
      queryParams.push(parseFloat(minPrice));
      paramIndex++;
    }
    
    if (maxPrice) {
      query += ` AND p.price <= $${paramIndex}`;
      queryParams.push(parseFloat(maxPrice));
      paramIndex++;
    }
    
    if (location) {
      query += ` AND (p.location ILIKE $${paramIndex} OR p.location_name ILIKE $${paramIndex})`;
      queryParams.push(`%${location}%`);
      paramIndex++;
    }
    
    query += ` ORDER BY p.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(parseInt(limit), parseInt(offset));
    
    const result = await pool.query(query, queryParams);
    const programsWithImages = await Promise.all(result.rows.map(enrichWithImages));
    
    let countQuery = 'SELECT COUNT(*) FROM programs WHERE (status = $1 OR status IS NULL)';
    const countParams = ['active'];
    
    if (guide_id) {
      countQuery += ' AND guide_id = $2::uuid';
      countParams.push(guide_id);
    }
    
    const countResult = await pool.query(countQuery, countParams);
    
    res.json({
      success: true,
      programs: programsWithImages,
      count: programsWithImages.length,
      total: parseInt(countResult.rows[0].count),
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
    
  } catch (error) {
    console.error('❌ Get programs error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب البرامج: ' + error.message
    });
  }
});

// ============================================
// ✅ GET /api/programs/:id
// ============================================
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT p.*, u.name as guide_name, u.email as guide_email, u.avatar as guide_avatar
      FROM programs p
      LEFT JOIN users u ON p.guide_id = u.id
      WHERE p.id = $1
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'البرنامج غير موجود'
      });
    }
    
    const programWithImages = await enrichWithImages(result.rows[0]);
    
    res.json({
      success: true,
      program: programWithImages
    });
    
  } catch (error) {
    console.error('❌ Get program error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب البرنامج: ' + error.message
    });
  }
});

// ============================================
// ✅ POST /api/programs
// ============================================
router.post('/', protect, authorize('guide'), programValidation, validate, async (req, res) => {
  try {
    const guideId = req.user.id;
    const {
      name, description, price, duration,
      max_participants, location, location_name,
      location_lat, location_lng, image, status
    } = req.body;
    
    console.log('📤 Creating program for guide:', guideId);
    
    const query = `
      INSERT INTO programs (
        guide_id, name, description, price, duration,
        max_participants, location, location_name,
        location_lat, location_lng, image, status,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      RETURNING *
    `;
    
    const values = [
      guideId,
      name,
      description || null,
      price || 0,
      duration || 'يوم واحد',
      max_participants || 20,
      location,
      location_name || location,
      location_lat || null,
      location_lng || null,
      image || null,
      status || 'active'
    ];
    
    const result = await pool.query(query, values);
    const newProgram = await enrichWithImages(result.rows[0]);
    
    res.status(201).json({
      success: true,
      message: 'تم إنشاء البرنامج بنجاح',
      program: newProgram
    });
    
  } catch (error) {
    console.error('❌ Create program error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في إنشاء البرنامج: ' + error.message
    });
  }
});

// ============================================
// ✅ POST /api/programs/:id/images
// ============================================
router.post('/:id/images', protect, authorize('guide'), upload.array('images', 10), async (req, res) => {
  try {
    const programId = req.params.id;
    const guideId = req.user.id;
    
    const checkQuery = 'SELECT id FROM programs WHERE id = $1 AND guide_id = $2::uuid';
    const checkResult = await pool.query(checkQuery, [programId, guideId]);
    
    if (checkResult.rows.length === 0) {
      if (req.files) {
        req.files.forEach(file => fs.unlink(file.path, () => {}));
      }
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك برفع صور لهذا البرنامج'
      });
    }
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'الرجاء اختيار صورة واحدة على الأقل'
      });
    }
    
    const uploadedImages = [];
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const isPrimaryRequested = req.body.is_primary === 'true';
    
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const fullUrl = `${baseUrl}/uploads/programs/${path.basename(file.path)}`;
      
      let shouldBePrimary = (isPrimaryRequested && i === 0);
      if (!shouldBePrimary && i === 0) {
        const existingPrimary = await pool.query(
          'SELECT COUNT(*) FROM program_images WHERE program_id = $1 AND is_primary = true',
          [programId]
        );
        if (parseInt(existingPrimary.rows[0].count) === 0) {
          shouldBePrimary = true;
        }
      }
      
      const insertResult = await pool.query(
        `INSERT INTO program_images (program_id, image_url, is_primary)
         VALUES ($1, $2, $3) RETURNING id, program_id, image_url, is_primary`,
        [programId, fullUrl, shouldBePrimary]
      );
      uploadedImages.push(insertResult.rows[0]);
      
      if (shouldBePrimary) {
        await pool.query(
          'UPDATE program_images SET is_primary = false WHERE program_id = $1 AND id != $2',
          [programId, insertResult.rows[0].id]
        );
      }
    }
    
    res.status(201).json({
      success: true,
      message: `تم رفع ${uploadedImages.length} صورة بنجاح`,
      images: uploadedImages
    });
    
  } catch (error) {
    console.error('❌ Upload images error:', error);
    if (req.files) {
      req.files.forEach(file => fs.unlink(file.path, () => {}));
    }
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في رفع الصور: ' + error.message
    });
  }
});

// ============================================
// ✅ DELETE /api/programs/:programId/images/:imageId
// ============================================
router.delete('/:programId/images/:imageId', protect, authorize('guide'), async (req, res) => {
  try {
    const { programId, imageId } = req.params;
    const guideId = req.user.id;
    
    const checkQuery = 'SELECT id FROM programs WHERE id = $1 AND guide_id = $2::uuid';
    const checkResult = await pool.query(checkQuery, [programId, guideId]);
    if (checkResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بحذف صور هذا البرنامج'
      });
    }
    
    const imageQuery = 'SELECT image_url, is_primary FROM program_images WHERE id = $1 AND program_id = $2';
    const imageResult = await pool.query(imageQuery, [imageId, programId]);
    if (imageResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'الصورة غير موجودة'
      });
    }
    
    await pool.query('DELETE FROM program_images WHERE id = $1', [imageId]);
    
    const filePath = imageResult.rows[0].image_url.replace(/^.*?\/uploads/, 'uploads');
    if (fs.existsSync(filePath)) {
      fs.unlink(filePath, () => {});
    }
    
    if (imageResult.rows[0].is_primary) {
      const remaining = await pool.query(
        'SELECT id FROM program_images WHERE program_id = $1 LIMIT 1',
        [programId]
      );
      if (remaining.rows.length > 0) {
        await pool.query(
          'UPDATE program_images SET is_primary = true WHERE id = $1',
          [remaining.rows[0].id]
        );
      }
    }
    
    res.json({
      success: true,
      message: 'تم حذف الصورة بنجاح'
    });
    
  } catch (error) {
    console.error('❌ Delete image error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في حذف الصورة: ' + error.message
    });
  }
});

// ============================================
// ✅ PUT /api/programs/:id
// ============================================
router.put('/:id', protect, authorize('guide'), programUpdateValidation, validate, async (req, res) => {
  try {
    const { id } = req.params;
    const guideId = req.user.id;
    
    const checkQuery = 'SELECT * FROM programs WHERE id = $1 AND guide_id = $2::uuid';
    const checkResult = await pool.query(checkQuery, [id, guideId]);
    
    if (checkResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بتعديل هذا البرنامج أو البرنامج غير موجود'
      });
    }
    
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    const allowedFields = [
      'name', 'description', 'price', 'duration', 'max_participants',
      'location', 'location_name', 'location_lat', 'location_lng',
      'image', 'status'
    ];
    
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = $${paramIndex}`);
        values.push(req.body[field]);
        paramIndex++;
      }
    }
    
    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'لا توجد بيانات للتحديث'
      });
    }
    
    updates.push('updated_at = NOW()');
    values.push(id);
    
    const query = `
      UPDATE programs 
      SET ${updates.join(', ')} 
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    const updatedProgram = await enrichWithImages(result.rows[0]);
    
    res.json({
      success: true,
      message: 'تم تحديث البرنامج بنجاح',
      program: updatedProgram
    });
    
  } catch (error) {
    console.error('❌ Update program error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في تحديث البرنامج: ' + error.message
    });
  }
});

// ============================================
// ✅ DELETE /api/programs/:id
// ============================================
router.delete('/:id', protect, authorize('guide'), async (req, res) => {
  try {
    const { id } = req.params;
    const guideId = req.user.id;
    
    const checkQuery = 'SELECT * FROM programs WHERE id = $1 AND guide_id = $2::uuid';
    const checkResult = await pool.query(checkQuery, [id, guideId]);
    
    if (checkResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بحذف هذا البرنامج أو البرنامج غير موجود'
      });
    }
    
    const images = await pool.query('SELECT image_url FROM program_images WHERE program_id = $1', [id]);
    for (const img of images.rows) {
      const filePath = img.image_url.replace(/^.*?\/uploads/, 'uploads');
      if (fs.existsSync(filePath)) {
        fs.unlink(filePath, () => {});
      }
    }
    
    await pool.query('DELETE FROM program_images WHERE program_id = $1', [id]);
    
    const query = 'DELETE FROM programs WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);
    
    res.json({
      success: true,
      message: 'تم حذف البرنامج بنجاح',
      program: result.rows[0]
    });
    
  } catch (error) {
    console.error('❌ Delete program error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في حذف البرنامج: ' + error.message
    });
  }
});

// ============================================
// ✅ PATCH /api/programs/:id/status
// ============================================
router.patch('/:id/status', protect, authorize('guide'), async (req, res) => {
  try {
    const { id } = req.params;
    const guideId = req.user.id;
    const { status } = req.body;
    
    if (!status || !['active', 'inactive', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'حالة غير صالحة. الحالات المسموحة: active, inactive, cancelled'
      });
    }
    
    const checkQuery = 'SELECT * FROM programs WHERE id = $1 AND guide_id = $2::uuid';
    const checkResult = await pool.query(checkQuery, [id, guideId]);
    
    if (checkResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بتعديل هذا البرنامج'
      });
    }
    
    const query = `
      UPDATE programs 
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;
    
    const result = await pool.query(query, [status, id]);
    const updatedProgram = await enrichWithImages(result.rows[0]);
    
    res.json({
      success: true,
      message: 'تم تحديث حالة البرنامج بنجاح',
      program: updatedProgram
    });
    
  } catch (error) {
    console.error('❌ Update program status error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في تحديث حالة البرنامج: ' + error.message
    });
  }
});

// ============================================
// ✅ GET /api/programs/guide/:guideId
// ============================================
router.get('/guide/:guideId', async (req, res) => {
  try {
    const { guideId } = req.params;
    
    const query = `
      SELECT p.*, u.name as guide_name
      FROM programs p
      LEFT JOIN users u ON p.guide_id = u.id
      WHERE p.guide_id = $1::uuid
      ORDER BY p.created_at DESC
    `;
    
    const result = await pool.query(query, [guideId]);
    const programsWithImages = await Promise.all(result.rows.map(enrichWithImages));
    
    res.json({
      success: true,
      programs: programsWithImages,
      count: programsWithImages.length
    });
    
  } catch (error) {
    console.error('❌ Get guide programs error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب برامج المرشد: ' + error.message
    });
  }
});

// ============================================
// ✅ Test route
// ============================================
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: '✅ Program routes are working with PostgreSQL and image support',
    timestamp: new Date().toISOString(),
    serverTime: new Date().toLocaleString()
  });
});

export default router;
