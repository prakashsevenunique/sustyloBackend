const express = require("express");
const router = express.Router();
const {
  getNearbySalons,
  SalonLead,
  getSalonById,
  updateSalonMedia,
  updateSalonDetails,
  approveSalon,
  getAllSalons,
  getTopReviewedSalons,
  addReview,
  getReviews,
  getNearbySalonsByService,
  deleteSalon
} = require("../controllers/salonController");

const { upload, convertToJpg } = require("../authMiddleware/upload");
const { protect, authorizeRoles, authorizeSuperAdmin } = require("../authMiddleware/authMiddleware");


router.post("/lead", SalonLead);
router.put("/approve/:salonId", protect, authorizeSuperAdmin, approveSalon);
router.get("/all", getAllSalons);
router.get("/nearby", getNearbySalons);
router.get("/view/:id", getSalonById);
router.get("/mostreview", getTopReviewedSalons);
router.get("/review/:salonId", getReviews);
router.get("/nearby", getNearbySalonsByService);

router.put(
  "/update/media/:salonId",
  upload.fields([
    { name: "salonPhotos", maxCount: 5 },
    { name: "salonAgreement", maxCount: 1 },
  ]),
  updateSalonMedia
);
router.delete("/deleteSalon/:id", deleteSalon)
router.put("/update/details/:salonId", updateSalonDetails);
router.post("/review/:salonId", addReview);

module.exports = router;
