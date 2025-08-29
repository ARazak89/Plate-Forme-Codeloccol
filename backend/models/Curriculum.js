import mongoose from 'mongoose';

const curriculumSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: String,
  modules: [{
    title: String,
    resources: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Resource' }], // Référence à un futur modèle de ressources
    projects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }],
  }],
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Étudiants assignés à ce parcours
}, { timestamps: true });

export default mongoose.model('Curriculum', curriculumSchema);
