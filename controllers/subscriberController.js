const Subscriber = require("../models/Subscriber");

exports.subscribe = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    // Get client IP and approximate location
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    let location = null;
    
    // In production, you would use a geolocation API or service
    if (req.body.lat && req.body.lng) {
      location = {
        type: 'Point',
        coordinates: [parseFloat(req.body.lng), parseFloat(req.body.lat)]
      };
    }

    // Check if email exists
    const exists = await Subscriber.findOne({ email });
    if (exists) {
      return res.status(200).json({
        success: true,
        message: "Thank you for subscribing!"
      });
    }

    // Save with location data
    await Subscriber.create({ 
      email, 
      location,
      ipAddress: ip 
    });

    res.status(200).json({
      success: true,
      message: "Thank you for subscribing!"
    });

  } catch (error) {
    console.error("Subscription error:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong"
    });
  }
};

// Admin-only endpoint to get all subscribers
exports.getAllSubscribers = async (req, res) => {
  try {
    const subscribers = await Subscriber.find({})
      .sort({ createdAt: -1 })
      .select('email location ipAddress createdAt -_id');

    res.status(200).json({
      success: true,
      count: subscribers.length,
      data: subscribers
    });
  } catch (error) {
    console.error("Get subscribers error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch subscribers"
    });
  }
};
