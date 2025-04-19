const cron = require('node-cron');
const Booking = require('../models/Booking');
const User = require('../models/User');
const Salon = require('../models/salon'); 
const sendSMS = require('../utils/sendSMS');

// ⏰ Run every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  try {
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
      const user = booking.userId;
      const salon = booking.salonId;

      if (!user || !salon) {
        console.warn(`⚠️ Skipping booking ${booking._id} due to missing user or salon info`);
        continue;
      }

      const bookingTime = getBookingDateTime(booking);
      const timeDiff = bookingTime.getTime() - now.getTime();
      const minutesBefore = Math.floor(timeDiff / (1000 * 60));

      // ✅ Send immediate reminder on confirmation (only once)
      if (!booking.reminder24hSent && booking.createdAt && ((now - booking.createdAt) <= 5 * 60 * 1000)) {
        const msg = `✅ Booking Confirmed! Your appointment at ${salon.name} is scheduled for ${booking.date} at ${booking.timeSlot}.`;
        await sendSMS(user.phone || user.mobileNumber, msg);
        booking.reminder24hSent = true;
      }

      // ✅ 1 hour before reminder
      else if (minutesBefore <= 60 && minutesBefore > 55 && !booking.reminder1hSent) {
        const msg = `Reminder: Your salon appointment at ${salon.name} is in 1 hour at ${booking.timeSlot}.`;
        await sendSMS(user.phone || user.mobileNumber, msg);
        booking.reminder1hSent = true;
      }

      // ✅ 10 minutes before reminder
      else if (minutesBefore <= 10 && minutesBefore > 5 && !booking.reminder10mSent) {
        const msg = `⏳ You're up next! Your salon appointment at ${salon.name} starts at ${booking.timeSlot}.`;
        await sendSMS(user.phone || user.mobileNumber, msg);
        booking.reminder10mSent = true;
      }

      await booking.save();
    }

    console.log("📤 Cron: All booking reminders checked.");
  } catch (error) {
    console.error("❌ Cron Error:", error);
  }
});
