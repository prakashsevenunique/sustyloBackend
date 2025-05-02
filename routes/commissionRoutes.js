const express = require("express");
const router = express.Router();
const commissionController = require("../controllers/commissionController.js");

router.post("/", commissionController.createCommission);
router.get("/", commissionController.getAllCommissions);
router.get("/:id", commissionController.getCommissionById);
router.put("/:id", commissionController.updateCommission);
router.delete("/:id", commissionController.deleteCommission);

module.exports = router;
