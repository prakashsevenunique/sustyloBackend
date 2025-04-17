const cron = require('node-cron');
const Booking = require('../models/Booking');
const User = require('../models/User');
const sendSMS = require('../utils/sendSMS');

// ⏰ Run every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  const now = new Date();

  const getBookingDateTime = (booking) => {
    const [startTime] = booking.timeSlot.split(' - ');
    return new Date(`${booking.date}T${startTime}:00`);
  };

  const bookings = await Booking.find({
    status: 'Confirmed',
    paymentStatus: 'Paid',
  }).populate('userId salonId');

  for (const booking of bookings) {
    const bookingTime = getBookingDateTime(booking);
    const timeDiff = bookingTime.getTime() - now.getTime();

    const minutesBefore = Math.floor(timeDiff / (1000 * 60));

    const user = booking.userId;
    const salon = booking.salonId;

    // ✅ 24 hours before
    if (minutesBefore <= 1440 && minutesBefore > 1435 && !booking.reminder24hSent) {
      const msg = `Reminder: Your salon appointment at ${salon?.name} is tomorrow at ${booking.timeSlot}.`;
      await sendSMS(user.phone, msg);
      booking.reminder24hSent = true;
    }

    // ✅ 1 hour before
    else if (minutesBefore <= 60 && minutesBefore > 55 && !booking.reminder1hSent) {
      const msg = `Reminder: Your salon appointment at ${salon?.name} is at ${booking.timeSlot} today.`;
      await sendSMS(user.phone, msg);
      booking.reminder1hSent = true;
    }

    // ✅ 10 minutes before
    else if (minutesBefore <= 10 && minutesBefore > 5 && !booking.reminder10mSent) {
      const msg = `⏳ You're up next! Your salon appointment at ${salon?.name} starts at ${booking.timeSlot}.`;
      await sendSMS(user.phone, msg);
      booking.reminder10mSent = true;
    }

    await booking.save();
  }

  console.log("📤 All reminders checked (status: Confirmed, payment: Paid).");
});
