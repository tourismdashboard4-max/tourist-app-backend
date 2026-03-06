const mongoose = require('mongoose');

const chatRoomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true
  },
  
  // نوع الغرفة
  type: {
    type: String,
    enum: ['booking', 'support', 'general'],
    required: true
  },
  
  // المشاركون
  participants: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    joinedAt: { type: Date, default: Date.now },
    lastReadAt: Date,
    isActive: { type: Boolean, default: true }
  }],
  
  // معلومات الغرفة
  name: String,
  description: String,
  
  // الحجز المرتبط
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  },
  
  // إعدادات الغرفة
  settings: {
    isPrivate: { type: Boolean, default: false },
    allowFiles: { type: Boolean, default: true },
    maxParticipants: { type: Number, default: 50 }
  },
  
  // آخر نشاط
  lastActivity: Date,
  
  // حالة الغرفة
  status: {
    type: String,
    enum: ['active', 'archived', 'closed'],
    default: 'active'
  },
  
  // إحصائيات
  stats: {
    totalMessages: { type: Number, default: 0 },
    totalParticipants: { type: Number, default: 0 }
  },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  closedAt: Date
}, {
  timestamps: true
});

// تحديث updatedAt
chatRoomSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// الفهارس
chatRoomSchema.index({ roomId: 1 });
chatRoomSchema.index({ 'participants.userId': 1 });
chatRoomSchema.index({ type: 1 });
chatRoomSchema.index({ bookingId: 1 });
chatRoomSchema.index({ lastActivity: -1 });

module.exports = mongoose.model('ChatRoom', chatRoomSchema);