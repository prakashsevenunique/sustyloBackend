const express = require("express");
const router = express.Router();
const {
  getNearbySalons,
  SalonLead,
  getSalonById,
  updateSalon,
  approveSalon,
  getAllSalons,
  getTopReviewedSalons,
  addReview,
  getReviews,
  getNearbySalonsByService
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
  "/update/:salonId",
  upload.fields([
    { name: "salonPhotos", maxCount: 5 },
    { name: "salonAgreement", maxCount: 1 },
  ]),
  updateSalon
);


router.post("/review/:salonId", addReview);

module.exports = router;
