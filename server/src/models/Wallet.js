import mongoose from 'mongoose';

const walletSchema = new mongoose.Schema({
  // رقم المحفظة الفريد
  walletNumber: {
    type: String,
    required: true,
    unique: true
  },
  
  // المستخدم صاحب المحفظة
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  
  // نوع المستخدم
  userType: {
    type: String,
    enum: ['tourist', 'guide'],
    required: true
  },
  
  // الأرصدة
  balance: {
    type: Number,
    default: 0,
    min: 0
  },
  
  frozenBalance: {
    type: Number,
    default: 0
  },
  
  pendingBalance: {
    type: Number,
    default: 0
  },
  
  // العملة
  currency: {
    type: String,
    default: 'SAR'
  },
  
  // حالة المحفظة
  status: {
    type: String,
    enum: ['active', 'suspended', 'closed'],
    default: 'active'
  },
  
  // حدود المعاملات
  dailyLimit: {
    type: Number,
    default: 5000
  },
  
  monthlyLimit: {
    type: Number,
    default: 25000
  },
  
  dailyWithdrawn: {
    type: Number,
    default: 0
  },
  
  monthlyWithdrawn: {
    type: Number,
    default: 0
  },
  
  lastWithdrawDate: Date,
  
  // إحصائيات
  stats: {
    totalDeposits: { type: Number, default: 0 },
    totalWithdrawals: { type: Number, default: 0 },
    totalBookings: { type: Number, default: 0 },
    totalFees: { type: Number, default: 0 },
    lastActivity: Date
  },
  
  // برنامج المرشد (للمرشدين فقط)
  program: {
    type: {
      type: String,
      enum: ['basic', 'premium', 'enterprise'],
      default: 'basic'
    },
    startDate: Date,
    nextBillingDate: Date,
    autoRenew: { type: Boolean, default: true }
  },
  
  // تاريخ الإيقاف
  suspendedAt: Date,
  suspensionReason: String,
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// تحديث updatedAt
walletSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// الفهارس
walletSchema.index({ walletNumber: 1 });
walletSchema.index({ userId: 1 });
walletSchema.index({ userType: 1 });
walletSchema.index({ status: 1 });

const Wallet = mongoose.model('Wallet', walletSchema);

export default Wallet;