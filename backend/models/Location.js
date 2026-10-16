import mongoose from "mongoose";

const locationSchema =
  new mongoose.Schema(
    {
      prakalpa: {
        type: String,
        required: true,
        trim: true,
      },

      name: {
        type: String,
        required: true,
        trim: true,
      },

      sublocations: [
        {
          type: String,
          trim: true,
        },
      ],

      active: {
        type: Boolean,
        default: true,
      },
    },
    {
      timestamps: true,
    }
  );

locationSchema.index(
  {
    prakalpa: 1,
    name: 1,
  },
  {
    unique: true,
  }
);

export default mongoose.model(
  "Location",
  locationSchema
);
