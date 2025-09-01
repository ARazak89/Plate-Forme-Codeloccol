import mongoose from "mongoose";

const badgeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    icon: { type: String }, // Chemin ou nom de l'icône du badge
  },
  { timestamps: true },
);

export default mongoose.model("Badge", badgeSchema);
