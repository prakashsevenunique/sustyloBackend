const Wallet = require('../models/Wallet');
const Payment = require('../models/payment');

// Get Wallet Details
exports.getWallet = async (req, res) => {
    const { userId } = req.params;
    const wallet = await Wallet.findOne({ user: userId }).populate('transactions');

    if (!wallet) return res.status(404).json({ error: 'Wallet not found' });

    res.json({ balance: wallet.balance, transactions: wallet.transactions });
};