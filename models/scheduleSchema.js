const mongoose = require("mongoose");

const ScheduleSchema = new mongoose.Schema(
  {
    salonId: { type: mongoose.Schema.Types.ObjectId, ref: "Salon", required: true },

    
    weeklySchedule: [
      {
        day: { type: String, required: true, enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] },
        timeSlots: [{ type: String, required: true }], 
        totalSeats: { type: Number, required: true }
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Schedule", ScheduleSchema);