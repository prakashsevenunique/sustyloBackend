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
  getReviews
} = require("../controllers/salonController");

const { upload, convertToJpg } = require("../authMiddleware/upload");
const { protect, authorizeRoles, authorizeSuperAdmin } = require("../authMiddleware/authMiddleware");

// ✅ Register a new salon lead (Minimal Details)
router.post("/lead", SalonLead);

// ✅ Approve salon (Admin only)
router.put("/approve/:salonId", protect, authorizeSuperAdmin, approveSalon);


// ✅ Get all salons (With optional status filter)
router.get("/all", getAllSalons);

// ✅ Get nearby salons (Based on location & filters)
router.get("/nearby", getNearbySalons);

// ✅ Get single salon by ID
router.get("/view/:id", getSalonById);

// get most review salon
router.get("/mostreview", getTopReviewedSalons);

// get rebiew
router.get("/review/:salonId", getReviews);

// ✅ Update salon details (Owner updates profile)
router.put(
  "/update/:salonId",
  upload.fields([
    { name: "salonPhotos", maxCount: 5 },
    { name: "salonAgreement", maxCount: 1 },
  ]),
  convertToJpg,
  updateSalon
);

// ✅ Add review to a salon
router.post("/review/:salonId", addReview);

module.exports = router;
