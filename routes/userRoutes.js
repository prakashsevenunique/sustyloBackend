const express = require("express");
const { sendOTP, verifyOTP, updateLocation } = require("../controllers/userController");
const router = express.Router();

router.post("/send-otp", sendOTP);
router.post("/verify-otp", verifyOTP);
router.post("/update-location", updateLocation);
module.exports = router;
