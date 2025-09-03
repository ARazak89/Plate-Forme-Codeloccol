import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    objectives: [{ type: String }], // Nouveau champ pour les objectifs (tableau de chaînes)
    description: String,
    demoVideoUrl: String, // Nouvelle URL pour la vidéo de démonstration
    specifications: [{ type: String }], // Nouvelles spécifications textuelles (passé de String à [String])
    status: {
      type: String,
      enum: [
        "template", // Seul 'template' reste pour le projet maître
      ],
      default: "template",
    },
    templateProject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: false,
    }, // Référence au projet template d'origine (pourrait être null pour les templates racines)
    order: { type: Number, required: false }, // Ordre du projet dans le cursus (pour les templates)
    exerciseStatements: [{ type: String }], // Nouveau champ pour les énoncés d'exercice (tableau de chaînes)
    resourceLinks: [{ type: String }], // Nouveau champ pour les liens de ressources (tableau de chaînes)
    size: { type: String, enum: ["short", "medium", "long"], default: "short" }, // for +1/+2/+3 days
    assignments: [
      {
        student: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        status: {
          type: String,
          enum: [
            "assigned",
            "pending",
            "approved",
            "rejected",
            "awaiting_staff_review",
          ],
          default: "assigned",
        },
        repoUrl: { type: String, required: false },
        submissionDate: { type: Date },
        evaluations: [{ type: mongoose.Schema.Types.ObjectId, ref: "Evaluation" }], // Références aux évaluations pour cette assignation
        peerEvaluators: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Qui doit évaluer
        staffValidator: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Qui doit valider si besoin
      },
    ],
  },
  { timestamps: true },
);

export default mongoose.model("Project", projectSchema);
