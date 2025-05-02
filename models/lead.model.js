const mongoose = require("mongoose");

const SalonLeadBasicSchema = new mongoose.Schema(
  {
    salonName: { type: String, required: true },
    salonOwnerName: { type: String, required: true },
    mobileNumber: {
      type: String,
      required: true,
      match: [/^\d{10}$/, "Mobile number must be 10 digits"]
    },
    email: {
      type: String,
      required: true,
      match: [/.+@.+\..+/, "Please enter a valid email address"],
      lowercase: true
    },
    address: { type: String, required: true },
    status: {
      type: String,
      enum: ["new", "contacted", "reviewed","approved", "rejected"],
      default: "new"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("SalonLeadBasic", SalonLeadBasicSchema);
