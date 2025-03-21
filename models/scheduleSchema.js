const mongoose = require("mongoose");

const ScheduleSchema = new mongoose.Schema(
  {
    salonId: { type: mongoose.Schema.Types.ObjectId, ref: "Salon", required: true },

    
    weeklySchedule: [
      {
        day: { type: String, required: true, enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] },
        timeSlots: [{ type: String, required: true }], // ["10:00 AM - 11:00 AM", "11:00 AM - 12:00 PM"]
        totalSeats: { type: Number, required: true } // Total number of seats available
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Schedule", ScheduleSchema);