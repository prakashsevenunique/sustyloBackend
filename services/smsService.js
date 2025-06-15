const axios = require("axios");
require("dotenv").config();

exports.sendAppLinkSMS = async (mobile) => {
  try {
    const response = await axios.post(
      process.env.FAST2SMS_API,
      {
        message: "Download SuStylo App: https://play.google.com/store/apps/details?id=com.sustylo",
        language: "english",
        route: "q", // or use "dlt_manual" if you're using DLT
        numbers: mobile
      },
      {
        headers: {
          authorization: process.env.FAST2SMS_API_KEY,
          "Content-Type": "application/json"
        }
      }
    );

    if (response.data.return === true) {
      return { success: true, message: "SMS sent successfully" };
    } else {
      return { success: false, error: response.data.message || "Fast2SMS error" };
    }

  } catch (error) {
    console.error("❌ Fast2SMS Error:", error.response?.data || error.message);
    return { success: false, error: error.message };
  }
};