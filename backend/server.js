const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Pratibimba backend is running");
});

app.use("/api/prakalpas", require("./routes/prakalpaRoutes"));
app.use("/api/audit-plans", require("./routes/auditPlanRoutes"));
app.use("/api/scheduled-audits", require("./routes/scheduledAuditRoutes"));
app.use("/api/reports", require("./routes/reportRoutes"));

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");

    app.listen(process.env.PORT || 5000, () => {
      console.log("Server running on port", process.env.PORT || 5000);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err);
  });