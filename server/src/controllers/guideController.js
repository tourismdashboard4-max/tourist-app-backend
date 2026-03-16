// server/src/controllers/guideController.js
import { pool } from '../config/database.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { validationResult } from 'express-validator';
import notificationService from '../services/notificationService.js';

// ============================================
// @desc    Request upgrade to guide
// @route   POST /api/guides/upgrade
// @access  Private
// ============================================
export const requestUpgrade = async (req, res) => {
  try {
    const userId = req.user.id;
    const { fullName, civilId, licenseNumber, phone, experience, specialties } = req.body;
    const files = req.files;

    // ✅ التحقق من عدم وجود طلب سابق - باستخدام guide_upgrade_requests
    const existingRequest = await pool.query(
      `SELECT id FROM app.guide_upgrade_requests 
       WHERE user_id = $1 AND status = 'pending'`,
      [userId]
    );

    if (existingRequest.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'لديك طلب ترقية قيد المراجعة بالفعل'
      });
    }

    // معالجة الملفات
    const documents = {};
    if (files) {
      if (files.licenseDocument) {
        documents.license_document = files.licenseDocument[0].path;
      }
      if (files.idDocument) {
        documents.id_document = files.idDocument[0].path;
      }
    }

    // ✅ إنشاء طلب الترقية - باستخدام guide_upgrade_requests
    const result = await pool.query(
      `INSERT INTO app.guide_upgrade_requests (
        user_id, full_name, civil_id, license_number, phone,
        experience, specialties, documents, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING id`,
      [
        userId,
        fullName,
        civilId,
        licenseNumber,
        phone,
        experience,
        specialties || null,
        JSON.stringify(documents),
        'pending'
      ]
    );

    // إرسال إشعار للمشرفين
    await notificationService.sendToAdmins({
      type: 'NEW_GUIDE_REQUEST',
      title: 'طلب ترقية جديد',
      message: `تم استلام طلب ترقية من ${fullName}`,
      data: {
        requestId: result.rows[0].id,
        userId
      }
    });

    res.status(201).json({
      success: true,
      message: 'تم إرسال طلب الترقية بنجاح',
      requestId: result.rows[0].id
    });

  } catch (error) {
    console.error('❌ Upgrade request error:', error);
    res.status(500).json({
      success: false,
      message: 'فشل إرسال طلب الترقية'
    });
  }
};

// ============================================
// @desc    Register a new guide (pending approval)
// @route   POST /api/guides/register
// @access  Public
// ============================================
export const registerGuide = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { civilId, licenseNumber, email, fullName, phone, experience, specialties } = req.body;

    // Check if already exists in approved guides
    const existingGuide = await pool.query(
      `SELECT id FROM app.guides 
       WHERE civil_id = $1 OR license_number = $2 OR email = $3`,
      [civilId, licenseNumber, email]
    );

    if (existingGuide.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'هذا المرشد مسجل بالفعل في النظام'
      });
    }

    // ✅ Check if already has pending registration - باستخدام guide_upgrade_requests
    const existingRegistration = await pool.query(
      `SELECT id FROM app.guide_upgrade_requests 
       WHERE (civil_id = $1 OR license_number = $2 OR email = $3) AND status = 'pending'`,
      [civilId, licenseNumber, email]
    );

    if (existingRegistration.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'لديك طلب تسجيل قيد المراجعة بالفعل'
      });
    }

    // ✅ Create new registration - باستخدام guide_upgrade_requests
    const registrationResult = await pool.query(
      `INSERT INTO app.guide_upgrade_requests (
        full_name, civil_id, license_number, email, phone, experience,
        specialties, ip_address, user_agent, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      RETURNING id, status`,
      [
        fullName,
        civilId,
        licenseNumber,
        email,
        phone,
        experience,
        specialties || null,
        req.ip,
        req.get('user-agent'),
        'pending'
      ]
    );

    const registration = registrationResult.rows[0];

    // إرسال إشعار للمشرفين داخل التطبيق
    await notificationService.sendToAdmins({
      type: 'NEW_GUIDE_REQUEST',
      title: 'طلب تسجيل مرشد جديد',
      message: `تم استلام طلب تسجيل جديد من ${fullName}`,
      data: {
        registrationId: registration.id,
        guideName: fullName,
        email: email
      }
    });

    res.status(201).json({
      success: true,
      message: 'تم إرسال طلب التسجيل بنجاح، سيتم مراجعته من قبل الإدارة خلال 24 ساعة',
      requestId: registration.id,
      status: registration.status
    });

  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في التسجيل'
    });
  }
};

