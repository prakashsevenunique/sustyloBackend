const Salon = require("../models/salon");
const User = require("../models/User");
const haversine = require('haversine');

// ✅ Register Salon (Owner fills basic details)
exports.registerSalon = async (req, res) => {
    try {
        const { ownerName, salonName, mobile, email, salonAddress, latitude, longitude, services, category } = req.body;

        // Check if salon with the same mobile already exists
        const existingSalon = await Salon.findOne({ mobile });
        if (existingSalon) {
            return res.status(400).json({ message: "Salon with this mobile number already exists." });
        }

        // Ensure latitude & longitude are valid
        if (!latitude || !longitude) {
            return res.status(400).json({ message: "Latitude and Longitude are required." });
        }

        // Create new salon with correct location format
        const newSalon = new Salon({
            ownerName,
            salonName,
            mobile,
            email,
            salonAddress,
            location: {
                type: "Point",
                coordinates: [parseFloat(longitude), parseFloat(latitude)] // Correct format [longitude, latitude]
            },
            status: "pending", // Default status is "pending"
            services: services || [], // Default empty array if no services provided
            category: category || "", // Optional category
        });

        await newSalon.save();

        res.status(201).json({
            message: "Salon registered successfully. Awaiting admin approval.",
            salon: newSalon
        });
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};


// ✅ Admin Updates Salon (Approval Process)
exports.updateSalon = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const updatedSalon = await Salon.findByIdAndUpdate(id, updateData, { new: true });

        if (!updatedSalon) return res.status(404).json({ message: "Salon not found." });

        res.status(200).json({ message: "Salon details updated successfully.", salon: updatedSalon });
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};

// ✅ Get Salon by ID
exports.getSalonById = async (req, res) => {
    try {
        const { id } = req.params;
        const salon = await Salon.findById(id);

        if (!salon) return res.status(404).json({ message: "Salon not found." });

        res.status(200).json({ salon });
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};

// ✅ Get All Salons (With Status Filter)
exports.getAllSalons = async (req, res) => {
    try {
        const { status } = req.query;
        let query = {};

        if (status) {
            if (!["pending", "approved"].includes(status)) {
                return res.status(400).json({ message: "Invalid status. Use 'pending' or 'approved'." });
            }
            query.status = status;
        }

        const salons = await Salon.find(query);

        res.status(200).json({ count: salons.length, salons });
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};

// ✅ Get Nearby Salons Based on User Location
exports.getNearbySalons = async (req, res) => {
    try {
        const { latitude, longitude, gender, category } = req.query;

        if (!latitude || !longitude) {
            return res.status(400).json({ message: "Latitude and Longitude are required." });
        }

        const userLocation = [parseFloat(longitude), parseFloat(latitude)]; // MongoDB needs [long, lat]

        const query = {};

        // Filter by gender if provided
        if (gender) {
            query["services.gender"] = gender;
        }

        // Filter by category if provided
        if (category) {
            query["services.name"] = { $regex: category, $options: "i" };
        }

        const salons = await Salon.aggregate([
            {
                $geoNear: {
                    near: { type: "Point", coordinates: userLocation },
                    distanceField: "distance",
                    spherical: true
                }
            },
            {
                $match: query // Apply gender and category filters
            },
            {
                $lookup: {
                    from: "reviews",
                    localField: "_id",
                    foreignField: "salonId",
                    as: "reviews"
                }
            },
            {
                $addFields: {
                    averageRating: { $ifNull: [{ $avg: "$reviews.rating" }, 0] }
                }
            },
            {
                $sort: { distance: 1, averageRating: -1 } // Nearest first, then highest rating
            }
        ]);

        if (salons.length === 0) {
            return res.status(404).json({ message: "No salons found." });
        }

        res.status(200).json({ count: salons.length, salons });
    } catch (error) {
        console.error("Error occurred while fetching nearby salons:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};


exports.addReview = async (req, res) => {
    try {
        const { salonId } = req.params;  // Salon ID from the URL params
        const { rating, comment, phone } = req.body;  // Rating, comment, and phone number from the request body

        // Find the user by phone number (assuming phone is passed in the request body)
        const user = await User.findOne({ phone });
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        // Find the salon by ID
        const salon = await Salon.findById(salonId);
        if (!salon) {
            return res.status(404).json({ message: "Salon not found." });
        }

        // Create a new review object
        const newReview = {
            userId: user._id, // Save the userId
            rating,
            comment,
        };

        // Add the new review to the salon's reviews array
        salon.reviews.push(newReview);

        // Recalculate the average rating after adding the review
        salon.calculateAverageRating();

        // Save the salon document with the updated reviews and average rating
        await salon.save();

        res.status(201).json({ message: "Review added successfully.", salon });
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};