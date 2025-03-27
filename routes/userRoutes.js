const express = require("express");
const {
  
  updateLocation,
  updateUserProfile,
  getAllUsers,
  getUserById,
  sendOtpController,
  verifyOTPController,
} = require("../controllers/userController");

const router = express.Router();

router.post("/send-otp", sendOtpController);
router.post("/verify-otp", verifyOTPController);
router.post("/update-location", updateLocation);
router.put("/update-profile/:id", updateUserProfile);
router.get("/get-all", getAllUsers);
router.get("/get/:id", getUserById);

module.exports = router;