// ============================================
// @desc    Login guide
// @route   POST /api/guides/login
// @access  Public
// ============================================
export const loginGuide = async (req, res) => {
  try {
    const { licenseNumber, email, password } = req.body;

    // Validate input
    if (!licenseNumber || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'الرجاء إدخال رقم الرخصة والبريد الإلكتروني وكلمة المرور'
      });
    }

    // Find guide
    const guideResult = await pool.query(
      `SELECT id, full_name, email, license_number, phone, rating, reviews,
              programs, verified, avatar, role, experience, specialties,
              program_location, program_location_name, password_hash,
              created_at, last_login
       FROM app.guides 
       WHERE license_number = $1 AND email = $2 AND is_active = true`,
      [licenseNumber, email]
    );

    if (guideResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'بيانات الدخول غير صحيحة'
      });
    }

    const guide = guideResult.rows[0];

    // Check password
    const isPasswordMatch = await bcrypt.compare(password, guide.password_hash);

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'بيانات الدخول غير صحيحة'
      });
    }

    // Update last login
    await pool.query(
      'UPDATE app.guides SET last_login = NOW() WHERE id = $1',
      [guide.id]
    );

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: guide.id, 
        type: 'guide',
        role: guide.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      success: true,
      user: {
        id: guide.id,
        name: guide.full_name,
        email: guide.email,
        licenseNumber: guide.license_number,
        phone: guide.phone,
        rating: parseFloat(guide.rating) || 0,
        reviews: guide.reviews || 0,
        programs: guide.programs || 0,
        verified: guide.verified,
        avatar: guide.avatar,
        role: guide.role,
        experience: guide.experience,
        specialties: guide.specialties,
        programLocation: guide.program_location,
        programLocationName: guide.program_location_name
      },
      token
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في تسجيل الدخول'
    });
  }
};

// ============================================
// @desc    Get guide profile
// @route   GET /api/guides/profile
// @access  Private
// ============================================
export const getGuideProfile = async (req, res) => {
  try {
    const guideResult = await pool.query(
      `SELECT id, full_name, email, license_number, phone, rating, reviews,
              programs, verified, avatar, experience, specialties,
              program_location, program_location_name, created_at, last_login
       FROM app.guides 
       WHERE id = $1`,
      [req.user.id]
    );

    if (guideResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'المرشد غير موجود'
      });
    }

    const guide = guideResult.rows[0];

    res.json({
      success: true,
      guide: {
        id: guide.id,
        fullName: guide.full_name,
        email: guide.email,
        licenseNumber: guide.license_number,
        phone: guide.phone,
        rating: parseFloat(guide.rating) || 0,
        reviews: guide.reviews || 0,
        programs: guide.programs || 0,
        verified: guide.verified,
        avatar: guide.avatar,
        experience: guide.experience,
        specialties: guide.specialties,
        programLocation: guide.program_location,
        programLocationName: guide.program_location_name,
        createdAt: guide.created_at,
        lastLogin: guide.last_login
      }
    });

  } catch (error) {
    console.error('❌ Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في تحميل الملف الشخصي'
    });
  }
};

// ============================================
// @desc    Update guide profile
// @route   PUT /api/guides/profile
// @access  Private
// ============================================
export const updateGuideProfile = async (req, res) => {
  try {
    const { phone, experience, specialties, programLocation, programLocationName } = req.body;

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (phone) {
      updates.push(`phone = $${paramIndex}`);
      values.push(phone);
      paramIndex++;
    }

    if (experience) {
      updates.push(`experience = $${paramIndex}`);
      values.push(experience);
      paramIndex++;
    }

    if (specialties) {
      updates.push(`specialties = $${paramIndex}`);
      values.push(specialties);
      paramIndex++;
    }

    if (programLocation) {
      updates.push(`program_location = $${paramIndex}`);
      values.push(programLocation);
      paramIndex++;
    }

    if (programLocationName) {
      updates.push(`program_location_name = $${paramIndex}`);
      values.push(programLocationName);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'لا توجد بيانات للتحديث'
      });
    }

    values.push(req.user.id);

    const updateResult = await pool.query(
      `UPDATE app.guides 
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex}
       RETURNING id, full_name, email, phone, experience, specialties,
                 program_location, program_location_name`,
      values
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'المرشد غير موجود'
      });
    }

    const guide = updateResult.rows[0];

    res.json({
      success: true,
      message: 'تم تحديث الملف الشخصي بنجاح',
      guide: {
        id: guide.id,
        fullName: guide.full_name,
        email: guide.email,
        phone: guide.phone,
        experience: guide.experience,
        specialties: guide.specialties,
        programLocation: guide.program_location,
        programLocationName: guide.program_location_name
      }
    });

  } catch (error) {
    console.error('❌ Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في تحديث الملف الشخصي'
    });
  }
};

// ============================================
// @desc    Change password
// @route   POST /api/guides/change-password
// @access  Private
// ============================================
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const guideResult = await pool.query(
      'SELECT id, password_hash FROM app.guides WHERE id = $1',
      [req.user.id]
    );

    if (guideResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'المرشد غير موجود'
      });
    }

    const guide = guideResult.rows[0];

    // Check current password
    const isPasswordMatch = await bcrypt.compare(currentPassword, guide.password_hash);

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'كلمة المرور الحالية غير صحيحة'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await pool.query(
      'UPDATE app.guides SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [hashedPassword, req.user.id]
    );

    res.json({
      success: true,
      message: 'تم تغيير كلمة المرور بنجاح'
    });

  } catch (error) {
    console.error('❌ Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في تغيير كلمة المرور'
    });
  }
};

