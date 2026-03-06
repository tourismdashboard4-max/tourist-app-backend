import mongoose from 'mongoose';

const feeLogSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: true,
    index: true
  },
  
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // المبلغ الأصلي
  originalAmount: {
    type: Number,
    required: true
  },
  
  // تفاصيل الرسوم
  fees: {
    serviceFee: { type: Number, default: 0 },
    insuranceFee: { type: Number, default: 0 },
    commission: { type: Number, default: 0 },
    monthlyFee: { type: Number, default: 0 },
    withdrawFee: { type: Number, default: 0 },
    depositFee: { type: Number, default: 0 },
    refundFee: { type: Number, default: 0 },
    vat: { type: Number, default: 0 },
    totalFees: { type: Number, default: 0 }
  },
  
  // تفاصيل إضافية
  breakdown: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // تاريخ الخصم
  deductedAt: {
    type: Date,
    default: Date.now
  },
  
  // الحالة
  status: {
    type: String,
    enum: ['SUCCESS', 'FAILED', 'PENDING'],
    default: 'PENDING'
  },
  
  error: String,
  
  metadata: mongoose.Schema.Types.Mixed
}, {
  timestamps: true
});

// الفهارس
feeLogSchema.index({ userId: 1, deductedAt: -1 });
feeLogSchema.index({ status: 1 });
feeLogSchema.index({ deductedAt: 1 });

const FeeLog = mongoose.model('FeeLog', feeLogSchema);

export default FeeLog;