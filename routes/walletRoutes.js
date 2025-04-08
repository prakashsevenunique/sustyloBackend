const express = require("express");
const router = express.Router();
const { 
    getWalletBalance, 
    addToWallet, 
    payWithWallet 
} = require("../controllers/walletController");


router.get("/:userId", getWalletBalance);


router.post("/add", addToWallet);


router.post("/pay", payWithWallet);

module.exports = router;
