const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const errorHandler = require("./authMiddleware/errorMiddleware");
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


const app = express();


app.use(express.json());
app.use(cors('*'));
app.use(helmet());
app.use(morgan("dev"));


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

console.log("✅ Registered Routes:");
app._router.stack.forEach((r) => {
    if (r.route && r.route.path) {
        console.log(`${Object.keys(r.route.methods)[0].toUpperCase()} ${r.route.path}`);
    }
});

app.use("/uploads", express.static("uploads"));


app.get("/", (req, res) => {
    res.send("Welcome to the API. Server is running!");
});


app.use(errorHandler);


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
