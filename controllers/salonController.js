const { Owner, Salon } = require("../models/salon");
const { generateOTP, sendOTP } = require("../utils/otpService");

// Send OTP for Owner Login
exports.sendSalonOTP = async (req, res) => {
    const { phone, name, email, panCard, aadhar, bankDetails } = req.body;
    if (!phone) return res.status(400).json({ error: "Phone number required" });
  
    const otp = generateOTP();
  
    let owner = await Owner.findOne({ phone });
  
    if (!owner) {
      if (!name || !email || !panCard || !aadhar || !bankDetails || !bankDetails.accountNumber || !bankDetails.ifscCode || !bankDetails.bankName) {
        return res.status(400).json({ error: "All owner details are required for registration" });
      }
  
      owner = new Owner({
        phone,
        name,
        email,
        panCard,
        aadhar,
        bankDetails,
        otp,
        otpExpiry: new Date(Date.now() + 5 * 60000),
      });
    } else {
      owner.otp = otp;
      owner.otpExpiry = new Date(Date.now() + 5 * 60000);
    }
  
    await owner.save();
    const otpResponse = await sendOTP(phone, otp);
    res.json(otpResponse);
  };

// Verify OTP for Owner Login
exports.verifySalonOTP = async (req, res) => {
  const { phone, otp } = req.body;

  const owner = await Owner.findOne({ phone });
  if (!owner || owner.otp !== otp || new Date() > owner.otpExpiry) {
    return res.status(400).json({ error: "Invalid or expired OTP" });
  }

  owner.otp = null;
  owner.otpExpiry = null;
  await owner.save();

  res.json({ message: "Salon Owner Login successful", owner });
};

// Register Salon (Goes for Admin Approval)
exports.createSalon = async (req, res) => {
  const { name, owner, location, services, gstNumber } = req.body;

  const foundOwner = await Owner.findById(owner);
  if (!foundOwner) return res.status(404).json({ error: "Owner not found" });

  const newSalon = new Salon({
    name,
    owner,
    location,
    services,
    gstNumber,
    status: "pending", // Pending admin approval
  });

  await newSalon.save();
  res.json({ message: "Salon registration request sent for approval!" });
};

// Admin Approves Salon
exports.approveSalon = async (req, res) => {
  const { salonId } = req.body;

  const salon = await Salon.findByIdAndUpdate(salonId, { status: "approved" }, { new: true });
  if (!salon) return res.status(404).json({ error: "Salon not found" });

  res.json({ message: "Salon approved successfully!", salon });
};
