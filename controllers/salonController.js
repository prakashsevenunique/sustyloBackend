const Salon = require("../models/salon");
const User = require("../models/User");

// ✅ Register Salon (With File Uploads)
exports.registerSalon = async (req, res) => {
    try {
        console.log("🚀 Incoming Request for Salon Registration");
        console.log("Request Body:", req.body);

        const { ownerName, salonName, mobile, email, locationMapUrl, salonAddress } = req.body;

        // ✅ Ensure all required fields are provided
        if (!ownerName || !salonName || !mobile || !email || !locationMapUrl || !salonAddress) {
            return res.status(400).json({ message: "All fields are required!" });
        }

        // ✅ Check if the salon already exists by mobile number
        const existingSalon = await Salon.findOne({ mobile });
        if (existingSalon) {
            return res.status(400).json({ message: "Salon with this mobile number already exists." });
        }

        // ✅ Create new salon (without photos & agreement)
        const newSalon = new Salon({
            ownerName,
            salonName,
            mobile,
            email,
            locationMapUrl,
            salonAddress
        });

        await newSalon.save();

        res.status(201).json({
            message: "Salon registered successfully! You can now upload photos via the update API.",
            salon: newSalon
        });
    } catch (error) {
        console.error("❌ Error:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};  

// ✅ Update Salon (Admin Approval & Edits)
exports.updateSalon = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        console.log("🛠️ Updating Salon:", id);
        console.log("Request Body:", updateData);
        console.log("Uploaded Files:", req.files); // ✅ Debugging File Upload

        // ✅ Find existing salon
        const salon = await Salon.findById(id);
        if (!salon) {
            return res.status(404).json({ message: "Salon not found." });
        }

        // ✅ Handle New Photos (Minimum 3 Required)
        let newSalonPhotos = salon.salonPhotos;
        if (req.files["salonPhotos"]) {
            const uploadedPhotos = req.files["salonPhotos"].map(file => file.path);

            if (uploadedPhotos.length < 3) {
                return res.status(400).json({ message: "At least 3 salon photos are required." });
            }

            newSalonPhotos = uploadedPhotos;
        }

        // ✅ Handle New Agreement File (Optional)
        let newSalonAgreement = salon.salonAgreement;
        if (req.files["salonAgreement"]) {
            newSalonAgreement = req.files["salonAgreement"][0].path;
        }

        // ✅ Update salon details
        Object.assign(salon, updateData);
        salon.salonPhotos = newSalonPhotos;
        salon.salonAgreement = newSalonAgreement;

        await salon.save();

        res.status(200).json({
            message: "Salon updated successfully!",
            salon
        });
    } catch (error) {
        console.error("❌ Internal Server Error:", error);
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

        if (gender) {
            query["services.gender"] = gender;
        }

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
                $match: query
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
                $sort: { distance: 1, averageRating: -1 }
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

// ✅ Add Review to Salon
exports.addReview = async (req, res) => {
    try {
        const { salonId } = req.params;
        const { rating, comment, phone } = req.body;

        const user = await User.findOne({ phone });
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        const salon = await Salon.findById(salonId);
        if (!salon) {
            return res.status(404).json({ message: "Salon not found." });
        }

        const newReview = {
            userId: user._id,
            rating,
            comment,
        };

        salon.reviews.push(newReview);
        await salon.save();

        res.status(201).json({ message: "Review added successfully.", salon });
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};
