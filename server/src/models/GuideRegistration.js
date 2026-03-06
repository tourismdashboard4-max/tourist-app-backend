// ============================================
// GuideRegistration Model - طلبات تسجيل المرشدين
// ============================================
const mongoose = require('mongoose');

const guideRegistrationSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'الاسم الكامل مطلوب'],
    trim: true
  },
  
  civilId: {
    type: String,
    required: [true, 'رقم الهوية مطلوب'],
    unique: true,
    trim: true
  },
  
  licenseNumber: {
    type: String,
    required: [true, 'رقم الرخصة مطلوب'],
    unique: true,
    trim: true
  },
  
  email: {
    type: String,
    required: [true, 'البريد الإلكتروني مطلوب'],
    unique: true,
    lowercase: true,
    trim: true
  },
  
  phone: {
    type: String,
    required: [true, 'رقم الجوال مطلوب'],
    trim: true
  },
  
  experience: {
    type: String,
    default: ''
  },
  
  specialties: {
    type: String,
    default: ''
  },
  
  programLocation: {
    type: String,
    default: null
  },
  
  programLocationName: {
    type: String,
    default: ''
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
  
  reviewedAt: {
    type: Date,
    default: null
  },
  
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  
  ipAddress: String,
  userAgent: String,
  submittedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('GuideRegistration', guideRegistrationSchema);