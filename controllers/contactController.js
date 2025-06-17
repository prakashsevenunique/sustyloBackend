const Contact = require("../models/Contact");
const nodemailer = require("nodemailer");
require("dotenv").config();

const sendMail = async (contact) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.WEBSITE_EMAIL,
    subject: "New Contact Form Submission",
    text: `Name: ${contact.fullName}\nEmail: ${contact.email}\nMobile: ${contact.mobile}\nMessage: ${contact.message}`,
  };

  await transporter.sendMail(mailOptions);
};

exports.createContact = async (req, res) => {
  try {
    const { fullName, email, mobile, message } = req.body;
    if (!fullName || !email || !mobile || !message) {
      return res.status(400).json({ error: "All fields are required." });
    }
    const newContact = new Contact({ fullName, email, mobile, message });
    await newContact.save();
    try {
      sendMail(newContact);
    } catch (error) {
      console.log(error.message);
    }
    res.status(201).json({ message: "Contact message sent successfully!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error." });
  }
};
