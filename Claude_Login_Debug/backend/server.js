import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import cookieParser from "cookie-parser";
import roleRoutes from "./routes/roleRoutes.js";
import connectDB from "./config/db.js";
import domainRoutes from "./routes/domainRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import locationRoutes from "./routes/locationRoutes.js";
import notFound from "./middleware/notFound.js";
import errorHandler from "./middleware/errorHandler.js";
import userRoutes from "./routes/userRoutes.js";


dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// ======================
// Security Middleware
// ======================

app.use(helmet());

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
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