const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  mobileNumber: { type: String, required: true, unique: true }, // अब डुप्लिकेट नहीं होगा
  role: { type: String, enum: ["user", "shop_owner", "admin"], required: true },
  name: { type: String },
  email: { type: String, unique: true, sparse: true }, // ✅ Email अब NULL डुप्लिकेट नहीं करेगा
  gender: { type: String, enum: ["male", "female", "other"] }, // ✅ Gender Field
  address: { type: String }, // ✅ Address Field
  wallet: { type: mongoose.Schema.Types.ObjectId, ref: "Wallet" }, // ✅ Wallet Field (Ref to Wallet Model)
  location: {
    latitude: { type: Number },
    longitude: { type: Number },
  },
});

module.exports = mongoose.model("User", userSchema);
