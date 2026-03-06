import mongoose from 'mongoose';

const withdrawRequestSchema = new mongoose.Schema({
  requestId: {
    type: String,
    required: true,
    unique: true
  },
  
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  walletId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wallet',
    required: true
  },
  
  bankAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BankAccount',
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
  
  // الحالة
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'PROCESSING', 'COMPLETED', 'FAILED'],
    default: 'PENDING'
  },
  
  // تفاصيل المعالجة
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  processedAt: Date,
  rejectionReason: String,
  
  // المعاملة المرتبطة
  transactionId: {
    type: String,
    ref: 'Transaction'
  },
  
  // ملاحظات
  notes: String,
  
  // تفاصيل إضافية
  metadata: mongoose.Schema.Types.Mixed,
  
  createdAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// الفهارس
withdrawRequestSchema.index({ requestId: 1 });
withdrawRequestSchema.index({ userId: 1, status: 1 });
withdrawRequestSchema.index({ status: 1, createdAt: -1 });

const WithdrawRequest = mongoose.model('WithdrawRequest', withdrawRequestSchema);

export default WithdrawRequest;