const Wallet = require("../models/Wallet");
const User = require("../models/User");

exports.addReferralBonus = async (referrerId, referredUserId) => {
  try {
    const referrer = await User.findById(referrerId);
    if (!referrer) return;

    let referrerWallet = await Wallet.findOne({ user: referrerId });
    if (!referrerWallet) {
      referrerWallet = new Wallet({ user: referrerId, balance: 0, nonWithdrawableBalance: 0 });
    }

    // ✅ Add ₹100 to referrer’s wallet (Only after the first booking is completed)
    referrerWallet.balance += 100;
    referrerWallet.nonWithdrawableBalance += 100; // ✅ Cannot be withdrawn
    await referrerWallet.save();

    console.log(`Referral bonus added for referrer (₹100) after first booking`);

  } catch (error) {
    console.error("Error in addReferralBonus:", error);
  }
};