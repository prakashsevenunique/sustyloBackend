    const express = require('express');
    const router = express.Router();
    const { 
        createBooking, 
        getUserBookings, 
        getSalonBookings, 
        confirmBooking, 
        cancelBooking, 
        completeBooking, 
        cancelUnpaidBooking,
        ownerCompleteBooking
    } = require('../controllers/bookingController');

    const { protect, authorizeRoles } = require("../authMiddleware/authMiddleware");
  
    router.post('/create', createBooking);

   
    router.get('/user/:userId', getUserBookings);

    
    router.get('/salon/:salonId', getSalonBookings);

   
    router.post('/confirm/:bookingId', confirmBooking);

   
    router.post('/cancel-unpaid/:bookingId', cancelUnpaidBooking);

   
    router.post('/cancel/:bookingId', cancelBooking);

   
    router.post('/complete/:bookingId', completeBooking);

    router.post('/owner/complete/:bookingId', protect, authorizeRoles("owner"), ownerCompleteBooking);

    module.exports = router;
