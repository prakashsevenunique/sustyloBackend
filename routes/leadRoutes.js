const express = require("express");
const router = express.Router();
const controller = require("../controllers/leadController.js");

router.post("/", controller.createLead);
router.get("/", controller.getAllLeads);
router.get("/:id", controller.getLeadById);
router.put("/status/:id", controller.updateLeadStatus); // Only status
router.delete("/:id", controller.deleteLead);

module.exports = router;
