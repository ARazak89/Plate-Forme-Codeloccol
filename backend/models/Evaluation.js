import mongoose from "mongoose";

const evaluationSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    assignment: { type: mongoose.Schema.Types.ObjectId, required: true }, // L'id de l'assignation dans le tableau d'assignments du projet
    evaluator: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // L'apprenant évalué
    score: { type: Number, min: 0, max: 100 },
    comments: { type: String },
    feedback: {
      assiduite: { type: String, default: "" },
      comprehension: { type: String, default: "" },
      specifications: { type: String, default: "" },
      maitrise_concepts: { type: String, default: "" },
      capacite_expliquer: { type: String, default: "" },
    },
    slot: { type: mongoose.Schema.Types.ObjectId, ref: "AvailabilitySlot" }, // Ajout du champ slot
    status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },
  },
  { timestamps: true },
);

const Evaluation = mongoose.model("Evaluation", evaluationSchema);
export default Evaluation;
