const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const { protect, allowRoles } = require("../middleware/authMiddleware");

const router = express.Router();

function createToken(userId) {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role, prakalpaId } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        message: "Name, email, password, and role are required"
      });
    }

    if (!["chief_auditor", "auditor", "prakalpa_manager"].includes(role)) {
      return res.status(400).json({
        message: "Invalid role"
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists with this email"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      prakalpaId: prakalpaId || null
    });

    const token = createToken(user._id);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        prakalpaId: user.prakalpaId
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required"
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    const token = createToken(user._id);

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        prakalpaId: user.prakalpaId
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/me", protect, async (req, res) => {
  res.json({
    user: req.user
  });
});

router.get(
  "/chief-only",
  protect,
  allowRoles("chief_auditor"),
  async (req, res) => {
    res.json({
      message: "Chief auditor access granted",
      user: req.user
    });
  }
);

router.get(
  "/auditor-only",
  protect,
  allowRoles("chief_auditor", "auditor"),
  async (req, res) => {
    res.json({
      message: "Auditor access granted",
      user: req.user
    });
  }
);

router.get(
  "/manager-only",
  protect,
  allowRoles("chief_auditor", "prakalpa_manager"),
  async (req, res) => {
    res.json({
      message: "Prakalpa manager access granted",
      user: req.user
    });
  }
);

module.exports = router;