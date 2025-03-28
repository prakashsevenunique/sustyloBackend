const mongoose = require("mongoose");

const WalletSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    balance: { type: Number, default: 0 }, // ✅ Wallet में पैसे (Withdraw नहीं किया जा सकता)
    transactions: [
        {
            type: { type: String, enum: ["Credit", "Debit"], required: true },
            amount: { type: Number, required: true },
            description: { type: String },
            date: { type: Date, default: Date.now }
        }
    ]
});

module.exports = mongoose.model("Wallet", WalletSchema);
