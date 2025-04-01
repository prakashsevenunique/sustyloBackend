const PayIn = require("../models/payin");
const PayOut= require("../models/payout");
const User =require("../models/User");

const userWallet = async (userId) => {
    try {
        console.log("User ID:", userId);

        const mongoose = require('mongoose');
        const userObjectId = new mongoose.Types.ObjectId(userId);

        // Step 1: Approved PayIn Transactions
        const payInData = await PayIn.aggregate([
            { $match: { status: "Approved", userId: userObjectId } },
            { $group: { _id: "$userId", totalPayIn: { $sum: "$amount" } } }
        ]);

        // Step 2: Approved PayOut Transactions
        const payOutData = await PayOut.aggregate([
            { $match: { status: "Approved", userId: userObjectId } },
            { $group: { _id: "$userId", totalPayOut: { $sum: "$amount" } } }
        ]);

        // Step 3: Failed & Pending PayIn Transactions
        const failedPendingPayIn = await PayIn.aggregate([
            { $match: { status: { $in: ["Pending", "Failed"] }, userId: userObjectId } },
            { $group: { _id: "$userId", totalFailedPendingPayIn: { $sum: "$amount" } } }
        ]);

        // Step 4: Failed & Pending PayOut Transactions
        const failedPendingPayOut = await PayOut.aggregate([
            { $match: { status: { $in: ["Pending", "Failed"] }, userId: userObjectId } },
            { $group: { _id: "$userId", totalFailedPendingPayOut: { $sum: "$amount" } } }
        ]);

        // Converting results into maps for lookup
        const payInMap = {};
        payInData.forEach(item => payInMap[item._id.toString()] = item.totalPayIn || 0);

        const payOutMap = {};
        payOutData.forEach(item => payOutMap[item._id.toString()] = item.totalPayOut || 0);

        const failedPendingPayInMap = {};
        failedPendingPayIn.forEach(item => failedPendingPayInMap[item._id.toString()] = item.totalFailedPendingPayIn || 0);

        const failedPendingPayOutMap = {};
        failedPendingPayOut.forEach(item => failedPendingPayOutMap[item._id.toString()] = item.totalFailedPendingPayOut || 0);

        // Fetch user details
        const user = await User.findById(userObjectId);
        if (!user) throw new Error("User not found.");

        // Calculating balances
        const totalPayIn = payInMap[user._id.toString()] || 0;
        const totalPayOut = payOutMap[user._id.toString()] || 0;
        const failedPendingPayInTotal = failedPendingPayInMap[user._id.toString()] || 0;
        const failedPendingPayOutTotal = failedPendingPayOutMap[user._id.toString()] || 0;
        const availableBalance = totalPayIn - totalPayOut;

        // Preparing response data
        const data = {
            _id: user._id,
            name: user.name,
            email: user.email,
            mobileNumber: user.mobileNumber,
            role: user.role,
            totalPayIn,
            totalPayOut,
            failedPendingPayInTotal,
            failedPendingPayOutTotal,
            availableBalance
        };

        console.log("User Wallet Data:", data);
        return data;

    } catch (error) {
        console.error("Error in user wallet report:", error);
        throw error;
    }
};



const allUserWallet = async() => {
 try {
      // Step 1: Aggregate total pay-in amount per user (Only Approved Transactions)
      const payInData = await PayIn.aggregate([
          { $match: { status: "Approved" } },
          { 
              $group: {
                  _id: "$userId",
                  totalPayIn: { $sum: "$amount" }
              } 
          }
      ]);

      // Step 2: Aggregate total pay-out amount per user (Only Approved Transactions)
      const payOutData = await PayOut.aggregate([
          { $match: { status: "Approved" } },
          { 
              $group: {
                  _id: "$userId",
                  totalPayOut: { $sum: "$amount" }
              } 
          }
      ]);

      // Step 3: Convert aggregation results into maps for quick lookup
      const payInMap = {};
      payInData.forEach(item => {
          payInMap[item._id.toString()] = item.totalPayIn;
      });

      const payOutMap = {};
      payOutData.forEach(item => {
          payOutMap[item._id.toString()] = item.totalPayOut;
      });

      // Step 4: Fetch all users
      const users = await User.find({}, "name email mobileNumber role");
    //   const users = await User.findOne({email});
      // Step 5: Attach total pay-in, total pay-out, and available balance
      const finalData = users.map(user => {
          const totalPayIn = payInMap[user._id.toString()] || 0;
          const totalPayOut = payOutMap[user._id.toString()] || 0;
          const availableBalance = totalPayIn - totalPayOut;

          return {
              _id: user._id,
              name: user.name,
              email: user.email,
              mobileNumber: user.mobileNumber,
              role: user.role,
              totalPayIn,
              totalPayOut,
              availableBalance
          };
      });

      return finalData;

  } catch (error) {
      console.error("Error in payingwalletreport API:", error);
      return error.message;
  }
}

module.exports = {userWallet, allUserWallet}