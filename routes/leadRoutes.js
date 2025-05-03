const express = require("express");
const router = express.Router();
const controller = require("../controllers/leadController.js");
const { protect, authorizeSuperAdmin } = require("../authMiddleware/authMiddleware.js");

router.post("/", controller.createLead);
router.get("/", protect, authorizeSuperAdmin, controller.getAllLeads);
router.get("/:id", controller.getLeadById);
router.put("/status/:id", protect, authorizeSuperAdmin, controller.updateLeadStatus); // Only status
router.delete("/:id", protect, authorizeSuperAdmin, controller.deleteLead);
router.post(
    "/create-salon-media/:userId",
    upload.fields([
      { name: "salonPhotos", maxCount: 10 },
      { name: "salonAgreement", maxCount: 1 }
    ]),
    salonMediaController.createSalonMedia
  );
module.exports = router;
