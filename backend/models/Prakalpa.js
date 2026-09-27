import mongoose from "mongoose";

const prakalpaSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    auditAreas: {
      type: [String],
      default: [],
      set: (areas) =>
        Array.isArray(areas)
          ? [...new Set(areas.map((a) => String(a).trim()).filter(Boolean))]
          : [],
    },

    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Prakalpa", prakalpaSchema);
