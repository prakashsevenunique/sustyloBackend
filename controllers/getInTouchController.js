const GetInTouch = require("../models/GetInTouch");

// Add entry
exports.addGetInTouch = async (req, res) => {
  try {
    const { name, email, mobile } = req.body;

    if (!name || !email || !mobile) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const newEntry = new GetInTouch({ name, email, mobile });
    await newEntry.save();

    res.status(200).json({ message: "Submitted successfully", data: newEntry });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all entries (admin panel)
exports.getAllGetInTouch = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [entries, total] = await Promise.all([
      GetInTouch.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      GetInTouch.countDocuments()
    ]);

    res.status(200).json({
      message: "Fetched successfully",
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalEntries: total,
      data: entries
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};