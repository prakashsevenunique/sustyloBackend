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
  getUserReviews,
  addProfilePhoto,
  deleteUser,
} = require("../controllers/userController");

const { protect,authorizeSuperAdmin } = require("../authMiddleware/authMiddleware"); 
const { upload } = require("../authMiddleware/upload");

const router = express.Router();
router.post("/send-otp", sendOtpController);
router.post("/verify-otp", verifyOTPController);
router.post("/update-location", updateLocation);
router.put("/update-profile/:id", updateUserProfile);
router.get("/get-all",protect,authorizeSuperAdmin , getAllUsers);
router.get("/get/:id", getUserById);
router.get("/referral/:userId", getReferralCode);
router.get("/user-info", protect, getUserInfo);
router.get("/user-reviews/:userId", getUserReviews);
router.post("/user/:id/profile-photo", upload.fields([
  { name: "profileImage", maxCount: 1 },
]), addProfilePhoto);

router.delete('/me', protect, deleteUser);

module.exports = router;
