const express = require("express");
const router = express.Router();
const {
  createBooking,
  getUserBookings,
  getSalonBookings,
  confirmBooking,
  cancelBooking,
  completeBooking,
} = require("../controllers/bookingController");
const {
  getNearbySalons,
  SalonLead,
  getSalonById,
  updateSalon,  // ✅ Import updateSalon controller
} = require("../controllers/salonController");

const {upload, convertToJpg} = require("../authMiddleware/upload"); // ✅ Multer for file uploads
const authMiddleware = require("../authMiddleware/authMiddleware");

// ✅ Lead for salon
router.post("/lead/salon", SalonLead);

// ✅ Nearby salons
router.get("/nearby", getNearbySalons);

// ✅ Single salon view
router.get("/view/:id", getSalonById);

// ✅ Update salon details (Owner updates profile)
router.put(
    "/update/:salonId",
    upload.fields([
      { name: "salonPhotos", maxCount: 5 }, 
      { name: "salonAgreement", maxCount: 1 }
    ]),
    convertToJpg,
    updateSalon
);
  

// ✅ Booking Routes

// Create a booking (User Books Appointment)
router.post("/create", createBooking);

// Get all bookings for a user
router.get("/user/:userId", getUserBookings);

// Get all bookings for a salon
router.get("/salon/:salonId", getSalonBookings);

// Confirm a booking after payment
router.post("/confirm/:bookingId", confirmBooking);

// Cancel a booking
router.post("/cancel/:bookingId", cancelBooking);

// Mark a booking as completed
router.post("/complete/:bookingId", completeBooking);

module.exports = router;
