import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true }, // Peut être n'importe quel type de données
  description: String,
}, { timestamps: true });

export default mongoose.model('Setting', settingsSchema);
