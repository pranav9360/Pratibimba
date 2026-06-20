const express = require("express");
const router = express.Router();

const Prakalpa = require("../models/Prakalpa");
const Location = require("../models/Location");

router.get("/", async (req, res) => {
  try {
    const prakalpas = await Prakalpa.find().sort({ createdAt: -1 });
    res.json(prakalpas);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const prakalpa = await Prakalpa.create(req.body);
    res.status(201).json(prakalpa);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.get("/:id/locations", async (req, res) => {
  try {
    const locations = await Location.find({ prakalpaId: req.params.id });
    res.json(locations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/:id/locations", async (req, res) => {
  try {
    const location = await Location.create({
      name: req.body.name,
      prakalpaId: req.params.id
    });

    res.status(201).json(location);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;