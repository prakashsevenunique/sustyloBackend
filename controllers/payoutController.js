const { default: axios } = require("axios");

const PayOut = require("../models/payout");
const Wallet = require("../models/Wallet");
const mongoose = require("mongoose");

const payOut = async (req, res) => {
  const {
    userId,
    amount,
    reference,
    trans_mode,
    account,
    ifsc,
    name,
    mobile,
    email,
    address,
    description
  } = req.body;

  if (!amount || !reference || !name || !mobile || !email || !trans_mode) {
    return res.status(400).send("All fields are required");
  }

  const existingPayout = await PayOut.findOne({ reference });
  if (existingPayout) {
    return res.status(409).send({
      message: "A payout with this reference already exists.",
    });
  }

  const newPayOut = new PayOut({
    userId: new mongoose.Types.ObjectId(userId),
    amount,
    reference,
    trans_mode,
    account,
    ifsc,
    name,
    mobile,
    email,
    address,
    description: description || "paid for order"
  });

  await newPayOut.save();

  const wallet = await Wallet.findOne({ user: userId });
  wallet.balance += amount;
  await wallet.save();

  return res.status(200).send({
    message: "Payment data saved successfully in the database.",
  });
};

const adminAction = async (req, res) => {
  const { action, reference } = req.body;
  const payout = await PayOut.findOne({ reference });
  if (!payout) {
    return res.status(404).send("No payout transaction found");
  }

  if (action === "APPROVE") {
    payout.adminAction = "Approved";
    await payout.save();
    const {
      amount,
      reference,
      trans_mode,
      account,
      ifsc,
      name,
      email,
      mobile,
      address,
    } = payout;

    try {
      const payOutData = await axios.post(
        "https://api.worldpayme.com/api/v1.1/payoutTransaction",
        {
          amount: amount,
          reference: reference,
          trans_mode: trans_mode,
          account: account,
          ifsc: ifsc,
          name: name,
          email: email,
          mobile: mobile,
          address: address,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI4IiwianRpIjoiMTdiODhhYmZjMTNhMDZmYzcxMzMzZjVkMmYzMTE0YzM3OTc1ZmE2OWY1ZWZlMjViZmQ2YjE2M2ZhOTNmOTZiZjJkMDQxYmFjZWEwZTU5MTEiLCJpYXQiOjE3NDQ5NTU3ODEuMzkwMDA4LCJuYmYiOjE3NDQ5NTU3ODEuMzkwMDEsImV4cCI6MTc3NjQ5MTc4MS4zODc2MTUsInN1YiI6IjI1NiIsInNjb3BlcyI6W119.S9FPsBiod-TXlWf-t2zB0DegZ7EZrzpP1g-YaiIA6oTNayIANqDTVzmFy7llw3jyGF4uOzC8nqstuNJ727amo0qVtgC4rb1C-Sfek4RUUUstjKl5hnSHZe63cH0ss5TZ5K_QrXouHNtibggzJ6PECIEA4Q_9WMmoPWK3pe06wNUk94OctGxgDtvzqDGB-CQK9bfpdPTiUWA_b7EyN6rQ6JUYcKDN1Crw8snH3gdKz5dT91KHhQd6SzCueHcPMJpc2HbgNfxn_WqBWB7VUMURRaLW4o4Yj-fTpkiBrgyoR1i0f-Kq0E5H-YEUHTzZTaOVzkbucd2gg9kX2qo_LeVFidFJsJrJ-qOQuwUYlVpAOOO_T-oILchC-TNOqHALeUfxtNYXlsps7SsCW4qrOLr6CEPm2deojgXO5B_VEUSfHrff9VWLmIOqX5V1VFr7qocoVxq8QEuHFCXDbaes7YwxLayactAhPKwPlkmQopr9syYS9swsHWgwtQET0vLI-RD78Cg59Z9AqVOZB1df_J4ZjXBOzURCoFGqs5YgsDFZD2hhTWVoynBKa5D694wBrOyr2U1hEOgW90pjx5_6VRmPGyP60hHeZDuBUPdzioh5M-LL5Ivhy076jVEeuGi3U8VlCSxU2iOqRqaOUOMASKqevVHPoxznqhCtMXlQa3V31v4`,
          },
        }
      );
      return res.status(200).send({
        data: payOutData.data,
        message: "Payment data saved successfully in the database.",
      });
    } catch (error) {
      return res
        .status(500)
        .send("Internal server error while calling external payout service");
    }
  } else {
    payout.adminAction = "Rejected";
    payout.status = "Failed";
    await payout.save();
    return res.status(400).mm.send("Payout Request rejected by admin");
  }
};

const callbackPayout = async (req, res) => {
  try {
    const { status, reference, utr } = req.query;
    const payout = await PayOut.findOne({ reference });

    if (!payout) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    if (status === "Success") {
      const userWallet = await Wallet.findOne({ user: payout.userId });
      userWallet.balance -= payout.amount;
      await userWallet.save();
      payout.status = "Approved";
      payout.utr = utr;
      await payout.save();
      return res.status(200).json({ message: "PayOut successful", payout });
    }
    payout.status = "Failed";
    await payout.save();
    return res.status(400).json({ message: "Payment Failed", payout });
  } catch (error) {
    console.error("Error in callback response", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

const payOutReportAllUsers = async (req, res) => {
  try {
    const { userId, startDate, endDate, status } = req.query;

    let filter = {};

    if (userId) {
      filter.userId = new mongoose.Types.ObjectId(userId);
    }
    if (status) {
      filter.status = status;
    }
    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }


    const payouts = await PayOut.aggregate([
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
          trans_mode: 1,
          account: 1,
          ifsc: 1,
          status: 1,
          txn_id: 1,
          createdAt: 1,
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    return res.status(200).json({ success: true, data: payouts });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

module.exports = { payOut, adminAction, callbackPayout, payOutReportAllUsers };