const express = require("express");
const router = express.Router();
const { upload, convertToJpg } = require("../authMiddleware/upload"); 
const { 
    registerSalon, 
    updateSalon, 
    getSalonById, 
    getAllSalons, 
    getNearbySalons, 
    addReview 
} = require("../controllers/salonController");

// ✅ Register Salon (NO PHOTOS, Only Basic Details)
router.post("/register", registerSalon);

// ✅ Update Salon (With Photos & Agreement Upload)
router.put(
    "/update/:id",
    upload.fields([
        { name: "salonPhotos", maxCount: 5 },  // ✅ Max 5 photos
        { name: "salonAgreement", maxCount: 1 } // ✅ Only 1 agreement file
    ]),
    updateSalon
);

// ✅ Get Nearby Salons
router.get("/nearby", getNearbySalons);

// ✅ Get All Salons
router.get("/", getAllSalons);

// ✅ Get Salon by ID
router.get("/:id", getSalonById);

// ✅ Add Review
router.post("/salon/:salonId/review", addReview);

module.exports = router;
