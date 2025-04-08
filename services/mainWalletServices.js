const PayIn = require("../models/payin");
const PayOut= require("../models/payout");
const User =require("../models/User");

const userWallet = async (userId) => {
    try {
        console.log("User ID:", userId);

        const mongoose = require('mongoose');
        const userObjectId = new mongoose.Types.ObjectId(userId);

       
        const payInData = await PayIn.aggregate([
            { $match: { status: "Approved", userId: userObjectId } },
            { $group: { _id: "$userId", totalPayIn: { $sum: "$amount" } } }
        ]);

      
        const payOutData = await PayOut.aggregate([
            { $match: { status: "Approved", userId: userObjectId } },
            { $group: { _id: "$userId", totalPayOut: { $sum: "$amount" } } }
        ]);

       
        const failedPendingPayIn = await PayIn.aggregate([
            { $match: { status: { $in: ["Pending", "Failed"] }, userId: userObjectId } },
            { $group: { _id: "$userId", totalFailedPendingPayIn: { $sum: "$amount" } } }
        ]);

      
        const failedPendingPayOut = await PayOut.aggregate([
            { $match: { status: { $in: ["Pending", "Failed"] }, userId: userObjectId } },
            { $group: { _id: "$userId", totalFailedPendingPayOut: { $sum: "$amount" } } }
        ]);

       
        const payInMap = {};
        payInData.forEach(item => payInMap[item._id.toString()] = item.totalPayIn || 0);

        const payOutMap = {};
        payOutData.forEach(item => payOutMap[item._id.toString()] = item.totalPayOut || 0);

        const failedPendingPayInMap = {};
        failedPendingPayIn.forEach(item => failedPendingPayInMap[item._id.toString()] = item.totalFailedPendingPayIn || 0);

        const failedPendingPayOutMap = {};
        failedPendingPayOut.forEach(item => failedPendingPayOutMap[item._id.toString()] = item.totalFailedPendingPayOut || 0);

       
        const user = await User.findById(userObjectId);
        if (!user) throw new Error("User not found.");

        
        const totalPayIn = payInMap[user._id.toString()] || 0;
        const totalPayOut = payOutMap[user._id.toString()] || 0;
        const failedPendingPayInTotal = failedPendingPayInMap[user._id.toString()] || 0;
        const failedPendingPayOutTotal = failedPendingPayOutMap[user._id.toString()] || 0;
        const availableBalance = totalPayIn - totalPayOut;

       
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
      
      const payInData = await PayIn.aggregate([
          { $match: { status: "Approved" } },
          { 
              $group: {
                  _id: "$userId",
                  totalPayIn: { $sum: "$amount" }
              } 
          }
      ]);

     
      const payOutData = await PayOut.aggregate([
          { $match: { status: "Approved" } },
          { 
              $group: {
                  _id: "$userId",
                  totalPayOut: { $sum: "$amount" }
              } 
          }
      ]);

    
      const payInMap = {};
      payInData.forEach(item => {
          payInMap[item._id.toString()] = item.totalPayIn;
      });

      const payOutMap = {};
      payOutData.forEach(item => {
          payOutMap[item._id.toString()] = item.totalPayOut;
      });

     
      const users = await User.find({}, "name email mobileNumber role");
  
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