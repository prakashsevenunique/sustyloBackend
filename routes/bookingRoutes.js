const express = require('express');
const { createBooking, confirmBooking } = require('../controllers/bookingController');
const router = express.Router();

router.post('/create', createBooking);
router.post('/confirm/:id', confirmBooking);

module.exports = router;