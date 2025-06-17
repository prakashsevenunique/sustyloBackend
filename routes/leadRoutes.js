const express = require("express");
const router = express.Router();
const controller = require("../controllers/leadController.js");
const { protect, authorizeSuperAdmin } = require("../authMiddleware/authMiddleware.js");
const { upload } = require("../authMiddleware/upload.js");

router.post("/", controller.createLead);
router.get("/", protect, authorizeSuperAdmin, controller.getAllLeads);
router.get("/lead/count", protect, authorizeSuperAdmin, controller.getLeadCount);
router.get("/:id", controller.getLeadById);
router.put("/status/:id", protect, authorizeSuperAdmin, controller.updateLeadStatus); // Only status
router.delete("/:id", protect, authorizeSuperAdmin, controller.deleteLead);
router.put(
    "/update/media/:userId",
  upload.fields([
    { name: "salonPhotos", maxCount: 5 },
    { name: "salonAgreement", maxCount: 1 },
  ]),
  controller.updateSalonMedia
);
module.exports = router;
