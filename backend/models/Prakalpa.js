const mongoose = require("mongoose");

const prakalpaSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  prakalpaPramukh: String,
  prakalpaPramukhEmail: String,
  pramukhSeniorEmail: String,
  auditors: [
    {
      name: String,
      email: String,
      phone: String
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model("Prakalpa", prakalpaSchema);