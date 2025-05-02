const express = require("express");
const router = express.Router();
const commissionController = require("../controllers/commissionController.js");
const { protect, authorizeSuperAdmin } = require("../authMiddleware/authMiddleware.js");

router.post("/", protect, authorizeSuperAdmin, commissionController.createCommission);
router.get("/", protect, authorizeSuperAdmin, commissionController.getAllCommissions);
router.get("/:id", protect, authorizeSuperAdmin, commissionController.getCommissionById);
router.put("/:id", protect, authorizeSuperAdmin, commissionController.updateCommission);
router.delete("/:id", protect, authorizeSuperAdmin, commissionController.deleteCommission);

module.exports = router;
