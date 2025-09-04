import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['apprenant', 'staff', 'admin', 'evaluator'], default: 'apprenant' },
  projects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }],
  badges: [{ type: String }], // Simplified for this example
  lastLogin: { type: Date },
  level: { type: Number, default: 1 },
  profilePicture: { type: String, default: '' },
  status: { type: String, default: 'active' },
  totalProjectsCompleted: { type: Number, default: 0 },
  daysRemaining: { type: Number, default: 0 },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
export default User;
