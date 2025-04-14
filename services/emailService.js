const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  },
});

exports.sendSubscriptionEmail = async (email) => {
  try {
    const mailOptions = {
      from: `SUSTYLO <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: "Subscription Confirmation",
      html: `
        <h2>Thank you for subscribing to SUSTYLO!</h2>
        <p>You'll now receive updates and news about our services.</p>
        <p>If you didn't request this subscription, please ignore this email.</p>
      `,
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Email sending error:", error);
    throw error;
  }
};