const express = require("express");
const { payIn, callbackPayIn, getPayInRes, payInReportAllUsers } = require("../controllers/paymentController");
const router = express.Router();

router.post("/payin", payIn);
router.post("/payin/callback", callbackPayIn);
router.get("/payin/status", getPayInRes);
router.get("/payin/report", payInReportAllUsers);

module.exports = router;
