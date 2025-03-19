const express = require('express');
const { 
    createBooking, 
    handleBookingRequest, 
    getPendingBookings, 
    cancelBooking, 
    getUserBookings, 
    getSalonBookings, 
    completeBooking 
} = require('../controllers/bookingController');

const router = express.Router();

router.post('/create', createBooking); // User books appointment (Pending)
router.post('/handle/:id', handleBookingRequest); // Salon Owner confirms/cancels
router.get('/pending/:salonId', getPendingBookings); // Get pending requests for a salon
router.post('/cancel/:id', cancelBooking); // User cancels booking
router.get('/user/:userId', getUserBookings); // Get user bookings
router.get('/salon/:salonId', getSalonBookings); // Get salon bookings
router.post('/complete/:id', completeBooking); // Mark booking as completed

module.exports = router;
