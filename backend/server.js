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
import locationRoutes from "./routes/locationRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import auditPlanRoutes from "./routes/auditPlanRoutes.js";
import scheduledAuditRoutes from "./routes/scheduledAudit.routes.js";

import notFound from "./middleware/notFound.js";
import errorHandler from "./middleware/errorHandler.js";
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// ======================
// Security Middleware
// ======================

app.use(helmet());

// The previous config used a single fixed string:
//   cors({ origin: process.env.FRONTEND_URL, credentials: true })
// The "cors" package sends a STRING origin back verbatim, without ever
// comparing it to the request's actual Origin header. In GitHub
// Codespaces the frontend is served from a forwarded HTTPS domain like
// "https://<codespace-name>-5173.app.github.dev" — not
// "http://localhost:5173" — so the fixed string could never match, the
// browser's CORS check failed, and fetch() threw "Failed to fetch" even
// though curl (which doesn't enforce CORS) hit the same URL fine.
//
// This validates the request's real origin instead of echoing a fixed
// value, so it works for local dev AND for whichever Codespace forwards
// the frontend on a given run.
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // No Origin header at all (curl, Postman, server-to-server) — not
      // subject to CORS in the first place, so allow it through.
      if (!origin) return callback(null, true);

      let isAllowed = allowedOrigins.includes(origin);

      if (!isAllowed) {
        try {
          isAllowed = new URL(origin).hostname.endsWith(".app.github.dev");
        } catch {
          isAllowed = false;
        }
      }

      callback(isAllowed ? null : new Error("Not allowed by CORS"), isAllowed);
    },
    credentials: true,
  })
);

app.use(compression());

app.use(cookieParser());

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  })
);

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

app.use("/api/v1/domains", domainRoutes);

app.use("/api/v1/locations", locationRoutes);

app.use("/api/v1/users", userRoutes);
app.use("/api/v1/audit-plans", auditPlanRoutes);
app.use("/api/v1/scheduled-audits", scheduledAuditRoutes);
// ======================
// Error Handling
// ======================

// 404 Handler
app.use(notFound);

// Global Error Handler
app.use(errorHandler);

// ======================
// Server
// ======================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
