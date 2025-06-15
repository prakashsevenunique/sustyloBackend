const { sendAppLinkSMS } = require("../services/smsService");
const { isValidMobile } = require("../utils/validateMobile");

exports.shareAppLink = async (req, res) => {
  try {
    const { mobile } = req.body;

    if (!mobile || !isValidMobile(mobile)) {
      return res.status(400).json({ message: "Invalid or missing mobile number." });
    }

    const result = await sendAppLinkSMS(mobile);

    if (result.success) {
      return res.status(200).json({ message: "App link sent successfully!" });
    } else {
      return res.status(500).json({ message: "Failed to send SMS", error: result.error });
    }

  } catch (error) {
    console.error("❌ Error in shareAppLink:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
