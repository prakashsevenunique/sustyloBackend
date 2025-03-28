const express = require("express");
const {
  updateLocation,
  updateUserProfile,
  getAllUsers,
  getUserById,
  sendOtpController,
  verifyOTPController,
  getReferralCode, // ✅ Add this import
} = require("../controllers/userController"); // ✅ Ensure correct import path

const referralService = require("../services/referralService");

const router = express.Router();

router.post("/send-otp", sendOtpController);
router.post("/verify-otp", verifyOTPController);
router.post("/update-location", updateLocation);
router.put("/update-profile/:id", updateUserProfile);
router.get("/get-all", getAllUsers);
router.get("/get/:id", getUserById);
router.get("/referral/:userId", getReferralCode); // ✅ Now it will work

module.exports = router;
