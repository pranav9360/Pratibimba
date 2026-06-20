const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  prakalpaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Prakalpa",
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model("Location", locationSchema);