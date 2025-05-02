const mongoose = require("mongoose");

// Wallet Schema (for balance tracking)
const WalletSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  balance: { type: Number, default: 0, min: 0 },
}, { timestamps: true });

// Wallet Transaction Schema (for transaction history)
const WalletTransactionSchema = new mongoose.Schema({
  wallet: { type: mongoose.Schema.Types.ObjectId, ref: "Wallet", required: true, index: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ["Credit", "Debit"], required: true },
  description: { type: String },
  reference: { type: String }, // Can store booking ID or other reference
  metadata: { type: mongoose.Schema.Types.Mixed }, // Additional data if needed
}, { timestamps: true });

// Indexes for faster queries
WalletTransactionSchema.index({ createdAt: -1 });
WalletTransactionSchema.index({ wallet: 1, createdAt: -1 });

module.exports =  mongoose.model("Wallet", WalletSchema);