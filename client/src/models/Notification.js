const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  type: {
    type: String,
    enum: [
      'booking',
      'booking_confirmed',
      'booking_cancelled',
      'booking_completed',
      'message',
      'payment',
      'wallet_credited',
      'withdraw_request',
      'withdraw_approved',
      'withdraw_rejected',
      'review',
      'system',
      'warning',
      'suspension'
    ],
    required: true
  },

  title: {
    type: String,
    required: true
  },

  message: {
    type: String,
    required: true
  },

  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  read: {
    type: Boolean,
    default: false,
    index: true
  },

  readAt: Date,

  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },

  link: String,

  expiresAt: Date,

  metadata: mongoose.Schema.Types.Mixed
}, {
  timestamps: true
});

// Indexes for better query performance
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, read: 1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 }); // Auto-delete after 30 days

// Mark as read
notificationSchema.methods.markAsRead = function() {
  this.read = true;
  this.readAt = new Date();
  return this.save();
};

// Static method to create notification
notificationSchema.statics.createNotification = async function(data) {
  const notification = new this(data);
  await notification.save();
  
  // Emit socket event for real-time notification
  const socketService = require('../services/socketService');
  socketService.emitToUser(data.userId, 'new-notification', notification);
  
  return notification;
};

// Static method to mark all as read
notificationSchema.statics.markAllAsRead = async function(userId) {
  return this.updateMany(
    { userId, read: false },
    { read: true, readAt: new Date() }
  );
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = async function(userId) {
  return this.countDocuments({ userId, read: false });
};

module.exports = mongoose.model('Notification', notificationSchema);