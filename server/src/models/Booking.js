const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  bookingId: {
    type: String,
    required: true,
    unique: true
  },
  
  // الأطراف
  touristId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  guideId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  programId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GuideProgram',
    required: true
  },
  
  // الأسعار
  guidePrice: {
    type: Number,
    required: true
  },
  
  commission: {
    type: Number,
    required: true
  },
  
  totalPrice: {
    type: Number,
    required: true
  },
  
  // تفاصيل الرسوم
  feeBreakdown: {
    platform: { type: Number, required: true },
    booking: { type: Number, required: true },
    map: { type: Number, required: true },
    payment: { type: Number, required: true },
    dispute: { type: Number, required: true }
  },
  
  // الحالة
  status: {
    type: String,
    enum: ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REJECTED'],
    default: 'PENDING'
  },
  
  // طريقة الدفع
  paymentMethod: {
    type: String,
    enum: ['WALLET', 'CASH', 'CARD'],
    required: true
  },
  
  // تفاصيل الحجز
  bookingDate: {
    type: Date,
    required: true
  },
  
  startTime: Date,
  endTime: Date,
  
  location: {
    type: String,
    required: true
  },
  
  duration: Number,
  
  // عدد المشاركين
  participants: {
    type: Number,
    default: 1
  },
  
  // ملاحظات
  notes: String,
  
  // إلغاء
  cancellation: {
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cancelledAt: Date,
    reason: String,
    refundAmount: Number
  },
  
  // تقييم
  review: {
    rating: Number,
    comment: String,
    createdAt: Date
  },
  
  // إشعارات
  notifications: [{
    type: String,
    message: String,
    sentAt: { type: Date, default: Date.now }
  }],
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// الفهارس
bookingSchema.index({ bookingId: 1 });
bookingSchema.index({ touristId: 1, status: 1 });
bookingSchema.index({ guideId: 1, status: 1 });
bookingSchema.index({ programId: 1 });
bookingSchema.index({ bookingDate: -1 });

module.exports = mongoose.model('Booking', bookingSchema);