const axios = require("axios");
const OTP = require("../models/otpModel"); 


const generateOtp = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};


const sendOtp = async (mobileNumber, otp) => {
  try {
    const apiKey = "8Ke0teaW2mo5i6yh7A06YzMookM9RjGrTKSsd5AlJEm2gOozuql50GOqKm4e"; 
    const senderId = "FINUNI"; 
    const message = `Dear user, Your OTP for login is ${otp}. Do not share with anyone - Finunique Small Pvt. Ltd.`;

    if (!apiKey || !senderId) {
      console.error("❌ Missing API Key or Sender ID");
      throw new Error("Fast2SMS API key or Sender ID is missing");
    }

    const params = {
      route: "q",
      sender_id: senderId,
      message,
      language: "english",
      numbers: mobileNumber,
    };

    console.log("📤 Sending OTP with Params:", params); 

    const response = await axios.post("https://www.fast2sms.com/dev/bulkV2", params, {
      headers: { authorization: apiKey }, 
    });

    console.log("✅ Fast2SMS Response:", response.data);

    if (response.data.return) {
     
      await OTP.create({ mobileNumber, otp, createdAt: new Date() });
      return { success: true, message: "OTP sent successfully" };
    } else {
      return { success: false, message: response.data.message || "Failed to send OTP" };
    }
  } catch (error) {
    if (error.response) {
      console.error("❌ Error in sendOtp - Response Error:", error.response.data);
      return { success: false, message: error.response.data.message || "Failed to send OTP" };
    } else {
      console.error("❌ Error in sendOtp - General Error:", error.message);
      return { success: false, message: "Error sending OTP" };
    }
  }
};


const verifyOtp = async (mobileNumber, otp) => {
  try {
    const storedOtp = await OTP.findOne({ mobileNumber });

    if (!storedOtp) {
      return { success: false, message: "OTP has expired or is invalid, request a new one" };
    }

    
    const now = new Date();
    const otpAge = (now - storedOtp.createdAt) / 60000;
    if (otpAge > 5) {
      await OTP.deleteOne({ mobileNumber }); 
      return { success: false, message: "OTP has expired, request a new one" };
    }

    if (storedOtp.otp !== otp) {
      return { success: false, message: "Invalid OTP" };
    }

   
    await OTP.deleteOne({ mobileNumber });

    return { success: true, message: "OTP verified successfully" };
  } catch (error) {
    console.error("❌ Error in verifyOtp:", error);
    return { success: false, message: "Error verifying OTP" };
  }
};


module.exports = { generateOtp, sendOtp, verifyOtp };
