const { default: axios } = require("axios");
const PayIn = require("../models/payin");

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
        Authorization: `Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI4IiwianRpIjoiOTcwY2YwZTE1NjcxMGIwZDQ3ZWZlOWY0ZWNjYmJkZDMxNjhmNWMxODc3MzE4ZTgwNzdmNmVmNTczOTZlZDIyNjkwNTZiOWNiZTFmNTBlMjEiLCJpYXQiOjE3NDA5NzgxMzkuOTk5MjM0LCJuYmYiOjE3NDA5NzgxMzkuOTk5MjM1LCJleHAiOjE3NzI1MTQxMzkuOTk2NjgxLCJzdWIiOiIyMzciLCJzY29wZXMiOltdfQ.lakPf6sw_uhlkeLzX0iWt3YAkeC4lJd-lici6uc_of4EIEJjMakV9xr77rv35jpNbw2QYDWpVbtNYMZeAWIaX5T9TnbPtI0_J0yyUr6WoKmNtV6xjCU5rJz-QGuLgvg-uurNxsWXW2mo3j3t202fvZPsCdY0PzLlWzDiLQJ8DjKIK10oLagBR7WANafjNujtX84A9wy9xYX1LDNwQtI6d6EjMg4TKwt3MazawXh57TjFC7X4bYMlSNshvCXICMSEQ8z_20GZqBAXtjguPjAmzpgVMD7hcMn4iGLP4Oqfo0hD36xvcszWk62IxsBlNHzwf9SJ6tEqWjJKZ7m36uOT79UEXJXQiPkguqbKZ2G3nQu8HN4rm0ccOFqnqKloNaDQJtbVn9N0PPN_ho_RqrNhA02Ut-BdTWbH8-y2DCQNHJeuf8Iee0f934dlnZPaNC76RHhgyKmsc2eaSmpEr9SGe6P-4BJ-pIJkkyl7xHCT4pu2t9Elt7lpjQW_BwztEZ8SJQNQVkv5hvXrtC-KAdnJ7ZAzMPxmCjSaFRgMGLnHr_iQiS8rTgfQFGBXSK4NXXVClaf0-EFoYIVIWUkhgoDMDJKmcjCDLPxOyjOfGy8Ha3oHvMzalEcLGX13f8a4EzzGPcZ3ZSfo3iqbBTNeFkgMr-39I5d9L5iAGYNz4wFiKA8`,
      },
    }
  );
  console.log(payInData.data);
  if (payInData.data) {
    const newPayIn = new PayIn({
      userId: new mongoose.Types.ObjectId(userId), // Ensuring the userID is a valid ObjectId
      amount,
      reference,
      name,
      mobile,
      email
    });

    // Save the record to MongoDB
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
     
      // Update PayIn Transaction
      payin.status = "Approved";
      payin.utr = data.utr;
      await payin.save();

      // // Log Transaction History
      // await Transaction.create({
      //   userId: retailer._id,
      //   type: "PayIn",
      //   amount: payin.amount,
      //   status: "Success",
      //   reference: data.reference
      // });

      return res.status(200).json({ message: "PayIn successful", payin });
    }

    // Handle Failed Transaction
    payin.status = "Failed";
    await payin.save();

    return res.status(400).json({ message: "Payment Failed", payin });
  } catch (error) {
    console.error("Error in callback response", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

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
    const { userId, startDate, endDate, status, paymentGateway } = req.query; // Query Parameters

    let filter = {};

    if (userId) {
      filter.userId = new mongoose.Types.ObjectId(userId);
    }
    if (status) {
      filter.status = status; // Pending, Approved, Failed
    }
    if (paymentGateway) {
      filter.paymentGateway = paymentGateway; // Razorpay, Paytm, etc.
    }
    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Aggregation Pipeline
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