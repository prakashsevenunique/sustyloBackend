const Booking = require('../models/Booking');
const Salon = require('../models/salon');

// Create Booking
exports.createBooking = async (req, res) => {
    const { user, salon, service, date, time,  } = req.body;

    // Check if slot is available
    const existingBooking = await Booking.findOne({ salon, date, time, status: 'confirmed' });
    if (existingBooking) return res.status(400).json({ error: 'Time slot not available' });

    const newBooking = new Booking({ user, salon, service, date, time, status: 'pending' });
    await newBooking.save();

    res.json({ message: 'Booking request sent to salon!' });
};

// Confirm Booking (Salon Owner)
exports.confirmBooking = async (req, res) => {
    const { id } = req.params;
    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    booking.status = 'confirmed';
    await booking.save();

    res.json({ message: 'Booking confirmed!', booking });
};