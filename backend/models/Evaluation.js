import mongoose from "mongoose";

const evaluationSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    assignment: {
      type: mongoose.Schema.Types.ObjectId,
      required: true, // L'assignation est désormais requise pour une évaluation
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    evaluator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    slot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AvailabilitySlot",
      required: true,
    },
    feedback: {
      assiduite: { type: String, default: "" },
      comprehension: { type: String, default: "" },
      specifications: { type: String, default: "" },
      maitrise_concepts: { type: String, default: "" },
      capacite_expliquer: { type: String, default: "" },
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
    submissionDate: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

const Evaluation = mongoose.model("Evaluation", evaluationSchema);

export default Evaluation;
