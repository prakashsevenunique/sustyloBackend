const express = require("express");
const { protect, authorizeRoles } = require("../authMiddleware/authMiddleware");
const {
    sendAdminOTP,
    verifyAdminOTP,
    getAllUsers,
    getAllShopOwners,
    updateShopOwner,
    getAllShopWallets,
    getPendingSalonRequests,
    updateSalonStatus,
    getShopOwnerPayInReport,
    getShopOwnerPayoutReport,
    getAllUserPayInReport
} = require("../controllers/adminController");

const router = express.Router();

// ✅ Admin OTP Login
router.post("/send-otp", sendAdminOTP);
router.post("/verify-otp", verifyAdminOTP);

// ✅ User Management
router.get("/users", protect, authorizeRoles, getAllUsers);
router.get("/shop-owners", protect, authorizeRoles, getAllShopOwners);
router.put("/shop-owner/:id/status", protect, authorizeRoles, updateShopOwner);

// ✅ Salon Management
router.get("/shop-requests", protect, authorizeRoles, getPendingSalonRequests);
router.put("/shop-request/:id/status", protect, authorizeRoles, updateSalonStatus);

// ✅ Wallet & Reports
router.get("/shop-wallets", protect, authorizeRoles, getAllShopWallets);
router.get("/reports/shop-owner/:ownerId/payin", protect, authorizeRoles, getShopOwnerPayInReport);
router.get("/reports/shop-owner/:ownerId/payout", protect, authorizeRoles, getShopOwnerPayoutReport);
router.get("/reports/users/payin", protect, authorizeRoles, getAllUserPayInReport);

module.exports = router;
