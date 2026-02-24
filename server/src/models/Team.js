import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['leader', 'member']
    }
  }],
  type: {
    type: String,
    enum: ['rescue', 'medical', 'firefighting', 'logistics', 'other'],
    required: true
  },
  active: {
    type: Boolean,
    default: true
  },
  location: {
    province: String,
    district: String
  }
}, {
  timestamps: true
});

export default mongoose.model('Team', teamSchema);
