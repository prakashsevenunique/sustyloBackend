const express = require("express");
const {
  updateLocation,
  updateUserProfile,
  getAllUsers,
  getUserById,
  sendOtpController,
  verifyOTPController,
  getReferralCode,
  getUserInfo,
  getUserReviews
} = require("../controllers/userController"); // ✅ Ensure correct import path

const { protect } = require("../authMiddleware/authMiddleware"); // ✅ Correct import

const router = express.Router();

router.post("/send-otp", sendOtpController);
router.post("/verify-otp", verifyOTPController);
router.post("/update-location", updateLocation);
router.put("/update-profile/:id", updateUserProfile);
router.get("/get-all", getAllUsers);
router.get("/get/:id", getUserById);
router.get("/referral/:userId", getReferralCode);
router.get("/user-info", protect, getUserInfo); // ✅ Fixed middleware usage
router.get("/user-reviews/:userId", getUserReviews);

module.exports = router;
