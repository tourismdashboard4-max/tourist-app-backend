import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validation.middleware.js';
import { body } from 'express-validator';
import { pool } from '../config/database.js';

const router = express.Router();

// ============================================
// قواعد التحقق
// ============================================
const programValidation = [
  body('title').notEmpty().withMessage('عنوان البرنامج مطلوب'),
  body('description').notEmpty().withMessage('وصف البرنامج مطلوب'),
  body('price').isFloat({ min: 0 }).withMessage('السعر يجب أن يكون رقماً موجباً'),
  body('duration').isInt({ min: 1 }).withMessage('المدة يجب أن تكون رقماً صحيحاً'),
  body('maxParticipants').isInt({ min: 1 }).withMessage('عدد المشاركين يجب أن يكون رقماً صحيحاً'),
  body('location').notEmpty().withMessage('الموقع مطلوب')
];

const programUpdateValidation = [
  body('title').optional().notEmpty().withMessage('عنوان البرنامج لا يمكن أن يكون فارغاً'),
  body('description').optional().notEmpty().withMessage('وصف البرنامج لا يمكن أن يكون فارغاً'),
  body('price').optional().isFloat({ min: 0 }).withMessage('السعر يجب أن يكون رقماً موجباً'),
  body('duration').optional().isInt({ min: 1 }).withMessage('المدة يجب أن تكون رقماً صحيحاً'),
  body('maxParticipants').optional().isInt({ min: 1 }).withMessage('عدد المشاركين يجب أن يكون رقماً صحيحاً'),
  body('location').optional().notEmpty().withMessage('الموقع لا يمكن أن يكون فارغاً')
];

