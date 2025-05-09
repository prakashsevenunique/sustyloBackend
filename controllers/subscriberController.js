const nodemailer = require("nodemailer");
const Subscriber = require("../models/Subscriber");

// Subscribe new user
exports.subscribe = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    let location = null;

    if (req.body.lat && req.body.lng) {
      location = {
        type: 'Point',
        coordinates: [parseFloat(req.body.lng), parseFloat(req.body.lat)]
      };
    }

    const exists = await Subscriber.findOne({ email });
    if (exists) {
      return res.status(200).json({
        success: true,
        message: "Thank you for subscribing!"
      });
    }

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

// Get all subscribers
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

// Send newsletter notification
exports.sendNotification = async (req, res) => {
  try {
    const { subject, content } = req.body;

    if (!subject || !content) {
      return res.status(400).json({
        success: false,
        message: "Subject and content are required",
      });
    }

    const subscribers = await Subscriber.find({});
    const emails = subscribers.map(sub => sub.email);
    
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER, // Use .env file
        pass: process.env.EMAIL_PASS
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: emails.join(','),
      subject,
      text: content,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({
      success: true,
      message: "Notification sent to all subscribers successfully"
    });

  } catch (error) {
    console.error("Notification error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send notification"
    });
  }
};
