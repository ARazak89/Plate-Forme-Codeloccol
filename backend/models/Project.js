import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    repoUrl: { type: String, required: false }, // repoUrl devient optionnel pour les projets templates
    demoVideoUrl: String, // Nouvelle URL pour la vidéo de démonstration
    specifications: String, // Nouvelles spécifications textuelles
    submissionDate: { type: Date }, // Date de soumission devient optionnelle
    status: {
      type: String,
      enum: [
        "assigned",
        "pending",
        "approved",
        "rejected",
        "awaiting_staff_review",
        "template",
      ],
      default: "assigned",
    }, // Nouveau statut 'awaiting_staff_review' et 'template'
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    }, // student devient optionnel pour les templates
    templateProject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: false,
    }, // Référence au projet template d'origine
    order: { type: Number, required: false }, // Ordre du projet dans le cursus (pour les templates)
    exerciseStatements: [{ type: String }], // Nouveau champ pour les énoncés d'exercice (tableau de chaînes)
    peerEvaluators: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    staffValidator: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    size: { type: String, enum: ["short", "medium", "long"], default: "short" }, // for +1/+2/+3 days
  },
  { timestamps: true },
);

export default mongoose.model("Project", projectSchema);
