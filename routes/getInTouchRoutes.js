const express = require("express");
const router = express.Router();
const {
  addGetInTouch,
  getAllGetInTouch
} = require("../controllers/getInTouchController");

router.post("/get-in-touch", addGetInTouch);        // User form submission
router.get("/get-in-touch", getAllGetInTouch);      // Admin fetches all

module.exports = router;
