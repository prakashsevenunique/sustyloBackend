const express = require("express");
const router = express.Router();
const { subscribe, getAllSubscribers, sendNotification } = require("../controllers/subscriberController");

router.post("/subscribe", subscribe);  // User subscribes
router.get("/subscribers", getAllSubscribers); // Admin fetches all subscribers
router.post("/send-notification", sendNotification);  // Admin sends newsletter

module.exports = router;
