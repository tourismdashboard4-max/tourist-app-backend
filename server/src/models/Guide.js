// ============================================
// Guide Model - المرشد السياحي
// ============================================
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const guideSchema = new mongoose.Schema({
  // ============================================
  // 📋 المعلومات الأساسية
  // ============================================
  fullName: {
    type: String,
    required: [true, 'الاسم الكامل مطلوب'],
    trim: true,
    minlength: [3, 'الاسم يجب أن يكون 3 أحرف على الأقل'],
    maxlength: [50, 'الاسم يجب أن لا يتجاوز 50 حرف']
  },
  
  email: {
    type: String,
    required: [true, 'البريد الإلكتروني مطلوب'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'البريد الإلكتروني غير صحيح']
  },
  
  password: {
    type: String,
    required: [true, 'كلمة المرور مطلوبة'],
    minlength: [6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'],
    select: false
  },
  
  phone: {
    type: String,
    required: [true, 'رقم الجوال مطلوب'],
    trim: true,
    match: [/^(05|\+9665)[0-9]{8}$/, 'رقم الجوال غير صحيح']
  },
  
  avatar: {
    type: String,
    default: function() {
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(this.fullName)}&background=10b981&color=fff&size=200`;
    }
  },

  // ============================================
  // 🆔 الوثائق الرسمية
  // ============================================
  civilId: {
    type: String,
    required: [true, 'رقم الهوية مطلوب'],
    unique: true,
    trim: true,
    match: [/^\d{10}$/, 'رقم الهوية يجب أن يكون 10 أرقام']
  },
  
  licenseNumber: {
    type: String,
    required: [true, 'رقم الرخصة مطلوب'],
    unique: true,
    trim: true,
    match: [/^[A-Z]{3}-\d{4}-\d{4}$/, 'صيغة الرخصة غير صحيحة (مثال: TRL-1234-5678)']
  },
  
  licenseFile: {
    type: String,
    default: null
  },

  // ============================================
  // 📍 معلومات الموقع
  // ============================================
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [46.713, 24.774]
    }
  },
  
  locationName: {
    type: String,
    default: ''
  },
  
  locationMap: {
    type: String,
    default: null
  },

  // ============================================
  // 💼 المعلومات المهنية
  // ============================================
  experience: {
    type: Number,
    default: 0,
    min: 0,
    max: 50
  },
  
  specialties: [{
    type: String,
    enum: ['تاريخ', 'تراث', 'طبيعة', 'مغامرات', 'تخييم', 'تسوق', 'ترفيه', 'ديني', 'ثقافي', 'رياضي']
  }],
  
  languages: [{
    type: String,
    enum: ['العربية', 'الإنجليزية', 'الفرنسية', 'الألمانية', 'الإسبانية', 'الصينية', 'الأوردو', 'الفارسية'],
    default: ['العربية', 'الإنجليزية']
  }],

  // ============================================
  // ⭐ التقييمات
  // ============================================
  rating: {
    type: Number,
    default: 4.5,
    min: 0,
    max: 5
  },
  
  reviewsCount: {
    type: Number,
    default: 0
  },
  
  totalBookings: {
    type: Number,
    default: 0
  },

  // ============================================
  // ✅ حالة المرشد
  // ============================================
  verified: {
    type: Boolean,
    default: false
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  
  rejectionReason: {
    type: String,
    default: null
  },

  // ============================================
  // 💰 المعلومات المالية
  // ============================================
  bankAccount: {
    bankName: String,
    accountNumber: String,
    iban: String,
    accountHolder: String
  },
  
  pricing: {
    hourlyRate: { type: Number, default: 100 },
    dailyRate: { type: Number, default: 500 },
    groupDiscount: { type: Number, default: 0 }
  },

  // ============================================
  // 📊 إحصائيات
  // ============================================
  lastLogin: {
    type: Date,
    default: Date.now
  },
  
  joinedAt: {
    type: Date,
    default: Date.now
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ============================================
// Virtual Fields
// ============================================
guideSchema.virtual('programs', {
  ref: 'Program',
  localField: '_id',
  foreignField: 'guideId'
});

guideSchema.virtual('completedTours').get(function() {
  return this.totalBookings || 0;
});

guideSchema.virtual('successRate').get(function() {
  if (!this.totalBookings) return '0%';
  return `${Math.round((this.reviewsCount / this.totalBookings) * 100)}%`;
});

// ============================================
// Indexes
// ============================================
guideSchema.index({ location: '2dsphere' });
guideSchema.index({ email: 1, licenseNumber: 1 });
guideSchema.index({ status: 1, verified: 1 });
guideSchema.index({ rating: -1 });

// ============================================
// Middleware
// ============================================
guideSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// ============================================
// Methods
// ============================================
guideSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

guideSchema.methods.approve = async function() {
  this.status = 'approved';
  this.verified = true;
  this.isActive = true;
  await this.save();
  return this;
};

guideSchema.methods.reject = async function(reason) {
  this.status = 'rejected';
  this.verified = false;
  this.isActive = false;
  this.rejectionReason = reason;
  await this.save();
  return this;
};

guideSchema.methods.updateRating = async function(newRating) {
  const total = this.rating * this.reviewsCount + newRating;
  this.reviewsCount += 1;
  this.rating = (total / this.reviewsCount).toFixed(1);
  await this.save();
  return this.rating;
};

guideSchema.methods.incrementBookings = async function() {
  this.totalBookings += 1;
  await this.save();
  return this.totalBookings;
};

// ============================================
// Statics
// ============================================
guideSchema.statics.findByLicense = function(licenseNumber) {
  return this.findOne({ licenseNumber });
};

guideSchema.statics.findApproved = function() {
  return this.find({ status: 'approved', verified: true, isActive: true });
};

guideSchema.statics.findNearby = function(coordinates, maxDistance = 10000) {
  return this.find({
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: coordinates
        },
        $maxDistance: maxDistance
      }
    },
    status: 'approved',
    verified: true,
    isActive: true
  });
};

module.exports = mongoose.model('Guide', guideSchema);