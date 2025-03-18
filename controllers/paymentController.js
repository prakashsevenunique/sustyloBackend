const { default: axios } = require("axios");
const PayIn = require("../models/payment");
const mongoose = require("mongoose");

const payIn = async (req, res) => {
  const { amount, reference, name, mobile, email, userId } = req.body;

  if (!amount || !reference || !name || !mobile || !email || !userId) {
    return res.status(400).json({ message: "All fields are required" });
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }

  try {
    const payInData = await axios.post(
      "https://api.worldpayme.com/api/v1.1/createUpiIntent",
      { amount, reference, name, email, mobile },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.WORLDPAY_BEARER_TOKEN}`,
        },
      }
    );

    if (!payInData.data) {
      return res.status(400).json({ message: "Payment request failed" });
    }

    const newPayIn = new PayIn({
      userId: new mongoose.Types.ObjectId(userId),
      amount,
      reference,
      name,
      mobile,
      email,
      status: "Pending",
    });

    await newPayIn.save();
    return res.status(200).json({
      data: payInData.data,
      status: payInData.data.status,
      message: "Payment data saved successfully in the database.",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Payment API Error",
      error: error.response?.data || error.message,
    });
  }
};

const callbackPayIn = async (req, res) => {
  try {
    const data = req.body;
    const payin = await PayIn.findOne({ reference: data.reference });

    if (!payin) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    if (data.status === "Success") {
      if (!data.utr) {
        return res.status(400).json({ message: "UTR missing in success response" });
      }
      payin.status = "Approved";
      payin.utr = data.utr;
      await payin.save();

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

const getPayInRes = async (req, res) => {
  const { reference } = req.query;
  const payin = await PayIn.findOne({ reference });
  if (!payin) {
    return res.status(404).json({ message: "No data found" });
  }
  return res.status(200).json({ success: true, data: payin });
};

const payInReportAllUsers = async (req, res) => {
  try {
    const { userId, startDate, endDate, status, paymentGateway } = req.query;

    let filter = {};
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      filter.userId = new mongoose.Types.ObjectId(userId);
    }
    if (status) {
      filter.status = status;
    }
    if (paymentGateway) {
      filter.paymentGateway = paymentGateway;
    }
    if (startDate && endDate) {
      filter.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
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
          amount: 1,
          reference: 1,
          paymentGateway: 1,
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

module.exports = { payIn, callbackPayIn, getPayInRes, payInReportAllUsers };
