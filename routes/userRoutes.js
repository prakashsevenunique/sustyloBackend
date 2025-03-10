const express = require("express");
const {
  sendOTP,
  verifyOTP,
  updateLocation,
  updateUserProfile,
  getAllUsers,
  getUserById,
} = require("../controllers/userController");

const router = express.Router();

router.post("/send-otp", sendOTP);
router.post("/verify-otp", verifyOTP);
router.post("/update-location", updateLocation);
router.put("/update-profile/:id", updateUserProfile);
router.get("/get-all", getAllUsers);
router.get("/get/:id", getUserById);

module.exports = router;
