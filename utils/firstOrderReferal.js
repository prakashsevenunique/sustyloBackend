const Booking = require('../models/Booking');
const Wallet = require('../models/Wallet');
const payout = require('../models/payout');
const payin = require('../models/payin');
const User = require('../models/User');


const handleReferralReward = async (booking) => {

    const user = await User.findById(booking.userId)

    if (!user || !user.referredBy) return;

    const existingConfirmedBookings = await Booking.countDocuments({
        userId: user._id,
        status: "Confirmed"
    })

    if (existingConfirmedBookings !== 1) return;

    const referrerId = user.referredBy;

    const referrer = await User.findById(referrerId);
    if (!referrer) return;

    await Wallet.findOneAndUpdate(
        { user: referrerId },
        { $inc: { balance: 100 } },
    );

    await Promise.all([
        new payin({
            userId: referrerId,
            reference: booking._id,
            amount: 100,
            name: referrer.name || "N/A",
            mobile: referrer.mobileNumber || "N/A",
            email: referrer.email || "N/A",
            status: "Approved",
            trans_mode: "wallet",
            description: `Referral bonus`,
        }).save()
    ]);
};

const cancelReferralReward = async (booking) => {

    const user = await User.findById(booking.userId);
    if (!user || !user.referredBy) return;

    const referrerId = user.referredBy;
    const referrer = await User.findById(referrerId);
    if (!referrer) return;

    await Wallet.findOneAndUpdate(
        { user: referrerId, balance: { $gte: 100 } },
        { $inc: { balance: -100 } }
    );

    await Promise.all([
        new payout({
            userId: referrerId,
            reference: booking._id,
            amount: 100,
            name: referrer.name || "N/A",
            mobile: referrer.mobileNumber || "N/A",
            email: referrer.email || "N/A",
            status: "Approved",
            trans_mode: "wallet",
            description: `Referral bonus reversed`,
        }).save()
    ]);
};

module.exports = {
    handleReferralReward,
    cancelReferralReward
};

