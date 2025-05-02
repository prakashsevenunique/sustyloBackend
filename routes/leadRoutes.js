const express = require("express");
const router = express.Router();
const controller = require("../controllers/leadController.js");
const { protect, authorizeSuperAdmin } = require("../authMiddleware/authMiddleware.js");

router.post("/", controller.createLead);
router.get("/", protect, authorizeSuperAdmin, controller.getAllLeads);
router.get("/:id", controller.getLeadById);
router.put("/status/:id", protect, authorizeSuperAdmin, controller.updateLeadStatus); // Only status
router.delete("/:id", protect, authorizeSuperAdmin, controller.deleteLead);

module.exports = router;