// ============================================
// ✅ GET /api/programs
// الحصول على جميع البرامج
// ============================================
router.get('/', async (req, res) => {
  try {
    const { guideId, minPrice, maxPrice, location, limit = 20, offset = 0 } = req.query;
    
    let query = `
      SELECT p.*, 
             u.id as guide_id, 
             u.full_name as guide_name, 
             u.avatar as guide_avatar,
             (SELECT COUNT(*) FROM app.bookings b WHERE b.program_id = p.id AND b.status = 'completed') as total_bookings,
             (SELECT AVG(rating) FROM app.reviews r WHERE r.program_id = p.id) as avg_rating
      FROM app.programs p
      JOIN app.users u ON u.id = p.guide_id
      WHERE p.status = 'active'
    `;
    
    const queryParams = [];
    let paramIndex = 1;
    
    if (guideId) {
      query += ` AND p.guide_id = $${paramIndex}`;
      queryParams.push(guideId);
      paramIndex++;
    }
    
    if (minPrice) {
      query += ` AND p.price >= $${paramIndex}`;
      queryParams.push(minPrice);
      paramIndex++;
    }
    
    if (maxPrice) {
      query += ` AND p.price <= $${paramIndex}`;
      queryParams.push(maxPrice);
      paramIndex++;
    }
    
    if (location) {
      query += ` AND p.location ILIKE $${paramIndex}`;
      queryParams.push(`%${location}%`);
      paramIndex++;
    }
    
    query += ` ORDER BY p.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limit, offset);
    
    const result = await pool.query(query, queryParams);
    
    // الحصول على العدد الإجمالي
    const countResult = await pool.query('SELECT COUNT(*) FROM app.programs WHERE status = $1', ['active']);
    
    res.json({
      success: true,
      programs: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
    
  } catch (error) {
    console.error('❌ Get programs error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب البرامج'
    });
  }
});

// ============================================
// ✅ GET /api/programs/:id
// الحصول على برنامج محدد
// ============================================
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT p.*, 
             u.id as guide_id, 
             u.full_name as guide_name, 
             u.avatar as guide_avatar,
             u.bio as guide_bio,
             u.phone as guide_phone,
             u.email as guide_email,
             (SELECT COUNT(*) FROM app.bookings b WHERE b.program_id = p.id AND b.status = 'completed') as total_bookings,
             (SELECT AVG(rating) FROM app.reviews r WHERE r.program_id = p.id) as avg_rating,
             (SELECT json_agg(r) FROM (
                SELECT r.*, u.full_name as user_name, u.avatar as user_avatar
                FROM app.reviews r
                JOIN app.users u ON u.id = r.user_id
                WHERE r.program_id = p.id
                ORDER BY r.created_at DESC
                LIMIT 10
             ) r) as recent_reviews
      FROM app.programs p
      JOIN app.users u ON u.id = p.guide_id
      WHERE p.id = $1
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'البرنامج غير موجود'
      });
    }
    
    res.json({
      success: true,
      program: result.rows[0]
    });
    
  } catch (error) {
    console.error('❌ Get program error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب البرنامج'
    });
  }
});

// ============================================
// ✅ POST /api/programs
// إنشاء برنامج جديد (للمرشدين فقط)
// ============================================
router.post('/', protect, authorize('guide'), programValidation, validate, async (req, res) => {
  try {
    const guideId = req.user.id;
    const {
      title, description, price, duration,
      maxParticipants, location, images, includes, excludes,
      itinerary, startDate, endDate, category
    } = req.body;
    
    const query = `
      INSERT INTO app.programs (
        guide_id, title, description, price, duration,
        max_participants, location, images, includes, excludes,
        itinerary, start_date, end_date, category, status,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
      RETURNING *
    `;
    
    const values = [
      guideId,
      title,
      description,
      price,
      duration,
      maxParticipants,
      location,
      images || [],
      includes || [],
      excludes || [],
      itinerary || {},
      startDate || null,
      endDate || null,
      category || 'general',
      'active'
    ];
    
    const result = await pool.query(query, values);
    
    res.status(201).json({
      success: true,
      message: 'تم إنشاء البرنامج بنجاح',
      program: result.rows[0]
    });
    
  } catch (error) {
    console.error('❌ Create program error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في إنشاء البرنامج'
    });
  }
});

// ============================================
// ✅ PUT /api/programs/:id
// تحديث برنامج (للمرشد صاحب البرنامج فقط)
// ============================================
router.put('/:id', protect, authorize('guide'), programUpdateValidation, validate, async (req, res) => {
  try {
    const { id } = req.params;
    const guideId = req.user.id;
    
    // التحقق من أن البرنامج يخص هذا المرشد
    const checkQuery = 'SELECT * FROM app.programs WHERE id = $1 AND guide_id = $2';
    const checkResult = await pool.query(checkQuery, [id, guideId]);
    
    if (checkResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بتعديل هذا البرنامج'
      });
    }
    
    // بناء استعلام التحديث ديناميكياً
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    const allowedFields = [
      'title', 'description', 'price', 'duration', 'max_participants',
      'location', 'images', 'includes', 'excludes', 'itinerary',
      'start_date', 'end_date', 'category', 'status'
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
      UPDATE app.programs 
      SET ${updates.join(', ')} 
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    
    res.json({
      success: true,
      message: 'تم تحديث البرنامج بنجاح',
      program: result.rows[0]
    });
    
  } catch (error) {
    console.error('❌ Update program error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في تحديث البرنامج'
    });
  }
});

// ============================================
// ✅ DELETE /api/programs/:id
// حذف برنامج (للمرشد صاحب البرنامج فقط)
// ============================================
router.delete('/:id', protect, authorize('guide'), async (req, res) => {
  try {
    const { id } = req.params;
    const guideId = req.user.id;
    
    // التحقق من أن البرنامج يخص هذا المرشد
    const checkQuery = 'SELECT * FROM app.programs WHERE id = $1 AND guide_id = $2';
    const checkResult = await pool.query(checkQuery, [id, guideId]);
    
    if (checkResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بحذف هذا البرنامج'
      });
    }
    
    // التحقق من عدم وجود حجوزات نشطة
    const bookingsQuery = `
      SELECT COUNT(*) FROM app.bookings 
      WHERE program_id = $1 AND status IN ('pending', 'confirmed', 'in_progress')
    `;
    const bookingsResult = await pool.query(bookingsQuery, [id]);
    
    if (parseInt(bookingsResult.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن حذف البرنامج لوجود حجوزات نشطة'
      });
    }
    
    // حذف البرنامج (أو تغيير الحالة)
    const query = 'UPDATE app.programs SET status = $1 WHERE id = $2 RETURNING *';
    const result = await pool.query(query, ['deleted', id]);
    
    res.json({
      success: true,
      message: 'تم حذف البرنامج بنجاح',
      program: result.rows[0]
    });
    
  } catch (error) {
    console.error('❌ Delete program error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في حذف البرنامج'
    });
  }
});

// ============================================
// ✅ GET /api/programs/guide/:guideId
// الحصول على برامج مرشد محدد
// ============================================
router.get('/guide/:guideId', async (req, res) => {
  try {
    const { guideId } = req.params;
    
    const query = `
      SELECT p.*, 
             (SELECT COUNT(*) FROM app.bookings b WHERE b.program_id = p.id) as total_bookings,
             (SELECT AVG(rating) FROM app.reviews r WHERE r.program_id = p.id) as avg_rating
      FROM app.programs p
      WHERE p.guide_id = $1 AND p.status = 'active'
      ORDER BY p.created_at DESC
    `;
    
    const result = await pool.query(query, [guideId]);
    
    res.json({
      success: true,
      programs: result.rows
    });
    
  } catch (error) {
    console.error('❌ Get guide programs error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب برامج المرشد'
    });
  }
});

// ============================================
// ✅ POST /api/programs/:id/reviews
// إضافة تقييم لبرنامج
// ============================================
router.post('/:id/reviews', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { rating, comment } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'التقييم يجب أن يكون بين 1 و 5'
      });
    }
    
    // التحقق من أن المستخدم لديه حجز مكتمل لهذا البرنامج
    const checkQuery = `
      SELECT COUNT(*) FROM app.bookings 
      WHERE program_id = $1 AND user_id = $2 AND status = 'completed'
    `;
    const checkResult = await pool.query(checkQuery, [id, userId]);
    
    if (parseInt(checkResult.rows[0].count) === 0) {
      return res.status(403).json({
        success: false,
        message: 'يجب أن يكون لديك حجز مكتمل لهذا البرنامج لتقييمه'
      });
    }
    
    // إضافة التقييم
    const query = `
      INSERT INTO app.reviews (program_id, user_id, rating, comment, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *
    `;
    
    const result = await pool.query(query, [id, userId, rating, comment || null]);
    
    res.status(201).json({
      success: true,
      message: 'تم إضافة التقييم بنجاح',
      review: result.rows[0]
    });
    
  } catch (error) {
    console.error('❌ Add review error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في إضافة التقييم'
    });
  }
});

// ============================================
// ✅ Test route
// ============================================
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: '✅ Program routes are working with PostgreSQL',
    timestamp: new Date().toISOString(),
    serverTime: new Date().toLocaleString()
  });
});

export default router;