// ============================================
// @desc    Approve guide registration (Admin only)
// @route   PUT /api/guides/approve/:registrationId
// @access  Private (Admin)
// ============================================
export const approveGuideRegistration = async (req, res) => {
  try {
    const { registrationId } = req.params;
    const adminId = req.user.id;

    // ✅ Get registration details - باستخدام guide_upgrade_requests
    const registrationResult = await pool.query(
      'SELECT * FROM app.guide_upgrade_requests WHERE id = $1 AND status = $2',
      [registrationId, 'pending']
    );

    if (registrationResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'طلب التسجيل غير موجود أو تمت معالجته مسبقاً'
      });
    }

    const registration = registrationResult.rows[0];

    // Start transaction
    await pool.query('BEGIN');

    // Hash a default password (user will change it on first login)
    const defaultPassword = await bcrypt.hash('Guide@123456', 10);

    // Create new guide
    const guideResult = await pool.query(
      `INSERT INTO app.guides (
        full_name, civil_id, license_number, email, phone,
        experience, specialties, password_hash, role, verified,
        is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      RETURNING id`,
      [
        registration.full_name,
        registration.civil_id,
        registration.license_number,
        registration.email,
        registration.phone,
        registration.experience,
        registration.specialties,
        defaultPassword,
        'guide',
        true,
        true
      ]
    );

    const newGuideId = guideResult.rows[0].id;

    // ✅ Update registration status - باستخدام guide_upgrade_requests
    await pool.query(
      `UPDATE app.guide_upgrade_requests 
       SET status = 'approved', processed_by = $1, processed_at = NOW()
       WHERE id = $2`,
      [adminId, registrationId]
    );

    await pool.query('COMMIT');

    // Send notification to the new guide
    await notificationService.sendToUser(registration.email, {
      type: 'GUIDE_APPROVED',
      title: 'تمت الموافقة على طلبك',
      message: 'تهانينا! تمت الموافقة على طلب تسجيلك كمرشد سياحي. يمكنك الآن تسجيل الدخول باستخدام كلمة المرور الافتراضية (Guide@123456) وسيطلب منك تغييرها عند أول دخول.'
    });

    res.json({
      success: true,
      message: 'تمت الموافقة على طلب التسجيل بنجاح',
      guideId: newGuideId
    });

  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('❌ Approve registration error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الموافقة على الطلب'
    });
  }
};

// ============================================
// @desc    Reject guide registration (Admin only)
// @route   PUT /api/guides/reject/:registrationId
// @access  Private (Admin)
// ============================================
export const rejectGuideRegistration = async (req, res) => {
  try {
    const { registrationId } = req.params;
    const { reason } = req.body;
    const adminId = req.user.id;

    // ✅ باستخدام guide_upgrade_requests
    const result = await pool.query(
      `UPDATE app.guide_upgrade_requests 
       SET status = 'rejected', 
           rejection_reason = $1,
           processed_by = $2, 
           processed_at = NOW()
       WHERE id = $3 AND status = 'pending'
       RETURNING email, full_name`,
      [reason, adminId, registrationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'طلب التسجيل غير موجود أو تمت معالجته مسبقاً'
      });
    }

    const registration = result.rows[0];

    // Send notification to the applicant
    await notificationService.sendToUser(registration.email, {
      type: 'GUIDE_REJECTED',
      title: 'نأسف، لم يتم الموافقة على طلبك',
      message: `لم يتم الموافقة على طلب تسجيلك كمرشد سياحي. سبب الرفض: ${reason}`
    });

    res.json({
      success: true,
      message: 'تم رفض طلب التسجيل'
    });

  } catch (error) {
    console.error('❌ Reject registration error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في رفض الطلب'
    });
  }
};

// ============================================
// @desc    Get pending registrations (Admin only)
// @route   GET /api/guides/pending-registrations
// @access  Private (Admin)
// ============================================
export const getPendingRegistrations = async (req, res) => {
  try {
    // ✅ باستخدام guide_upgrade_requests
    const registrations = await pool.query(
      `SELECT id, full_name, email, phone, civil_id, license_number,
              experience, specialties, created_at
       FROM app.guide_upgrade_requests
       WHERE status = 'pending'
       ORDER BY created_at DESC`
    );

    res.json({
      success: true,
      registrations: registrations.rows
    });

  } catch (error) {
    console.error('❌ Get pending registrations error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب الطلبات'
    });
  }
};

// ============================================
// ✅ تصدير جميع الدوال
// ============================================
export default {
  requestUpgrade,
  registerGuide,
  loginGuide,
  getGuideProfile,
  updateGuideProfile,
  changePassword,
  approveGuideRegistration,
  rejectGuideRegistration,
  getPendingRegistrations
};
