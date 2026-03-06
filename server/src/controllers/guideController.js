const Guide = require('../models/Guide');
const GuideRegistration = require('../models/GuideRegistration');
const Program = require('../models/Program');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');

// ============================================
// @desc    Register a new guide (pending approval)
// @route   POST /api/guides/register
// @access  Public
// ============================================
const registerGuide = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { civilId, licenseNumber, email } = req.body;

    // Check if already exists in approved guides
    const existingGuide = await Guide.findOne({
      $or: [{ civilId }, { licenseNumber }, { email }]
    });

    if (existingGuide) {
      return res.status(400).json({
        success: false,
        message: 'هذا المرشد مسجل بالفعل في النظام'
      });
    }

    // Check if already has pending registration
    const existingRegistration = await GuideRegistration.findOne({
      $or: [{ civilId }, { licenseNumber }, { email }],
      status: 'pending'
    });

    if (existingRegistration) {
      return res.status(400).json({
        success: false,
        message: 'لديك طلب تسجيل قيد المراجعة بالفعل'
      });
    }

    // Create new registration
    const registration = new GuideRegistration({
      ...req.body,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    await registration.save();

    // TODO: Send email notification to admin

    res.status(201).json({
      success: true,
      message: 'تم إرسال طلب التسجيل بنجاح، سيتم مراجعته من قبل الإدارة خلال 24 ساعة',
      requestId: registration._id,
      status: registration.status
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في التسجيل',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// @desc    Login guide
// @route   POST /api/guides/login
// @access  Public
// ============================================
const loginGuide = async (req, res) => {
  try {
    const { licenseNumber, email, password } = req.body;

    // Validate input
    if (!licenseNumber || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'الرجاء إدخال رقم الرخصة والبريد الإلكتروني وكلمة المرور'
      });
    }

    // Find guide with password field
    const guide = await Guide.findOne({ 
      licenseNumber, 
      email,
      isActive: true 
    }).select('+password');

    if (!guide) {
      return res.status(401).json({
        success: false,
        message: 'بيانات الدخول غير صحيحة'
      });
    }

    // Check password
    const isPasswordMatch = await guide.comparePassword(password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'بيانات الدخول غير صحيحة'
      });
    }

    // Update last login
    guide.lastLogin = Date.now();
    await guide.save({ validateBeforeSave: false });

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: guide._id, 
        type: 'guide',
        role: guide.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Generate refresh token
    const refreshToken = jwt.sign(
      { id: guide._id },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
    );

    res.json({
      success: true,
      user: {
        id: guide._id,
        name: guide.fullName,
        email: guide.email,
        licenseNumber: guide.licenseNumber,
        phone: guide.phone,
        rating: guide.rating,
        reviews: guide.reviews,
        programs: guide.programs,
        verified: guide.verified,
        avatar: guide.avatar,
        role: guide.role,
        experience: guide.experience,
        specialties: guide.specialties,
        programLocation: guide.programLocation,
        programLocationName: guide.programLocationName
      },
      token,
      refreshToken
    });

  } catch (error) {
    console.error('Login error:', error);
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
const getGuideProfile = async (req, res) => {
  try {
    const guide = await Guide.findById(req.user.id);

    if (!guide) {
      return res.status(404).json({
        success: false,
        message: 'المرشد غير موجود'
      });
    }

    res.json({
      success: true,
      guide: {
        id: guide._id,
        fullName: guide.fullName,
        email: guide.email,
        licenseNumber: guide.licenseNumber,
        phone: guide.phone,
        rating: guide.rating,
        reviews: guide.reviews,
        programs: guide.programs,
        verified: guide.verified,
        avatar: guide.avatar,
        experience: guide.experience,
        specialties: guide.specialties,
        programLocation: guide.programLocation,
        programLocationName: guide.programLocationName,
        createdAt: guide.createdAt,
        lastLogin: guide.lastLogin
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
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
const updateGuideProfile = async (req, res) => {
  try {
    const { phone, experience, specialties, programLocation, programLocationName } = req.body;

    const guide = await Guide.findById(req.user.id);

    if (!guide) {
      return res.status(404).json({
        success: false,
        message: 'المرشد غير موجود'
      });
    }

    // Update fields
    if (phone) guide.phone = phone;
    if (experience) guide.experience = experience;
    if (specialties) guide.specialties = specialties;
    if (programLocation) guide.programLocation = programLocation;
    if (programLocationName) guide.programLocationName = programLocationName;

    await guide.save();

    res.json({
      success: true,
      message: 'تم تحديث الملف الشخصي بنجاح',
      guide: {
        id: guide._id,
        fullName: guide.fullName,
        email: guide.email,
        phone: guide.phone,
        experience: guide.experience,
        specialties: guide.specialties,
        programLocation: guide.programLocation,
        programLocationName: guide.programLocationName
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في تحديث الملف الشخصي'
    });
  }
};

// ============================================
// @desc    Create demo guide (for testing)
// @route   POST /api/guides/create-demo
// @access  Public
// ============================================
const createDemoGuide = async (req, res) => {
  try {
    const demoGuides = [
      {
        fullName: 'محمد العتيبي',
        civilId: '1234567890',
        licenseNumber: 'TRL-1234-5678',
        email: 'mohammed@example.com',
        phone: '+966500000001',
        password: 'Guide1234',
        experience: '5',
        specialties: 'تاريخ، تراث',
        programLocation: 'https://maps.app.goo.gl/abc123',
        programLocationName: 'الدرعية التاريخية',
        rating: 4.9,
        reviews: 24,
        programs: 5,
        verified: true
      },
      {
        fullName: 'العنود نسيب',
        civilId: '1234567891',
        licenseNumber: 'TRL-8765-4321',
        email: 'alanoud@example.com',
        phone: '+966500000002',
        password: 'Guide1234',
        experience: '3',
        specialties: 'طبيعة، مغامرات، تخييم',
        programLocation: 'https://maps.app.goo.gl/def456',
        programLocationName: 'منتزه السلام',
        rating: 4.8,
        reviews: 31,
        programs: 7,
        verified: true
      },
      {
        fullName: 'أميرة الحربي',
        civilId: '1234567892',
        licenseNumber: 'TRL-5678-1234',
        email: 'amira@example.com',
        phone: '+966500000003',
        password: 'Guide1234',
        experience: '2',
        specialties: 'طبيعة، مغامرات',
        programLocation: 'https://maps.app.goo.gl/ghi789',
        programLocationName: 'جبال طويق',
        rating: 4.7,
        reviews: 18,
        programs: 3,
        verified: true
      }
    ];

    const results = [];

    for (const demoGuide of demoGuides) {
      // Check if exists
      const existing = await Guide.findOne({
        $or: [
          { licenseNumber: demoGuide.licenseNumber },
          { email: demoGuide.email }
        ]
      });

      if (!existing) {
        const guide = new Guide(demoGuide);
        await guide.save();
        results.push({ name: demoGuide.fullName, status: 'created' });
      } else {
        results.push({ name: demoGuide.fullName, status: 'already exists' });
      }
    }

    res.json({
      success: true,
      message: 'تم إنشاء المرشدين التجريبيين',
      results
    });

  } catch (error) {
    console.error('Create demo guides error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================
// @desc    Refresh token
// @route   POST /api/guides/refresh-token
// @access  Public
// ============================================
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token مطلوب'
      });
    }

    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
    );

    const guide = await Guide.findById(decoded.id);

    if (!guide) {
      return res.status(401).json({
        success: false,
        message: 'المرشد غير موجود'
      });
    }

    const newToken = jwt.sign(
      { id: guide._id, type: 'guide', role: guide.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      success: true,
      token: newToken
    });

  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({
      success: false,
      message: 'Refresh token غير صالح'
    });
  }
};

// ============================================
// @desc    Change password
// @route   POST /api/guides/change-password
// @access  Private
// ============================================
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const guide = await Guide.findById(req.user.id).select('+password');

    if (!guide) {
      return res.status(404).json({
        success: false,
        message: 'المرشد غير موجود'
      });
    }

    // Check current password
    const isPasswordMatch = await guide.comparePassword(currentPassword);

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'كلمة المرور الحالية غير صحيحة'
      });
    }

    // Update password
    guide.password = newPassword;
    await guide.save();

    res.json({
      success: true,
      message: 'تم تغيير كلمة المرور بنجاح'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في تغيير كلمة المرور'
    });
  }
};

module.exports = {
  registerGuide,
  loginGuide,
  getGuideProfile,
  updateGuideProfile,
  createDemoGuide,
  refreshToken,
  changePassword
};
