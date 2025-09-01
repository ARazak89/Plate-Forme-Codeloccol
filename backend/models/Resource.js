import mongoose from "mongoose";

const resourceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    url: { type: String, required: true }, // URL de la ressource (vidéo, document, etc.)
    type: {
      type: String,
      enum: ["video", "document", "course", "other"],
      default: "other",
    },
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Curriculum.modules",
    }, // Lien vers un module de parcours
  },
  { timestamps: true },
);

export default mongoose.model("Resource", resourceSchema);
