const express = require("express");

const {payIn, callbackPayIn, getPayInRes, payInReportAllUsers} = require('../controllers/payinController');
const {payOut, adminAction, callbackPayout, payOutReportAllUsers} = require("../controllers/payoutController");

const router = express.Router();

router.post("/payIn", payIn);
router.post("/payOut", payOut);
router.post("/payout/admin-action", adminAction);
router.get("/payIn/response", getPayInRes);
router.post("/payIn/callback", callbackPayIn);
router.post("/payOut/callback", callbackPayout);
router.get("/payIn/report", payInReportAllUsers);
router.get("/payOut/report", payOutReportAllUsers);

module.exports = router;