const express = require("express");
const { sendSalonOTP, verifySalonOTP, createSalon, approveSalon } = require("../controllers/salonController");
const router = express.Router();

router.post("/send-otp", sendSalonOTP);
router.post("/verify-otp", verifySalonOTP);
router.post("/register", createSalon); // Salon Registration (Admin Approval)
router.post("/approve", approveSalon); // Admin Approves Salon

module.exports = router;
