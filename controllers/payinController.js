const { default: axios } = require("axios");
const PayIn = require("../models/payin");
const Wallet = require("../models/Wallet");
const mongoose = require('mongoose');

const payIn = async (req, res) => {
 
  const {amount, reference, name, mobile, email, userId} = req.body;
 
  if (!amount || !reference || !name || !mobile || !email || !userId) {
    return res.send("All fields are required");
  }
 
  const payInData = await axios.post(
    "https://api.worldpayme.com/api/v1.1/createUpiIntent",
    {
      amount,
      reference,
      name,
      email,
      mobile
    },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI4IiwianRpIjoiMTdiODhhYmZjMTNhMDZmYzcxMzMzZjVkMmYzMTE0YzM3OTc1ZmE2OWY1ZWZlMjViZmQ2YjE2M2ZhOTNmOTZiZjJkMDQxYmFjZWEwZTU5MTEiLCJpYXQiOjE3NDQ5NTU3ODEuMzkwMDA4LCJuYmYiOjE3NDQ5NTU3ODEuMzkwMDEsImV4cCI6MTc3NjQ5MTc4MS4zODc2MTUsInN1YiI6IjI1NiIsInNjb3BlcyI6W119.S9FPsBiod-TXlWf-t2zB0DegZ7EZrzpP1g-YaiIA6oTNayIANqDTVzmFy7llw3jyGF4uOzC8nqstuNJ727amo0qVtgC4rb1C-Sfek4RUUUstjKl5hnSHZe63cH0ss5TZ5K_QrXouHNtibggzJ6PECIEA4Q_9WMmoPWK3pe06wNUk94OctGxgDtvzqDGB-CQK9bfpdPTiUWA_b7EyN6rQ6JUYcKDN1Crw8snH3gdKz5dT91KHhQd6SzCueHcPMJpc2HbgNfxn_WqBWB7VUMURRaLW4o4Yj-fTpkiBrgyoR1i0f-Kq0E5H-YEUHTzZTaOVzkbucd2gg9kX2qo_LeVFidFJsJrJ-qOQuwUYlVpAOOO_T-oILchC-TNOqHALeUfxtNYXlsps7SsCW4qrOLr6CEPm2deojgXO5B_VEUSfHrff9VWLmIOqX5V1VFr7qocoVxq8QEuHFCXDbaes7YwxLayactAhPKwPlkmQopr9syYS9swsHWgwtQET0vLI-RD78Cg59Z9AqVOZB1df_J4ZjXBOzURCoFGqs5YgsDFZD2hhTWVoynBKa5D694wBrOyr2U1hEOgW90pjx5_6VRmPGyP60hHeZDuBUPdzioh5M-LL5Ivhy076jVEeuGi3U8VlCSxU2iOqRqaOUOMASKqevVHPoxznqhCtMXlQa3V31v4`,
      },
    }
  );
  console.log(payInData.data);
  if (payInData.data) {
    const newPayIn = new PayIn({
      userId: new mongoose.Types.ObjectId(userId), 
      amount,
      reference,
      name,
      mobile,
      email
    });

   
    await newPayIn.save();
    return res
      .status(200)
      .send({
        data: payInData.data,
        status: payInData.data.status,
        message: "Payment data saved successfully in the database.",
      });
  } else {
    return res.status(400).send("bad request");
  }
};

const callbackPayIn = async (req, res) => {
  try {
    const data = req.body;
    console.log("data in callback request: ", data);
    const payin = await PayIn.findOne({ reference: data.reference });

    if (!payin) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    if (data.status === "Success") {
     
      const userWallet = await Wallet.findOne({user: payin.userId});
      console.log("user wallet is:", userWallet);


      payin.status = "Approved";

      payin.utr = data.utr;
      await payin.save();

      userWallet.balance += payin.amount;
        await userWallet.save();

      return res.status(200).json({ message: "PayIn successful", payin });
    }

   
    payin.status = "Failed";
    await payin.save();

    return res.status(400).json({ message: "Payment Failed", payin });
  } catch (error) {
    console.error("Error in callback response", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// const callbackPayIn = async (req, res) => {
//   try {
//     const data = req.body;
//     console.log("data in callback request: ", data);
//     const payin = await PayIn.findOne({ reference: data.reference });

//     if (!payin) {
//       return res.status(404).json({ message: "Transaction not found" });
//     }

//     if (data.status === "Success") {
     
     
//       payin.status = "Approved";
//       payin.utr = data.utr;
//       await payin.save();

     

//       return res.status(200).json({ message: "PayIn successful", payin });
//     }

   
//     payin.status = "Failed";
//     await payin.save();

//     return res.status(400).json({ message: "Payment Failed", payin });
//   } catch (error) {
//     console.error("Error in callback response", error);
//     return res.status(500).json({ message: "Something went wrong" });
//   }
// };

const getPayInRes = async (req, res) =>{
  const {reference} = req.query;
  const payin = await PayIn.findOne({reference});
  if(!payin){
    return res.status(404).send("No data found");
  }
  return res.status(200).send(payin);
}

const payInReportAllUsers = async (req, res) => {
  try {
    const { userId, startDate, endDate, status, paymentGateway } = req.query; 

    let filter = {};

    if (userId) {
      filter.userId = new mongoose.Types.ObjectId(userId);
    }
    if (status) {
      filter.status = status;
    }
    if (paymentGateway) {
      filter.paymentGateway = paymentGateway; 
    }
    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    
    const payIns = await PayIn.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      {
        $project: {
          _id: 1,
          userId: 1,
          "userDetails.name": 1,
          "userDetails.email": 1,
          amount: 1,
          reference: 1,
          paymentGateway: 1,
          paymentMode: 1,
          status: 1,
          utr: 1,
          createdAt: 1,
        },
      },
      { $sort: { createdAt: -1 } }, 
    ]);

    return res.status(200).json({ success: true, data: payIns });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

module.exports = { payIn, callbackPayIn, getPayInRes, payInReportAllUsers};