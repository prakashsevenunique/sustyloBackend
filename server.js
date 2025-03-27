const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const errorHandler = require("./authMiddleware/errorMiddleware"); // Ensure correct path
const authenticateUser = require("./authMiddleware/authMiddleware"); // Example authentication middleware
const userRoutes = require("./routes/userRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const scheduleRoutes = require("./routes/scheduleRoutes");

dotenv.config();

// ✅ Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => console.log("✅ MongoDB Connected Successfully"))
    .catch((err) => {
        console.error("❌ MongoDB Connection Error:", err);
        process.exit(1);
    });

// ✅ Initialize Express App
const app = express();

// ✅ Middleware
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));

// ✅ Rate Limiting
const limiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 100,
    message: "Too many requests, please try again later.",
});
app.use(limiter);

// ✅ Routes
app.use("/api/user", userRoutes);
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/salon", require("./routes/salonRoutes"));  // Salon API Added
app.use("/api/booking", require("./routes/bookingRoutes")); // Protected route
app.use("/api/payment", paymentRoutes);
app.use("/api/schedule", scheduleRoutes);

// ✅ Default Route
app.get("/", (req, res) => {
    res.send("Welcome to the API. Server is running!");
});

// ✅ Error Handling Middleware
app.use(errorHandler);

// ✅ Start Server
const PORT = process.env.PORT ||5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
