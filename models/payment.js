const mongoose = require("mongoose");

// ✅ Check if the model already exists before defining it
if (!mongoose.models.Payment) {
  const paymentSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    salonOwner: { type: mongoose.Schema.Types.ObjectId, ref: "Owner", required: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ["payin", "payout"], required: true },
    status: { type: String, enum: ["pending", "completed", "failed"], default: "pending" },
    transactionId: { type: String, unique: true, required: true },
    createdAt: { type: Date, default: Date.now },
  });

  mongoose.model("Payment", paymentSchema);
}

// ✅ Export the existing model
module.exports = mongoose.model("Payment");
