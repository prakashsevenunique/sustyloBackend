const express = require("express");
const router = express.Router();
const { 
    getWalletBalance, 
    addToWallet, 
    payWithWallet 
} = require("../controllers/walletController");

// ✅ Get wallet balance
router.get("/:userId", getWalletBalance);

// ✅ Add money to wallet (Referral bonus or admin credit)
router.post("/add", addToWallet);

// ✅ Pay using wallet balance (Only for service booking)
router.post("/pay", payWithWallet);

module.exports = router;
