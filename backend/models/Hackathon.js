import mongoose from 'mongoose';

const hackathonSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  projects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }],
  status: { type: String, enum: ['active', 'finished', 'evaluated'], default: 'active' },
  rankings: [{
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    score: Number,
  }],
}, { timestamps: true });

export default mongoose.model('Hackathon', hackathonSchema);
