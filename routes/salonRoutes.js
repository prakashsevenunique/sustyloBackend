const express = require('express');
const router = express.Router();
const { 
    createBooking, 
    getUserBookings, 
    getSalonBookings, 
    confirmBooking, 
    cancelBooking, 
    completeBooking 
} = require('../controllers/bookingController');
const { getNearbySalons, SalonLead, getSalonById } = require('../controllers/salonController');


// lead for sallon
router.post("/lead/salon",SalonLead)

// nearby sallon
router.get('/nearby', getNearbySalons);

//  single view salon as completed
router.get('/view/:id', getSalonById);

// Route to create a booking (User Books Appointment)
router.post('/create', createBooking);

// Get all bookings for a user
router.get('/user/:userId', getUserBookings);

// Get all bookings for a salon
router.get('/salon/:salonId', getSalonBookings);

// Confirm a booking after payment
router.post('/confirm/:bookingId', confirmBooking);

// Cancel a booking
router.post('/cancel/:bookingId', cancelBooking);

// Mark a booking as completed
router.post('/complete/:bookingId', completeBooking);


module.exports = router;
