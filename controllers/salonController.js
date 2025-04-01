const Salon = require("../models/salon");
const User = require("../models/User");

// ✅ Register Salon and lead (With File Uploads)
exports.SalonLead = async (req, res) => {
    try {
        console.log("🚀 Incoming Request for Salon Registration");
        console.log("Request Body:", req.body);

        const { ownerName, salonName, mobile, email, salonAddress } = req.body;

        // ✅ Ensure all required fields are provided
        if (!ownerName || !salonName || !mobile || !email || !salonAddress) {
            return res.status(400).json({ message: "All fields are required!" });
        }

        // ✅ Check if the salon already exists by mobile number
        const existingSalon = await Salon.findOne({ mobile });
        if (existingSalon) {
            return res.status(400).json({ message: "Salon with this mobile number already exists." });
        }

        // ✅ Create new salon with "pending" status
        const newSalon = new Salon({
            ownerName,
            salonName,
            mobile,
            email,
            salonAddress,
            status: "pending" // ✅ Status set to pending until full details are updated
        });

        await newSalon.save();

        res.status(201).json({
            message: "Salon registered successfully! Complete details using the update API. Status remains 'pending' until approved by admin.",
            salon: newSalon
        });
    } catch (error) {
        console.error("❌ Error:", error);
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

// ✅ Function to extract latitude & longitude from Google Maps URL
const extractLatLng = (mapUrl) => {
    const regex = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
    const match = mapUrl.match(regex);
    if (match) {
        return { latitude: parseFloat(match[1]), longitude: parseFloat(match[2]) };
    }
    return { latitude: null, longitude: null };
};

// ✅ Update Salon API (Har Detail Update Karega)
exports.updateSalon = async (req, res) => {
    try {
        const { salonId } = req.params;

        // ✅ Find existing salon
        let salon = await Salon.findById(salonId);
        if (!salon) return res.status(404).json({ error: "Salon not found" });
        console.log("salon is:", salon);
        // ✅ Extract fields from request body
        const {
            ownerName, salonName, mobile, email, salonAddress, locationMapUrl, salonTitle, salonDescription,
            socialLinks, openingHours, facilities, services, category
        } = req.body;

        // ✅ Extract latitude & longitude from Map URL
        let { latitude, longitude } = salon;
        if (locationMapUrl) {
            const coords = extractLatLng(locationMapUrl);
            latitude = coords.latitude;
            longitude = coords.longitude;
        }

        // ✅ Handle file uploads
        let salonPhotos = salon.salonPhotos || [];
        let salonAgreement = salon.salonAgreement || "";

        if (req.files && req.files["salonPhotos"]) {
            salonPhotos = req.files["salonPhotos"].map((file) => file.path);
        }

        if (req.files && req.files["salonAgreement"]) {
            salonAgreement = req.files["salonAgreement"][0].path;
        }

        // ✅ Convert services to array (agar services bheje ho to)
        let parsedServices = [];
        if (services) {
            try {
                parsedServices = JSON.parse(services);
            } catch (error) {
                return res.status(400).json({ error: "Invalid services format. Send a valid JSON array." });
            }
        }

        // ✅ Update salon details
        salon = await Salon.findByIdAndUpdate(
            salonId,
            {
                ownerName, salonName, mobile, email, salonAddress, locationMapUrl, salonTitle, salonDescription,
                socialLinks, openingHours, facilities, category, latitude, longitude,
                salonPhotos, salonAgreement, services: parsedServices
            },
            { new: true }
        );

        res.status(200).json({ message: "Salon updated successfully. Status remains 'pending' until admin approval.", salon });
    } catch (error) {
        console.error("Error updating salon:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};  

exports.approveSalon = async (req, res) => {
    try {
        const { salonId } = req.params;

        // ✅ Find salon
        let salon = await Salon.findById(salonId);
        if (!salon) return res.status(404).json({ message: "Salon not found" });

        // ✅ Ensure all details are filled before approval
        if (!salon.salonPhotos.length || !salon.salonAgreement || !salon.latitude || !salon.longitude) {
            return res.status(400).json({ message: "Complete all required details before approval." });
        }

        // ✅ Update status to "approved"
        salon.status = "approved";
        await salon.save();

        res.status(200).json({ message: "Salon approved successfully and is now live.", salon });
    } catch (error) {
        res.status(500).json({ message: "Error approving salon", error: error.message });
    }
};
  
exports.updateShopOwner = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, phone, status } = req.body;

        const owner = await User.findByIdAndUpdate(id, { name, email, phone, status }, { new: true });

        if (!owner) return res.status(404).json({ success: false, message: "Shop Owner not found" });

        res.json({ success: true, message: "Shop Owner updated successfully!", owner });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error updating shop owner", error: error.message });
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

        const lat = parseFloat(latitude);
        const lon = parseFloat(longitude);

        const salons = await Salon.find({
            latitude: { $exists: true, $ne: null },
            longitude: { $exists: true, $ne: null },
            "services.gender": gender,
            "services.name": { $regex: category, $options: "i" }
        })
        .select("salonName salonAddress salonPhotos latitude longitude services") // ✅ Only required fields
        .lean();

        if (salons.length === 0) {
            return res.status(404).json({ message: "No salons found." });
        }

        // **Calculate Distance (Haversine Formula)**
        salons.forEach((salon) => {
            const R = 6371; // Earth radius in km
            const dLat = (Math.PI / 180) * (salon.latitude - lat);
            const dLon = (Math.PI / 180) * (salon.longitude - lon);
            const a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos((Math.PI / 180) * lat) *
                Math.cos((Math.PI / 180) * salon.latitude) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            salon.distance = R * c; // Distance in km
        });

        salons.sort((a, b) => a.distance - b.distance); // ✅ Nearest first

        // **Filter Services (only category-matched services)**
        const filteredSalons = salons.map((salon) => ({
            salonName: salon.salonName,
            salonAddress: salon.salonAddress,
            salonPhotos: salon.salonPhotos,
            distance: salon.distance.toFixed(2) + " km",
            services: salon.services.filter(service => 
                service.gender === gender && 
                new RegExp(category, "i").test(service.name)
            )
        }));

        res.status(200).json({ count: filteredSalons.length, salons: filteredSalons });
    } catch (error) {
        console.error("Error fetching nearby salons:", error);
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
