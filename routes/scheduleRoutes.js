const express = require("express");
const { ScheduleAdd,  getAvailableSlots } = require("../controllers/schedulecontroller");

const router = express.Router();

router.post("/add", ScheduleAdd);
router.get("/schedule-get", getAvailableSlots);


module.exports = router;
