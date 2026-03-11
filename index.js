const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

mongoose.set("bufferCommands", false);

const userRoutes = require("./routes/userRoutes");
const productRoutes = require("./routes/productRoutes");
const orderRoutes = require("./routes/orderRoutes");
const reviewRoutes = require("./routes/reviewRoutes");

const app = express();
const PORT = process.env.PORT || 5000;
const rawFrontendOrigins =
  process.env.FRONTEND_URL || process.env.CLIENT_URL || "*";

const normalizeOrigin = (origin) => origin.replace(/\/+$/, "");

const getAllowedOrigins = (rawOrigins) => {
  if (rawOrigins.trim() === "*") {
    return "*";
  }

  return rawOrigins
    .split(",")
    .map((origin) => normalizeOrigin(origin.trim()))
    .filter(Boolean);
};

const getDatabaseStatus = () => {
  const states = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  return states[mongoose.connection.readyState] || "unknown";
};

const isDatabaseReady = () => mongoose.connection.readyState === 1;
const allowedOrigins = getAllowedOrigins(rawFrontendOrigins);
let isMongoConnecting = false;
let reconnectTimer = null;

const getMaskedMongoTarget = (uri) => {
  try {
    const parsed = new URL(uri);
    const username = parsed.username
      ? `${parsed.username.slice(0, 2)}***`
      : "unknown-user";
    return `${parsed.protocol}//${username}@${parsed.host}${parsed.pathname}`;
  } catch {
    return "invalid MongoDB URI";
  }
};

const getStartupErrorMessage = (err, uri) => {
  const message = err?.message || "Unknown startup error";
  const maskedTarget = getMaskedMongoTarget(uri);

  if (/bad auth|authentication failed/i.test(message)) {
    return [
      `MongoDB authentication failed for ${maskedTarget}.`,
      "Verify the Atlas database username and password in MONGO_URI.",
      "If you recently changed the password, URL-encode special characters before placing it in the URI.",
    ].join(" ");
  }

  if (/ENOTFOUND|querySrv ENOTFOUND|getaddrinfo/i.test(message)) {
    return [
      `MongoDB host lookup failed for ${maskedTarget}.`,
      "Verify the cluster hostname in MONGO_URI and your network/DNS access.",
    ].join(" ");
  }

  if (/IP.*whitelist|not authorized on admin|could not connect to any servers/i.test(message)) {
    return [
      `MongoDB rejected the connection for ${maskedTarget}.`,
      "Check Atlas Network Access and ensure your current IP address is allowed.",
    ].join(" ");
  }

  return `Startup error while connecting to ${maskedTarget}: ${message}`;
};

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins === "*") {
        return callback(null, true);
      }

      if (allowedOrigins.includes(normalizeOrigin(origin))) {
        return callback(null, true);
      }

      const error = new Error(`CORS blocked for origin ${origin}`);
      error.status = 403;
      return callback(error);
    },
    credentials: allowedOrigins !== "*",
  }),
);
app.use(express.json());

app.get("/health", (req, res) => {
  const database = getDatabaseStatus();
  const status = isDatabaseReady() ? 200 : 503;

  res.status(status).json({
    status: isDatabaseReady() ? "ok" : "degraded",
    database,
  });
});

app.use((req, res, next) => {
  if (req.path === "/" || req.path === "/health") {
    return next();
  }

  if (isDatabaseReady()) {
    return next();
  }

  return res.status(503).json({
    message:
      "Database unavailable. Check MONGO_URI credentials and MongoDB network access.",
    database: getDatabaseStatus(),
  });
});

app.use("/api/user", userRoutes);
app.use("/api/product", productRoutes);
app.use("/api/order", orderRoutes);
app.use("/api/reviews", reviewRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "Githmi Sports Goods API is running",
    database: getDatabaseStatus(),
  });
});

app.use((err, req, res, next) => {
  console.error("Server error:", err.stack || err.message);
  res
    .status(err.status || 500)
    .json({ message: "Internal server error", error: err.message });
});

const scheduleReconnect = () => {
  if (reconnectTimer) {
    return;
  }

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    void connectToMongo();
  }, 15000);
};

const connectToMongo = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    console.error("MongoDB connection skipped: MONGO_URI is missing in .env");
    return;
  }

  if (mongoUri.includes("<db_username>")) {
    console.error(
      "MongoDB connection skipped: replace <db_username> and <db_password> in MONGO_URI",
    );
    return;
  }

  if (isMongoConnecting || isDatabaseReady()) {
    return;
  }

  isMongoConnecting = true;

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log("MongoDB connected successfully");
  } catch (err) {
    console.error(getStartupErrorMessage(err, mongoUri));
    scheduleReconnect();
  } finally {
    isMongoConnecting = false;
  }
};

mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB disconnected");
  scheduleReconnect();
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  void connectToMongo();
});
