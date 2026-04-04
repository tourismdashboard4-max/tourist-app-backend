import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validationMiddleware.js';
import { body } from 'express-validator';
import { pool } from '../config/database.js';

const router = express.Router();

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
// الحصول على جميع البرامج
// ============================================
router.get('/', async (req, res) => {
  try {
    const { guide_id, minPrice, maxPrice, location, limit = 50, offset = 0 } = req.query;
    
    let query = `
      SELECT p.*, u.name as guide_name, u.email as guide_email
      FROM programs p
      LEFT JOIN users u ON p.guide_id = u.id
      WHERE p.status = 'active' OR p.status IS NULL
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
    
    // الحصول على العدد الإجمالي
    let countQuery = 'SELECT COUNT(*) FROM programs WHERE status = $1 OR status IS NULL';
    const countParams = ['active'];
    
    if (guide_id) {
      countQuery += ' AND guide_id = $2::uuid';
      countParams.push(guide_id);
    }
    
    const countResult = await pool.query(countQuery, countParams);
    
    res.json({
      success: true,
      programs: result.rows,
      count: result.rows.length,
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
// الحصول على برنامج محدد
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
    
    res.json({
      success: true,
      program: result.rows[0]
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
// إنشاء برنامج جديد (للمرشدين فقط)
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
    console.log('📤 Program data:', req.body);
    
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
    
    res.status(201).json({
      success: true,
      message: 'تم إنشاء البرنامج بنجاح',
      program: result.rows[0]
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
// ✅ PUT /api/programs/:id
// تحديث برنامج (للمرشد صاحب البرنامج فقط)
// ============================================
router.put('/:id', protect, authorize('guide'), programUpdateValidation, validate, async (req, res) => {
  try {
    const { id } = req.params;
    const guideId = req.user.id;
    
    // التحقق من أن البرنامج يخص هذا المرشد
    const checkQuery = 'SELECT * FROM programs WHERE id = $1 AND guide_id = $2::uuid';
    const checkResult = await pool.query(checkQuery, [id, guideId]);
    
    if (checkResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بتعديل هذا البرنامج أو البرنامج غير موجود'
      });
    }
    
    // بناء استعلام التحديث ديناميكياً
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
    
    res.json({
      success: true,
      message: 'تم تحديث البرنامج بنجاح',
      program: result.rows[0]
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
// حذف برنامج (للمرشد صاحب البرنامج فقط)
// ============================================
router.delete('/:id', protect, authorize('guide'), async (req, res) => {
  try {
    const { id } = req.params;
    const guideId = req.user.id;
    
    // التحقق من أن البرنامج يخص هذا المرشد
    const checkQuery = 'SELECT * FROM programs WHERE id = $1 AND guide_id = $2::uuid';
    const checkResult = await pool.query(checkQuery, [id, guideId]);
    
    if (checkResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بحذف هذا البرنامج أو البرنامج غير موجود'
      });
    }
    
    // حذف البرنامج
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
// تحديث حالة البرنامج
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
    
    // التحقق من أن البرنامج يخص هذا المرشد
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
    
    res.json({
      success: true,
      message: 'تم تحديث حالة البرنامج بنجاح',
      program: result.rows[0]
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
// الحصول على برامج مرشد محدد
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
    
    res.json({
      success: true,
      programs: result.rows,
      count: result.rows.length
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
    message: '✅ Program routes are working with PostgreSQL',
    timestamp: new Date().toISOString(),
    serverTime: new Date().toLocaleString()
  });
});

export default router;
