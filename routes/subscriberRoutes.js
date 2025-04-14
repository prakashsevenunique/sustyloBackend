const express = require("express");
const router = express.Router();
const subscriberController = require("../controllers/subscriberController");
const { protect, authorizeSuperAdmin } = require("../authMiddleware/authMiddleware");

router.get("/all", protect, authorizeSuperAdmin, subscriberController.getAllSubscribers);

// Public route for subscriptions
router.post("/", subscriberController.subscribe);



module.exports = router;