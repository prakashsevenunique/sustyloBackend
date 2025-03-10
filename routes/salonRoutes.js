const express = require("express");
const router = express.Router();
const { registerSalon, updateSalon, getSalonById, getAllSalons, getNearbySalons } = require("../controllers/salonController");

// ✅ Get Nearby Salons (MUST be before /:id)
router.get("/nearby", getNearbySalons);

// ✅ Register Salon
router.post("/register", registerSalon);

// ✅ Admin Updates Salon
router.put("/update/:id", updateSalon);

// ✅ Get All Salons (With Status Filter)
router.get("/", getAllSalons);

// ✅ Get Salon by ID (Keep this last)
router.get("/:id", getSalonById);

module.exports = router;
