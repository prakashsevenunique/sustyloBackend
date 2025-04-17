const express = require("express");
const { ScheduleAdd, getAvailableSlots, updateSchedule } = require("../controllers/schedulecontroller");

const router = express.Router();

router.post("/add", ScheduleAdd);
router.get("/schedule-get", getAvailableSlots);
router.put("/update", updateSchedule);

module.exports = router;