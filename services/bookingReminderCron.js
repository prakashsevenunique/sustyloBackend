const cron = require('node-cron');
const Booking = require('../models/Booking');
const User = require('../models/User');
const Salon = require('../models/salon');
const sendSMS = require('../utils/sendSMS');

console.log("🛠️ Cron initialized...");

const getBookingDateTime = (booking) => {
  const [startTime] = booking.timeSlot.split(' - ');
  const timeParts = startTime.match(/(\d+):(\d+)\s?(AM|PM)/i);
  if (!timeParts) return null;

  let [_, hours, minutes, meridian] = timeParts;
  hours = parseInt(hours, 10);
  minutes = parseInt(minutes, 10);

  if (meridian.toUpperCase() === "PM" && hours !== 12) {
    hours += 12;
  }
  if (meridian.toUpperCase() === "AM" && hours === 12) {
    hours = 0;
  }

  const formattedHours = hours.toString().padStart(2, '0');
  const formattedMinutes = minutes.toString().padStart(2, '0');
  const dateTimeString = `${booking.date}T${formattedHours}:${formattedMinutes}:00`;

  return new Date(dateTimeString);
};

const getISTDateTime = (date) => {
  const istOffset = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes
  return new Date(date.getTime() + istOffset);
};

// ⏰ Run every 5 minutes
cron.schedule('*/300 * * * * *', async () => {
  console.log("⏰ Cron running...");
  try {
    const nowUTC = new Date();
    const nowIST = getISTDateTime(nowUTC);

    const todayIST = nowIST.toISOString().split('T')[0]; // Get today's date in IST format (YYYY-MM-DD)

    const bookings = await Booking.find({
      status: 'Confirmed',
      paymentStatus: 'Paid',
      date: todayIST
    })
      .sort({ createdAt: -1 })
      .populate('userId salonId');

    for (const booking of bookings) {
      const user = booking.userId;
      const salon = booking.salonId;

      if (!user || !salon) {
        console.warn(`⚠️ Skipping booking ${booking._id} due to missing user or salon info`);
        continue;
      }

      const bookingTimeUTC = getBookingDateTime(booking);
      const bookingTimeIST = getISTDateTime(bookingTimeUTC);

      const timeDiff = bookingTimeIST.getTime() - nowIST.getTime();
      const minutesBefore = Math.floor(timeDiff / (1000 * 60));

      console.log(`Booking ID: ${booking._id}`);
      console.log("🕒 Booking Time IST:", bookingTimeIST);
      console.log("🕒 Current Time IST:", nowIST);
      console.log("🕒 Minutes before booking:", minutesBefore);

      if (minutesBefore < 0) {
        // Booking time is already passed
        continue;
      }

      // ✅ 1 hour before reminder
      if (minutesBefore <= 60 && minutesBefore >= 45 && !booking.reminder1hSent) {
        console.log("📢 Sending 1 hour reminder SMS...");
        const msg = `Reminder: Your salon appointment at ${salon.name} is in 1 hour at ${booking.timeSlot}.`;
        await sendSMS(user.phone || user.mobileNumber, msg);
        booking.reminder1hSent = true;
      }

      // ✅ 10 minutes before reminder
      else if (minutesBefore <= 10 && minutesBefore >= 5 && !booking.reminder10mSent) {
        console.log("📢 Sending 10 minute reminder SMS...");
        const msg = `⏳ You're up next! Your salon appointment at ${salon.name} starts at ${booking.timeSlot}.`;
        await sendSMS(user.phone || user.mobileNumber, msg);
        booking.reminder10mSent = true;
      }

      await booking.save();
    }

    console.log("✅ Cron completed: All booking reminders checked.");
  } catch (error) {
    console.error("❌ Cron Error:", error);
  }
});
