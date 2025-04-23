const GetInTouch = require("../models/GetInTouch");

// Add entry
exports.addGetInTouch = async (req, res) => {
  try {
    const { name, email, mobile, type } = req.body;

    if (!name || !email || !mobile || !type) {
      return res.status(400).json({ message: "All fields are required including type" });
    }

    if (!["user", "salonOwner"].includes(type)) {
      return res.status(400).json({ message: "Type must be either 'user' or 'salonOwner'" });
    }

    const newEntry = new GetInTouch({ name, email, mobile, type });
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
    const type = req.query.type; // Optional filter: user or salonOwner

    // Build dynamic query object
    let query = {};
    if (type) {
      query.type = type;
    }

    const [entries, total] = await Promise.all([
      GetInTouch.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      GetInTouch.countDocuments(query)
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
