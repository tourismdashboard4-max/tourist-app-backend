const mongoose = require('mongoose');

const programSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'اسم البرنامج مطلوب'],
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  guideId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Guide',
    required: true
  },
  guideName: {
    type: String,
    required: true
  },
  location: {
    type: [Number],
    required: true
  },
  locationName: {
    type: String,
    default: ''
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  duration: {
    type: String,
    required: true
  },
  maxParticipants: {
    type: Number,
    default: 20
  },
  participants: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  rating: {
    type: Number,
    default: 4.5
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Program', programSchema);