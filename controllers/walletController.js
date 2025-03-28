const Wallet = require("../models/Wallet");

exports.getWallet = async (req, res) => {
    const { userId } = req.params;
    const wallet = await Wallet.findOne({ user: userId }).populate('transactions');

    if (!wallet) return res.status(404).json({ error: "Wallet not found" });

    res.json({
        balance: wallet.balance,
        nonWithdrawableBalance: wallet.nonWithdrawableBalance,
        transactions: wallet.transactions
    });
};

// ❌ Prevent withdrawal of referral money
exports.withdrawBalance = async (req, res) => {
    return res.status(400).json({ message: "Withdrawals are not allowed for referral balance" });
};
