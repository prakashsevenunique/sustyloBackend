const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
// const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const errorHandler = require("./authMiddleware/errorMiddleware"); // Ensure correct path
// const authenticateUser = require("./authMiddleware/authMiddleware"); 
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes"); // ✅ Explicit Import
const salonRoutes = require("./routes/salonRoutes"); // ✅ Explicit Import
const bookingRoutes = require("./routes/bookingRoutes"); // ✅ Explicit Import
// const paymentRoutes = require("./routes/paymentRoutes");
// const scheduleRoutes = require("./routes/scheduleRoutes");
const referralService = require("./services/referralService");
// const payinRoutes = require("./routes/payinRoutes"); // ✅ Correct Import
const paymentRoutes = require("./routes/paymentRoutes");

dotenv.config();

// ✅ Connect to MongoDB (Remove Deprecated Options)
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected Successfully"))
    .catch((err) => {
        console.error("❌ MongoDB Connection Error:", err);
        process.exit(1); // Exit process on failure
    });

// ✅ Initialize Express App
const app = express();

// ✅ Middleware
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));




// ✅ Routes
app.use("/api/user", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/salon", salonRoutes);
app.use("/api/booking", bookingRoutes);
// app.use("/api/payin", payinRoutes);
app.use("/api/payment", paymentRoutes);
// app.use("/api/payout", referralService);

// ✅ Default Route
app.get("/", (req, res) => {
    res.send("Welcome to the API. Server is running!");
});

// ✅ Error Handling Middleware
app.use(errorHandler);

// ✅ Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
