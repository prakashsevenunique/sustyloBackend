const express = require("express");
const router = express.Router();
const {
  subscribeUser,
  getAllSubscribers,
  sendNewsletterUpdate
} = require("../controllers/getInTouchController");

router.post("/subscribe", subscribeUser);              // User subscribes
router.get("/subscribers", getAllSubscribers);         // Admin fetches list
router.post("/send-update", sendNewsletterUpdate);     // Admin sends newsletter

module.exports = router;
