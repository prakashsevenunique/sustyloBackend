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
        ownerCompleteBooking,
        getAllBookings
    } = require('../controllers/bookingController');

    const { protect, authorizeRoles, authorizeSuperAdmin } = require("../authMiddleware/authMiddleware");
  
    router.post('/create', createBooking);

   
    router.get('/user/:userId', getUserBookings);

    
    router.get('/salon/:salonId', getSalonBookings);

   
    router.post('/confirm/:bookingId', confirmBooking);

   
    router.post('/cancel-unpaid/:bookingId', cancelUnpaidBooking);

   
    router.post('/cancel/:bookingId', cancelBooking);

   
    router.post('/complete/:bookingId', completeBooking);

    router.post('/owner/complete/:bookingId', protect, authorizeRoles("owner"), ownerCompleteBooking);
    router.get('/all',protect,authorizeSuperAdmin , getAllBookings);

    module.exports = router;
