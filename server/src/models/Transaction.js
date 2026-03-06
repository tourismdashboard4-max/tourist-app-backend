import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  // معرف المعاملة
  transactionId: {
    type: String,
    required: true,
    unique: true
  },
  
  // المحفظة
  walletId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wallet',
    required: true
  },
  
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // نوع المعاملة
  type: {
    type: String,
    enum: [
      'DEPOSIT', 'WITHDRAW', 'BOOKING', 'REFUND', 
      'FEE', 'HOLD', 'RELEASE', 'EARNING', 'COMMISSION'
    ],
    required: true
  },
  
  // المبالغ
  amount: {
    type: Number,
    required: true
  },
  
  fee: {
    type: Number,
    default: 0
  },
  
  netAmount: {
    type: Number
  },
  
  currency: {
    type: String,
    default: 'SAR'
  },
  
  // الحالة
  status: {
    type: String,
    enum: ['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED'],
    default: 'PENDING'
  },
  
  // الوصف
  description: String,
  
  // المرجع (رقم الحجز أو العملية المرتبطة)
  referenceId: String,
  
  // الرصيد بعد المعاملة
  balanceAfter: Number,
  
  // طريقة الدفع
  paymentMethod: String,
  
  // تفاصيل إضافية
  paymentDetails: mongoose.Schema.Types.Mixed,
  
  metadata: mongoose.Schema.Types.Mixed,
  
  // التواريخ
  createdAt: { type: Date, default: Date.now },
  processedAt: Date
}, {
  timestamps: true
});

// الفهارس
transactionSchema.index({ transactionId: 1 });
transactionSchema.index({ walletId: 1, createdAt: -1 });
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ referenceId: 1 });
transactionSchema.index({ type: 1, status: 1 });

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;