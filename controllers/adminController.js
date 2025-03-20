const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Admin = require("../models/admin");
const User = require("../models/User");
const Wallet = require("../models/Wallet");
const Payment = require("../models/payment");
const Salon = require("../models/salon");

// ✅ Register Admin & Generate Token
exports.registerAdmin = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        // ✅ Check if an admin already exists
        let admin = await Admin.findOne();

        if (admin) {
            return res.status(400).json({ message: "Admin already registered. Please log in." });
        }

        // ✅ Hash Password
        const hashedPassword = await bcrypt.hash(password, 10);

        // ✅ Save First Admin in Database
        admin = new Admin({
            name,
            email,
            password: hashedPassword,
            role: "super_admin", // First admin is Super Admin
            isActive: true
        });

        await admin.save();

        // ✅ Generate Token After Registration
        const token = jwt.sign(
            { id: admin._id, role: admin.role },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.status(201).json({
            message: "Admin registered successfully.",
            admin,
            token
        });

    } catch (error) {
        res.status(500).json({ message: "Error registering admin", error: error.message });
    }
};

// ✅ Admin Login
exports.loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await Admin.findOne({ email });

        if (!admin) return res.status(404).json({ message: "Admin not found." });
        if (!admin.isActive) return res.status(403).json({ message: "Account inactive. Contact Super Admin." });

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials." });

        res.json({ message: "Login successful", admin });

    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// ✅ Fetch All Users (User Management)
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find({ role: "user" }).select("-password");
        res.json({ success: true, users });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching users", error: error.message });
    }
};

// ✅ Fetch All Shop Owners
exports.getAllShopOwners = async (req, res) => {
    try {
        const owners = await User.find({ role: "shopOwner" }).select("-password");
        res.json({ success: true, owners });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching shop owners", error: error.message });
    }
};

// ✅ Update Shop Owner Details
exports.updateSalon = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        console.log("🛠️ Updating Salon:", id);
        console.log("Request Body:", updateData);

        // ✅ Check if the mobile number is changing
        if (updateData.mobile) {
            const existingSalon = await Salon.findOne({ mobile: updateData.mobile });
            
            // ✅ If a salon exists with this mobile but it's not the same salon we're updating, return an error
            if (existingSalon && existingSalon._id.toString() !== id) {
                return res.status(400).json({ 
                    message: "This mobile number is already in use by another salon."
                });
            }
        }

        // ✅ Update Salon
        const updatedSalon = await Salon.findByIdAndUpdate(id, updateData, { new: true });

        if (!updatedSalon) {
            return res.status(404).json({ message: "Salon not found." });
        }

        res.status(200).json({
            message: "Salon updated successfully!",
            salon: updatedSalon
        });
    } catch (error) {
        console.error("❌ Internal Server Error:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};

// ✅ Fetch Pending Salon Requests
exports.getPendingSalonRequests = async (req, res) => {
    try {
        const salons = await Salon.find({ status: "pending" });
        res.json({ success: true, salons });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching pending salons", error: error.message });
    }
};



// ✅ Fetch All Wallets
exports.getAllShopWallets = async (req, res) => {
    try {
        const wallets = await Wallet.find().populate("user", "name email phone");
        res.json({ success: true, wallets });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching shop wallets", error: error.message });
    }
};

// ✅ Fetch Pay-in Report for Shop Owner
exports.getShopOwnerPayInReport = async (req, res) => {
    try {
        const { ownerId } = req.params;
        const payments = await Payment.find({ salonOwner: ownerId, type: "payin" });
        res.json({ success: true, payments });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching pay-in report", error: error.message });
    }
};

// ✅ Fetch Payout Report for Shop Owner
exports.getShopOwnerPayoutReport = async (req, res) => {
    try {
        const { ownerId } = req.params;
        const payouts = await Payment.find({ salonOwner: ownerId, type: "payout" });
        res.json({ success: true, payouts });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching payout report", error: error.message });
    }
};

// ✅ Fetch Pay-in Report for All Users
exports.getAllUserPayInReport = async (req, res) => {
    try {
        const payments = await Payment.find({ type: "payin" }).populate("user", "name email phone");
        res.json({ success: true, payments });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching user pay-in report", error: error.message });
    }
};

exports.addReview = async (req, res) => {
    try {
      const { salonId, rating, comment } = req.body;  // Expecting salonId, rating, and comment in the request body
      const userId = req.user._id;  // Assuming `req.user` contains the logged-in user's info
  
      // Find the salon by its ID
      const salon = await Salon.findById(salonId);
      if (!salon) {
        return res.status(404).json({ message: "Salon not found." });
      }
  
      // Create a new review
      const newReview = {
        userId,
        rating,
        comment
      };
  
      // Add the review to the salon's reviews array
      salon.reviews.push(newReview);
  
      // Recalculate the average rating of the salon
      salon.calculateAverageRating();
      
      // Save the salon with the new review and updated rating
      await salon.save();
  
      res.status(201).json({ message: "Review added successfully.", salon });
    } catch (error) {
      res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
  };