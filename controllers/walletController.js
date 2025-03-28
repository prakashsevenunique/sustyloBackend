const Wallet = require("../models/Wallet");
const User = require("../models/User");

// ✅ 1️⃣ यूज़र का वॉलेट बैलेंस चेक करना
exports.getWalletBalance = async (req, res) => {
    try {
        const { userId } = req.params;
        const wallet = await Wallet.findOne({ user: userId });

        if (!wallet) {
            return res.status(404).json({ error: "Wallet not found" });
        }

        res.status(200).json({ balance: wallet.balance, transactions: wallet.transactions });

    } catch (error) {
        console.error("Error in getWalletBalance:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// ✅ 2️⃣ वॉलेट में पैसे ऐड करना (Referral Bonus या Admin द्वारा Credit)
exports.addToWallet = async (req, res) => {
    try {
        const { userId, amount, description } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: "Invalid amount" });
        }

        let wallet = await Wallet.findOne({ user: userId });
        if (!wallet) {
            wallet = new Wallet({ user: userId, balance: 0, transactions: [] });
        }

        // ✅ Wallet Balance Update
        wallet.balance += amount;
        wallet.transactions.push({
            type: "Credit",
            amount,
            description: description || "Added to wallet"
        });

        await wallet.save();

        res.status(200).json({ message: "Amount added successfully", balance: wallet.balance });

    } catch (error) {
        console.error("Error in addToWallet:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// ✅ 3️⃣ वॉलेट से पेमेंट करना (सिर्फ सर्विस बुकिंग के लिए)
exports.payWithWallet = async (req, res) => {
    try {
        const { userId, amount } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: "Invalid amount" });
        }

        let wallet = await Wallet.findOne({ user: userId });
        if (!wallet || wallet.balance < amount) {
            return res.status(400).json({ error: "Insufficient wallet balance" });
        }

        // ✅ Wallet Balance Deduct
        wallet.balance -= amount;
        wallet.transactions.push({
            type: "Debit",
            amount,
            description: "Payment for service booking"
        });

        await wallet.save();

        res.status(200).json({ message: "Payment successful using wallet", balance: wallet.balance });

    } catch (error) {
        console.error("Error in payWithWallet:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// ✅ 4️⃣ Referral Bonus Add करना (User के पहले बुकिंग कंप्लीट होने पर)
exports.addReferralBonus = async (referrerId, referredUserId) => {
    try {
        let wallet = await Wallet.findOne({ user: referrerId });
        if (!wallet) {
            wallet = new Wallet({ user: referrerId, balance: 0, transactions: [] });
        }

        const referralAmount = 100; // ✅ Referral Bonus ₹100

        // ✅ Add Bonus to Wallet
        wallet.balance += referralAmount;
        wallet.transactions.push({
            type: "Credit",
            amount: referralAmount,
            description: `Referral Bonus for ${referredUserId}`
        });

        await wallet.save();
        console.log(`Referral bonus of ₹${referralAmount} added to user ${referrerId}`);

    } catch (error) {
        console.error("Error in addReferralBonus:", error);
    }
};
