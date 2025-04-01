const PayIn = require("../models/payin");
const PayOut= require("../models/payout");
const User =require("../models/User");

const {userWallet, allUserWallet} = require("../services/mainWalletServices");

exports.allUserWalletreport = async (req, res) => {
  try {
      const finalData = await allUserWallet();

      return res.status(200).json({
          success: true,
          data: finalData
      });

  } catch (error) {
      console.error("Error in payingwalletreport API:", error);
      return res.status(500).json({
          success: false,
          message: "Something went wrong",
          error: error.message
      });
  }
};

exports.userWalletreport = async (req, res) => {
    try {
        // Step 1: Get the user identifier (e.g., from the request params or body)
        const userId = req.params.userId ;
  
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID is required."
            });
        }
        
        const data = await userWallet(userId);

        // Step 2: Aggregate total pay-in amount for the specific user (Only Approved Transactions)
        return res.status(200).json({
            success: true,
            data: data
        });
  
    } catch (error) {
        console.error("Error in userWalletreport API:", error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong",
            error: error.message
        });
    }
  };