import mongoose from 'mongoose';
import jwt from 'jsonwebtoken'; // Importer jsonwebtoken

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  profilePicture: { type: String, default: '' }, // Nouveau champ pour l'URL de la photo de profil
  role: { type: String, enum: ['apprenant', 'staff', 'admin'], default: 'apprenant' },
  status: { type: String, enum: ['active', 'blocked'], default: 'active' },
  lastLogin: { type: Date, default: Date.now },
  daysRemaining: { type: Number, default: 365 },
  level: { type: Number, default: 1 },
  peers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  badges: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Badge' }],
  totalProjectsCompleted: { type: Number, default: 0 },
  projects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }], // Ajout du champ projects
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  googleId: { type: String, unique: true, sparse: true }, // Pour l'authentification Google
  githubId: { type: String, unique: true, sparse: true }, // Pour l'authentification GitHub
}, { timestamps: true });

  // Méthode pour générer un jeton d'authentification
userSchema.methods.generateAuthToken = function() {
  const token = jwt.sign({ id: this._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  return token;
};

export default mongoose.model('User', userSchema);
