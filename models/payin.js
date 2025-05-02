const mongoose = require("mongoose");

const PayInSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    reference: { type: String, required: false },
    name: { type: String, required: true },
    mobile: { type: String, required: true },
    email: { type: String, required: true },
    description: { type: String },
    status: { type: String, enum: ["Pending", "Approved", "Failed"], default: "Pending" },
    trans_mode :{
      type : String,
      required:false,
  },
    utr: { type: String, required: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PayIn", PayInSchema);
