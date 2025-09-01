import mongoose from "mongoose";

const availabilitySlotSchema = new mongoose.Schema(
  {
    evaluator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    isBooked: { type: Boolean, default: false },
    bookedByStudent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    }, // Qui a réservé le slot
    bookedForProject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
    }, // Pour quel projet
  },
  { timestamps: true },
);

const AvailabilitySlot = mongoose.model(
  "AvailabilitySlot",
  availabilitySlotSchema,
);

export default AvailabilitySlot;
