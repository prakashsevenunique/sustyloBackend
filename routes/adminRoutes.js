const express = require("express");
const { protect, authorizeRoles, authorizeSuperAdmin } = require("../authMiddleware/authMiddleware");
const {
    registerAdmin, 
    loginAdmin,
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

// ✅ Admin Authentication Routes
router.post("/login", loginAdmin);
router.post("/register", registerAdmin); // ✅ Only Super Admin can register new admins

// ✅ User Management Routes
router.get("/users", protect, authorizeRoles("super_admin", "admin"), getAllUsers);
router.get("/shop-owners", protect, authorizeRoles("super_admin", "admin"), getAllShopOwners);
router.put("/shop-owner/:id/status", protect, authorizeRoles("super_admin", "admin"), updateShopOwner);

// ✅ Salon Management Routes
router.get("/shop-requests", protect, authorizeRoles("super_admin", "admin"), getPendingSalonRequests);
router.put("/shop-request/:id/status", protect, authorizeRoles("super_admin", "admin"), updateSalonStatus);

// ✅ Wallet & Reports Routes
router.get("/shop-wallets", protect, authorizeRoles("super_admin", "admin"), getAllShopWallets);
router.get("/reports/shop-owner/:ownerId/payin", protect, authorizeRoles("super_admin", "admin"), getShopOwnerPayInReport);
router.get("/reports/shop-owner/:ownerId/payout", protect, authorizeRoles("super_admin", "admin"), getShopOwnerPayoutReport);
router.get("/reports/users/payin", protect, authorizeRoles("super_admin", "admin"), getAllUserPayInReport);

module.exports = router;
