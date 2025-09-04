import mongoose from 'mongoose';

const assignmentSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['assigned', 'submitted', 'pending_review', 'approved', 'rejected'], default: 'assigned' },
  repoUrl: { type: String, default: '' },
  submissionDate: { type: Date },
  evaluations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Evaluation' }], // Référence aux évaluations spécifiques à cette assignation
  peerEvaluators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Pairs évaluateurs pour cette assignation
  staffValidator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Validateur staff pour cette assignation
}, { timestamps: true });

const projectSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  specifications: [{ type: String }],
  objectives: [{ type: String }],
  exerciseStatements: [{ type: String }],
  resourceLinks: [{ type: String }],
  demoVideoUrl: { type: String },
  size: { type: String, enum: ['short', 'medium', 'long'], default: 'short' },
  status: { type: String, enum: ['template', 'active', 'archived'], default: 'template' },
  order: { type: Number, default: 0 },
  assignments: [assignmentSchema], // Tableau d'assignations pour les apprenants
}, { timestamps: true });

const Project = mongoose.model('Project', projectSchema);
export default Project;
