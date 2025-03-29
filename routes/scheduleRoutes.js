const express = require("express");
const { ScheduleAdd, getAvailableSlots } = require("../controllers/schedulecontroller");

const router = express.Router();

router.post("/add", ScheduleAdd); // ✅ Ensure this is present
router.get("/schedule-get", getAvailableSlots);

module.exports = router;