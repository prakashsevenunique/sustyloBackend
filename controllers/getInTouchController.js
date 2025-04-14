const Subscriber = require("../models/Subscriber");

// POST: Subscribe user
exports.subscribeUser = async (req, res) => {
  try {
    const { name, email, mobile } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const existing = await Subscriber.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: "Already subscribed" });
    }

    const subscriber = new Subscriber({ name, email, mobile });
    await subscriber.save();
    res.status(200).json({ message: "Subscribed successfully", data: subscriber });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// GET: List all subscribers
exports.getAllSubscribers = async (req, res) => {
  try {
    const subscribers = await Subscriber.find().sort({ createdAt: -1 });
    res.status(200).json({ message: "Fetched successfully", data: subscribers });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// POST: Admin sends newsletter update (future: email, push, etc.)
exports.sendNewsletterUpdate = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ message: "Message is required" });

    const subscribers = await Subscriber.find();

    // Future: integrate email / notification service
    // For now, just return all emails the message would go to
    const emails = subscribers.map(sub => sub.email);

    // Simulate sending
    res.status(200).json({
      message: "Newsletter update prepared",
      update: message,
      receivers: emails
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
