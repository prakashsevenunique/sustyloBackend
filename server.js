const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const cors = require("cors");
const errorHandler = require("./authMiddleware/errorMiddleware");
const admin = require("firebase-admin");
const serviceAccount = require("./utils/sustylo-firebase-adminsdk-fbsvc-73c7320882.json");
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");
const salonRoutes = require("./routes/salonRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const scheduleRoutes = require("./routes/scheduleRoutes.js");
const referralService = require("./services/referralService");
const paymentRoutes = require("./routes/paymentRoutes");
const contactRoutes = require("./routes/contactRoutes");
const blogRoutes = require("./routes/blogRoutes.js");
const subscriberRoutes = require("./routes/subscriberRoutes");
const getInTouchRoutes = require("./routes/getInTouchRoutes");

dotenv.config();

const mainWalletRoutes = require("./routes/mainWallatRoute.js");

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected Successfully"))
    .catch((err) => {
        console.error("❌ MongoDB Connection Error:", err);
        process.exit(1);
    });

require('./services/bookingReminderCron');
const app = express();
const path = require("path");
app.use(express.json());
app.use(cors('*'));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads"))); // ✅ Reliable

app.use("/api/user", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/salon", salonRoutes);
app.use("/api/booking", bookingRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/schedule", scheduleRoutes);
app.use("/api/wallet", mainWalletRoutes);
app.use("/api", contactRoutes);
app.use("/api/blogs", blogRoutes);
app.use("/api/subscribe", subscriberRoutes);
app.use("/api", getInTouchRoutes);
app.use("/dashboard", require("./routes/dashboardRoutes.js"));
app.use("/api/lead", require("./routes/leadRoutes.js"));
app.use("/api/commission", require("./routes/commissionRoutes.js"));

app.get("/", (req, res) => {
    res.send("Welcome to the API. Server is running!");
});


admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));