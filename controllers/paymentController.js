const Payment = require('../models/payment');
const Wallet = require('../models/Wallet');

// Process Payment
exports.processPayment = async (req, res) => {
    const { user, salon, amount } = req.body;

    // Deduct platform commission (e.g., 10%)
    const commission = amount * 0.1;
    const finalAmount = amount - commission;

    // Create payment record
    const newPayment = new Payment({ user, salon, amount: finalAmount, status: 'completed' });
    await newPayment.save();

    // Update Salon Owner Wallet
    let salonOwnerWallet = await Wallet.findOne({ user: salon.owner });
    if (!salonOwnerWallet) {
        salonOwnerWallet = new Wallet({ user: salon.owner, balance: 0 });
    }

    salonOwnerWallet.balance += finalAmount;
    salonOwnerWallet.transactions.push(newPayment._id);
    await salonOwnerWallet.save();

    res.json({ message: 'Payment successful!', amount: finalAmount });
};