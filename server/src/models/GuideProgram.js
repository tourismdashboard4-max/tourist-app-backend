const mongoose = require('mongoose');

const guideProgramSchema = new mongoose.Schema({
  guideId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // نوع البرنامج
  programId: {
    type: String,
    enum: ['basic', 'premium', 'enterprise'],
    required: true
  },
  
  // السعر
  guidePrice: {
    type: Number,
    required: true,
    min: 25
  },
  
  // الأسعار المحسوبة
  calculatedPrices: {
    displayedPrice: { type: Number, required: true },
    commission: { type: Number, required: true },
    actualPrice: { type: Number, required: true },
    commissionRate: { type: Number, default: 2.5 }
  },
  
  // تفاصيل البرنامج
  title: {
    type: String,
    required: true
  },
  
  description: {
    type: String,
    required: true
  },
  
  location: {
    city: String,
    area: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  
  duration: {
    type: Number, // بالساعات
    required: true
  },
  
  maxParticipants: {
    type: Number,
    default: 10
  },
  
  // الوسائط
  images: [String],
  
  // الحالة
  isActive: {
    type: Boolean,
    default: true
  },
  
  // إحصائيات
  stats: {
    totalBookings: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    totalCommission: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    reviewsCount: { type: Number, default: 0 }
  },
  
  // التواريخ
  startDate: Date,
  endDate: Date,
  lastPriceUpdate: { type: Date, default: Date.now },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// تحديث updatedAt
guideProgramSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// الفهارس
guideProgramSchema.index({ guideId: 1, programId: 1 }, { unique: true });
guideProgramSchema.index({ isActive: 1 });
guideProgramSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('GuideProgram', guideProgramSchema);