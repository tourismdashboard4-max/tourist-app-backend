import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  messageId: {
    type: String,
    required: true,
    unique: true
  },
  
  // المحادثة
  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true
  },
  
  // المرسل
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // نوع الرسالة
  type: {
    type: String,
    enum: ['text', 'image', 'file', 'voice', 'location', 'system'],
    default: 'text'
  },
  
  // محتوى الرسالة
  content: {
    type: String,
    required: function() {
      return this.type === 'text';
    }
  },
  
  // المرفقات
  attachments: [{
    url: String,
    type: String,
    name: String,
    size: Number
  }],
  
  // الموقع
  location: {
    lat: Number,
    lng: Number,
    address: String
  },
  
  // الرد على رسالة
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  
  // الحالة
  status: {
    type: String,
    enum: ['sending', 'sent', 'delivered', 'read', 'failed'],
    default: 'sent'
  },
  
  // للمجموعات: تمت قراءتها من قبل
  readBy: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    readAt: Date
  }],
  
  // التفاعلات
  reactions: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    emoji: String,
    createdAt: { type: Date, default: Date.now }
  }],
  
  // تم التعديل
  edited: {
    type: Boolean,
    default: false
  },
  
  editedAt: Date,
  
  // تم الحذف
  isDeleted: {
    type: Boolean,
    default: false
  },
  
  deletedFor: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // رسالة نظام
  systemMessage: {
    type: {
      type: String,
      enum: ['join', 'leave', 'create', 'update']
    },
    targetUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// تحديث updatedAt
messageSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// الفهارس
messageSchema.index({ messageId: 1 });
messageSchema.index({ chatId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1 });
messageSchema.index({ status: 1 });

const Message = mongoose.model('Message', messageSchema);

export default Message;