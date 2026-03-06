import mongoose from 'mongoose';

const bankAccountSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // معلومات البنك
  bankName: {
    type: String,
    required: true
  },
  
  accountNumber: {
    type: String,
    required: true
  },
  
  iban: {
    type: String,
    required: true,
    unique: true
  },
  
  accountHolder: {
    type: String,
    required: true
  },
  
  // حالة الحساب
  isVerified: {
    type: Boolean,
    default: false
  },
  
  isDefault: {
    type: Boolean,
    default: false
  },
  
  // تفاصيل التحقق
  verificationDetails: {
    verifiedAt: Date,
    verificationMethod: String,
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  
  // وثيقة إثبات الحساب
  documentUrl: String,
  
  metadata: mongoose.Schema.Types.Mixed,
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// تحديث updatedAt
bankAccountSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// الفهارس
bankAccountSchema.index({ userId: 1 });
bankAccountSchema.index({ iban: 1 });
bankAccountSchema.index({ isDefault: 1 });

const BankAccount = mongoose.model('BankAccount', bankAccountSchema);

export default BankAccount;