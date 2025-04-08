    const express = require('express');
    const router = express.Router();
    const { 
        createBooking, 
        getUserBookings, 
        getSalonBookings, 
        confirmBooking, 
        cancelBooking, 
        completeBooking, 
        cancelUnpaidBooking 
    } = require('../controllers/bookingController');

  
    router.post('/create', createBooking);

   
    router.get('/user/:userId', getUserBookings);

    
    router.get('/salon/:salonId', getSalonBookings);

   
    router.post('/confirm/:bookingId', confirmBooking);

   
    router.post('/cancel-unpaid/:bookingId', cancelUnpaidBooking);

   
    router.post('/cancel/:bookingId', cancelBooking);

   
    router.post('/complete/:bookingId', completeBooking);

    module.exports = router;
