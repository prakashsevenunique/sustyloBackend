const Admin = require("../models/Admin");
const User = require("../models/User");
const Salon = require("../models/salon");
const Wallet = require("../models/Wallet");
const Booking = require("../models/Booking");
const Payment = require("../models/payment");
const { generateOTP } = require("../utils/otpService");
const sendEmail = require("../utils/sendEmail");
const jwt = require("jsonwebtoken");

// ✅ Send OTP to Admin Email
exports.sendAdminOTP = async (req, res) => {
    const { email } = req.body;

    if (!email) return res.status(400).json({ error: "Email is required" });

    const admin = await Admin.findOne({ email });

    if (!admin) return res.status(404).json({ error: "Admin not found" });

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

    await Admin.updateOne({ _id: admin._id }, { otp, otpExpiry });

    try {
        await sendEmail(email, "Admin Login OTP", `Your OTP is: ${otp}\n\nThis OTP is valid for 5 minutes.`);
        res.json({ success: true, message: "OTP sent to admin email. OTP expires in 5 minutes." });
    } catch (error) {
        console.error("Email sending failed:", error);
        res.status(500).json({ error: "Failed to send OTP" });
    }
};


// ✅ Verify OTP & Login Admin
exports.verifyAdminOTP = async (req, res) => {
    const { email, otp } = req.body;

    const admin = await Admin.findOne({ email });
    if (!admin || admin.otp !== otp || new Date() > admin.otpExpiry) {
        return res.status(400).json({ error: "Invalid or expired OTP" });
    }

    // Generate JWT Token
    const token = jwt.sign({ id: admin._id, role: admin.role }, process.env.JWT_SECRET, { expiresIn: "2h" });

    // Clear OTP after successful login
    admin.otp = null;
    admin.otpExpiry = null;
    await admin.save();

    res.json({ success: true, message: "Login successful", token, admin });
};

// ✅ Existing Admin APIs (No Changes)
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find({ role: "user" }).select("-password");
        res.json({ success: true, users });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching users", error: error.message });
    }
};

exports.getAllShopOwners = async (req, res) => {
    try {
        const owners = await User.find({ role: "shopOwner" }).select("-password");
        res.json({ success: true, owners });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching shop owners", error: error.message });
    }
};

exports.updateShopOwner = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, phone, status } = req.body;

        const owner = await User.findByIdAndUpdate(id, { name, email, phone, status }, { new: true });

        if (!owner) return res.status(404).json({ success: false, message: "Shop Owner not found" });

        res.json({ success: true, message: "Shop Owner updated successfully!", owner });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error updating shop owner", error: error.message });
    }
};

// ✅ Shop Registration Requests
exports.getPendingSalonRequests = async (req, res) => {
    try {
        const salons = await Salon.find({ status: "pending" });
        res.json({ success: true, salons });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching pending salons", error: error.message });
    }
};

exports.updateSalonStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const salon = await Salon.findByIdAndUpdate(id, { status }, { new: true });

        if (!salon) return res.status(404).json({ success: false, message: "Salon not found" });

        res.json({ success: true, message: `Salon ${status} successfully!`, salon });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error updating salon status", error: error.message });
    }
};

// ✅ Wallet & Payment Reports
exports.getAllShopWallets = async (req, res) => {
    try {
        const wallets = await Wallet.find().populate("user", "name email phone");
        res.json({ success: true, wallets });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching shop wallets", error: error.message });
    }
};

exports.getShopOwnerPayInReport = async (req, res) => {
    try {
        const { ownerId } = req.params;
        const payments = await Payment.find({ salonOwner: ownerId, type: "payin" });
        res.json({ success: true, payments });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching pay-in report", error: error.message });
    }
};

exports.getShopOwnerPayoutReport = async (req, res) => {
    try {
        const { ownerId } = req.params;
        const payouts = await Payment.find({ salonOwner: ownerId, type: "payout" });
        res.json({ success: true, payouts });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching payout report", error: error.message });
    }
};

exports.getAllUserPayInReport = async (req, res) => {
    try {
        const payments = await Payment.find({ type: "payin" }).populate("user", "name email phone");
        res.json({ success: true, payments });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching user pay-in report", error: error.message });
    }
};
