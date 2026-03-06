import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema({
  // المشاركون في المحادثة
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  
  // نوع المحادثة
  type: {
    type: String,
    enum: ['direct', 'group', 'support'],
    default: 'direct'
  },
  
  // اسم المجموعة (للمجموعات)
  groupName: String,
  
  // صورة المجموعة
  groupAvatar: String,
  
  // آخر رسالة
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  
  lastMessageAt: Date,
  
  // حالة المحادثة
  isActive: {
    type: Boolean,
    default: true
  },
  
  // للمجموعات: المشرفين
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // إعدادات المحادثة
  settings: {
    isMuted: { type: Boolean, default: false },
    muteUntil: Date,
    isPinned: { type: Boolean, default: false }
  },
  
  // إحصائيات
  stats: {
    totalMessages: { type: Number, default: 0 },
    unreadCount: { type: Number, default: 0 }
  },
  
  // الحجز المرتبط (إذا كانت محادثة حجز)
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// تحديث updatedAt
chatSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// الفهارس
chatSchema.index({ participants: 1 });
chatSchema.index({ lastMessageAt: -1 });
chatSchema.index({ type: 1 });
chatSchema.index({ bookingId: 1 });

const Chat = mongoose.model('Chat', chatSchema);

export default Chat;