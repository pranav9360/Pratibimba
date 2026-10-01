import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import cookieParser from "cookie-parser";

import connectDB from "./config/db.js";

import authRoutes from "./routes/authRoutes.js";
import roleRoutes from "./routes/roleRoutes.js";
import domainRoutes from "./routes/domainRoutes.js";
import prakalpaRoutes from "./routes/prakalpaRoutes.js";
import locationRoutes from "./routes/locationRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import auditPlanRoutes from "./routes/auditPlanRoutes.js";
import scheduledAuditRoutes from "./routes/scheduledAudit.routes.js";
import notFound from "./middleware/notFound.js";
import errorHandler from "./middleware/errorHandler.js";
import reportRoutes from "./routes/reportRoutes.js";
import auditFindingRoutes from "./routes/auditFindingRoutes.js";

dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// ======================
// Security & CORS Middleware
// ======================

app.use(helmet());

const allowedOrigins = [
  "https://pratibimba.pages.dev",
  process.env.ALLOWED_ORIGIN,
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "https://localhost:5173",
].filter(Boolean);

function isTrustedCodespacesOrigin(origin) {
  try {
    const url = new URL(origin);

    return (
      url.protocol === "https:" &&
      (
        url.hostname.endsWith(".app.github.dev") ||
        url.hostname.endsWith(".githubpreview.dev")
      )
    );
  } catch {
    return false;
  }
}

app.use(
  cors({
    origin(origin, callback) {
      // curl/Postman/server-to-server requests may have no Origin header.
      if (!origin) {
        return callback(null, true);
      }

      const isAllowed =
        allowedOrigins.includes(origin) ||
        isTrustedCodespacesOrigin(origin);

      if (!isAllowed) {
        console.warn("CORS blocked origin:", origin);
      }

      return callback(
        isAllowed ? null : new Error("Not allowed by CORS"),
        isAllowed
      );
    },

    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(compression());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// ======================
// Health Routes
// ======================

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Pratibimba Backend Running",
  });
});

app.get("/api/v1/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "healthy",
  });
});

// ======================
// API Routes
// ======================

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/roles", roleRoutes);
app.use("/api/v1/domains", domainRoutes); // temporary legacy compatibility
app.use("/api/v1/prakalpas", prakalpaRoutes);
app.use("/api/v1/locations", locationRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/audit-plans", auditPlanRoutes);
app.use("/api/v1/scheduled-audits", scheduledAuditRoutes);
app.use("/api/v1/reports", reportRoutes);
app.use("/api/v1/audit-findings", auditFindingRoutes);

// ======================
// Error Handling
// ======================

// 404 Handler
app.use(notFound);

// Global Error Handler
app.use(errorHandler);

// ======================
// Server Initialization
// ======================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});