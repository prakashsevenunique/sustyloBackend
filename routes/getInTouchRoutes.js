const express = require("express");
const router = express.Router();
const {
  addGetInTouch,
  getAllGetInTouch,
  markGetInTouchResolved // ✅ Add this controller
} = require("../controllers/getInTouchController");

// User form submission
router.post("/get-in-touch", addGetInTouch);

// Admin fetches all entries
router.get("/get-in-touch", getAllGetInTouch);

// ✅ Mark a specific entry as resolved
router.patch("/get-in-touch/resolve/:id", markGetInTouchResolved);

module.exports = router;
