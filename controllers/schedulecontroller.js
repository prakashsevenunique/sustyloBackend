const Schedule = require("../models/scheduleSchema");

exports.ScheduleAdd = async (req, res) => {
    try {
        const { salonId,  weeklySchedule } = req.body;
    
        if (!salonId || !weeklySchedule) {
          return res.status(400).json({ error: "All fields are required" });
        }
    
        // ✅ Check if schedule already exists
        const existingSchedule = await Schedule.findOne({ salonId });
        if (existingSchedule) {
          return res.status(400).json({ error: "Schedule already exists, update instead." });
        }
    
        // ✅ Save new schedule
        const schedule = new Schedule({ salonId,  weeklySchedule });
        await schedule.save();
    
        res.status(201).json({ message: "Schedule added successfully", schedule });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
}; 




const Booking = require("../models/Booking");

exports.getAvailableSlots = async (req, res) => {
  try {
    const { salonId, date } = req.query;

    if (!salonId || !date) {
      return res.status(400).json({ error: "Salon ID and Date are required" });
    }

    // ✅ Salon ka schedule dhundo
    const schedule = await Schedule.findOne({ salonId });

    if (!schedule) {
      return res.status(404).json({ error: "No schedule found for this salon" });
    }

    // ✅ Date se day ka naam nikalna
    const dayName = new Date(date).toLocaleDateString("en-US", { weekday: "long" });

    // ✅ Us din ka schedule check karo
    const daySchedule = schedule.weeklySchedule.find(d => d.day === dayName);
    if (!daySchedule) {
      return res.status(404).json({ error: "Salon is closed on this day" });
    }

    // ✅ Us din ki booked seats nikalna
    const bookings = await Booking.find({ salonId, date });

    // ✅ Available slots aur seats prepare karo
    let availableSlots = {};
    daySchedule.timeSlots.forEach(slot => {
      // ✅ Jo seats booked hain unko alag se extract karo
      const bookedSeats = bookings
        .filter(b => b.timeSlot === slot)
        .map(b => b.seatNumber);

      // ✅ Saari seats prepare karo
      const allSeats = Array.from({ length: daySchedule.totalSeats }, (_, i) => ({
        seatNumber: i + 1,
        status: bookedSeats.includes(i + 1) ? "booked" : "available",
      }));

      availableSlots[slot] = allSeats;
    });

    res.json({ date, availableSlots });
  } catch (error) {
    console.error("Error in getAvailableSlots:", error);
    res.status(500).json({ error: error.message });
  }
};