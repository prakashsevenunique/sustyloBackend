const express = require("express");
const router = express.Router();
const MainWallet = require("../controllers/mainWallet");

router.get("/alluserwallet", MainWallet.allUserWalletreport);
router.get("/userwallet/:userId", MainWallet.userWalletreport);


module.exports = router;