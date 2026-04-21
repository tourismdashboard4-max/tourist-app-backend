// backend/routes/programRoutes.js - النسخة النهائية مع دعم الصور
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validationMiddleware.js';
import { body } from 'express-validator';
import { pool } from '../config/database.js';

const router = express.Router();

// إعداد multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/programs';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `program-${unique}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    cb(null, ext && mime);
  }
});

// جلب الصور
const getProgramImages = async (programId) => {
  const result = await pool.query(
    `SELECT id, image_url, is_primary FROM program_images WHERE program_id = $1 ORDER BY is_primary DESC, created_at ASC`,
    [programId]
  );
  return result.rows;
};

// إضافة الصور إلى كائن البرنامج
const enrichWithImages = async (program) => {
  const images = await getProgramImages(program.id);
  return { ...program, images: images.map(img => ({ id: img.id, url: img.image_url, is_primary: img.is_primary })) };
};

// قواعد التحقق (نفس القديم)
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

// ========================
// ✅ GET /api/programs (مع الصور)
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
    if (guide_id) { query += ` AND p.guide_id = $${paramIndex}::uuid`; queryParams.push(guide_id); paramIndex++; }
    if (minPrice) { query += ` AND p.price >= $${paramIndex}`; queryParams.push(parseFloat(minPrice)); paramIndex++; }
    if (maxPrice) { query += ` AND p.price <= $${paramIndex}`; queryParams.push(parseFloat(maxPrice)); paramIndex++; }
    if (location) { query += ` AND (p.location ILIKE $${paramIndex} OR p.location_name ILIKE $${paramIndex})`; queryParams.push(`%${location}%`); paramIndex++; }
    query += ` ORDER BY p.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(parseInt(limit), parseInt(offset));
    const result = await pool.query(query, queryParams);
    const programsWithImages = await Promise.all(result.rows.map(enrichWithImages));
    let countQuery = 'SELECT COUNT(*) FROM programs WHERE (status = $1 OR status IS NULL)';
    const countParams = ['active'];
    if (guide_id) { countQuery += ' AND guide_id = $2::uuid'; countParams.push(guide_id); }
    const countResult = await pool.query(countQuery, countParams);
    res.json({ success: true, programs: programsWithImages, count: programsWithImages.length, total: parseInt(countResult.rows[0].count), pagination: { limit: parseInt(limit), offset: parseInt(offset) } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ GET /api/programs/:id (مع الصور)
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(`SELECT p.*, u.name as guide_name, u.email as guide_email, u.avatar as guide_avatar FROM programs p LEFT JOIN users u ON p.guide_id = u.id WHERE p.id = $1`, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'البرنامج غير موجود' });
    const program = await enrichWithImages(result.rows[0]);
    res.json({ success: true, program });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ POST /api/programs (إنشاء)
router.post('/', protect, authorize('guide'), programValidation, validate, async (req, res) => {
  try {
    const guideId = req.user.id;
    const { name, description, price, duration, max_participants, location, location_name, location_lat, location_lng, image, status } = req.body;
    const result = await pool.query(`
      INSERT INTO programs (guide_id, name, description, price, duration, max_participants, location, location_name, location_lat, location_lng, image, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW()) RETURNING *
    `, [guideId, name, description || null, price || 0, duration || 'يوم واحد', max_participants || 20, location, location_name || location, location_lat || null, location_lng || null, image || null, status || 'active']);
    const newProgram = await enrichWithImages(result.rows[0]);
    res.status(201).json({ success: true, message: 'تم إنشاء البرنامج بنجاح', program: newProgram });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ POST /api/programs/:id/images (رفع صور)
router.post('/:id/images', protect, authorize('guide'), upload.array('images', 10), async (req, res) => {
  try {
    const programId = req.params.id;
    const guideId = req.user.id;
    const check = await pool.query(`SELECT id FROM programs WHERE id = $1 AND guide_id = $2::uuid`, [programId, guideId]);
    if (check.rows.length === 0) {
      if (req.files) req.files.forEach(f => fs.unlink(f.path, () => {}));
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }
    if (!req.files || req.files.length === 0) return res.status(400).json({ success: false, message: 'لا توجد صور' });
    const uploaded = [];
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const isPrimaryRequested = req.body.is_primary === 'true';
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const url = `${baseUrl}/uploads/programs/${path.basename(file.path)}`;
      let isPrimary = (isPrimaryRequested && i === 0);
      if (!isPrimary && i === 0) {
        const existing = await pool.query(`SELECT COUNT(*) FROM program_images WHERE program_id = $1 AND is_primary = true`, [programId]);
        if (parseInt(existing.rows[0].count) === 0) isPrimary = true;
      }
      const insert = await pool.query(`INSERT INTO program_images (program_id, image_url, is_primary) VALUES ($1, $2, $3) RETURNING id, image_url, is_primary`, [programId, url, isPrimary]);
      uploaded.push(insert.rows[0]);
      if (isPrimary) await pool.query(`UPDATE program_images SET is_primary = false WHERE program_id = $1 AND id != $2`, [programId, insert.rows[0].id]);
    }
    res.status(201).json({ success: true, message: `تم رفع ${uploaded.length} صورة`, images: uploaded });
  } catch (error) {
    if (req.files) req.files.forEach(f => fs.unlink(f.path, () => {}));
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ DELETE /api/programs/:programId/images/:imageId
router.delete('/:programId/images/:imageId', protect, authorize('guide'), async (req, res) => {
  try {
    const { programId, imageId } = req.params;
    const guideId = req.user.id;
    const check = await pool.query(`SELECT id FROM programs WHERE id = $1 AND guide_id = $2::uuid`, [programId, guideId]);
    if (check.rows.length === 0) return res.status(403).json({ success: false, message: 'غير مصرح' });
    const img = await pool.query(`SELECT image_url FROM program_images WHERE id = $1 AND program_id = $2`, [imageId, programId]);
    if (img.rows.length === 0) return res.status(404).json({ success: false, message: 'الصورة غير موجودة' });
    const filePath = img.rows[0].image_url.replace(/^.*?\/uploads/, 'uploads');
    if (fs.existsSync(filePath)) fs.unlink(filePath, () => {});
    await pool.query(`DELETE FROM program_images WHERE id = $1`, [imageId]);
    const remaining = await pool.query(`SELECT id FROM program_images WHERE program_id = $1 LIMIT 1`, [programId]);
    if (remaining.rows.length > 0) await pool.query(`UPDATE program_images SET is_primary = true WHERE id = $1`, [remaining.rows[0].id]);
    res.json({ success: true, message: 'تم حذف الصورة' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ PUT /api/programs/:id (تحديث)
router.put('/:id', protect, authorize('guide'), programUpdateValidation, validate, async (req, res) => {
  try {
    const { id } = req.params;
    const guideId = req.user.id;
    const check = await pool.query(`SELECT id FROM programs WHERE id = $1 AND guide_id = $2::uuid`, [id, guideId]);
    if (check.rows.length === 0) return res.status(403).json({ success: false, message: 'غير مصرح' });
    const updates = [];
    const values = [];
    let paramIndex = 1;
    const allowedFields = ['name', 'description', 'price', 'duration', 'max_participants', 'location', 'location_name', 'location_lat', 'location_lng', 'image', 'status'];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = $${paramIndex}`);
        values.push(req.body[field]);
        paramIndex++;
      }
    }
    if (updates.length === 0) return res.status(400).json({ success: false, message: 'لا توجد بيانات' });
    updates.push('updated_at = NOW()');
    values.push(id);
    const result = await pool.query(`UPDATE programs SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`, values);
    const updated = await enrichWithImages(result.rows[0]);
    res.json({ success: true, message: 'تم التحديث', program: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ DELETE /api/programs/:id (مع حذف الصور)
router.delete('/:id', protect, authorize('guide'), async (req, res) => {
  try {
    const { id } = req.params;
    const guideId = req.user.id;
    const check = await pool.query(`SELECT id FROM programs WHERE id = $1 AND guide_id = $2::uuid`, [id, guideId]);
    if (check.rows.length === 0) return res.status(403).json({ success: false, message: 'غير مصرح' });
    const images = await pool.query(`SELECT image_url FROM program_images WHERE program_id = $1`, [id]);
    for (const img of images.rows) {
      const filePath = img.image_url.replace(/^.*?\/uploads/, 'uploads');
      if (fs.existsSync(filePath)) fs.unlink(filePath, () => {});
    }
    await pool.query(`DELETE FROM program_images WHERE program_id = $1`, [id]);
    const result = await pool.query(`DELETE FROM programs WHERE id = $1 RETURNING *`, [id]);
    res.json({ success: true, message: 'تم الحذف', program: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ PATCH /api/programs/:id/status
router.patch('/:id/status', protect, authorize('guide'), async (req, res) => {
  try {
    const { id } = req.params;
    const guideId = req.user.id;
    const { status } = req.body;
    if (!status || !['active', 'inactive', 'cancelled'].includes(status)) return res.status(400).json({ success: false, message: 'حالة غير صالحة' });
    const check = await pool.query(`SELECT id FROM programs WHERE id = $1 AND guide_id = $2::uuid`, [id, guideId]);
    if (check.rows.length === 0) return res.status(403).json({ success: false, message: 'غير مصرح' });
    const result = await pool.query(`UPDATE programs SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`, [status, id]);
    const updated = await enrichWithImages(result.rows[0]);
    res.json({ success: true, message: 'تم تحديث الحالة', program: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ GET /api/programs/guide/:guideId (مع الصور)
router.get('/guide/:guideId', async (req, res) => {
  try {
    const { guideId } = req.params;
    const result = await pool.query(`SELECT p.*, u.name as guide_name FROM programs p LEFT JOIN users u ON p.guide_id = u.id WHERE p.guide_id = $1::uuid ORDER BY p.created_at DESC`, [guideId]);
    const programsWithImages = await Promise.all(result.rows.map(enrichWithImages));
    res.json({ success: true, programs: programsWithImages, count: programsWithImages.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ Test route
router.get('/test', (req, res) => {
  res.json({ success: true, message: '✅ Program routes with image support', timestamp: new Date().toISOString() });
});

export default router;
