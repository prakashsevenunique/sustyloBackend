const Salon = require("../models/salon");
const User = require("../models/User");
const mongoose = require("mongoose");

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
        console.log("📌 Update Salon API hit with Salon ID:", salonId);

        // ✅ Validate Salon ID
        if (!mongoose.Types.ObjectId.isValid(salonId)) {
            return res.status(400).json({ error: "Invalid Salon ID" });
        }

        // ✅ Find existing salon
        let salon = await Salon.findById(salonId);
        if (!salon) {
            console.error("🚨 Salon not found:", salonId);
            return res.status(404).json({ error: "Salon not found" });
        }

        console.log("📌 Existing Salon Data:", salon);
        console.log("📌 Request Body:", req.body);

        const {
            ownerName, salonName, mobile, email, salonAddress, locationMapUrl, salonTitle, salonDescription,
            socialLinks, openingHours, facilities, services, category
        } = req.body;

        // ✅ Check if the new email is already in use by another salon
        if (email && email !== salon.email) {
            const existingSalon = await Salon.findOne({ email });
            if (existingSalon) {
                return res.status(400).json({ error: "This email is already used by another salon." });
            }
        }

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

        // ✅ Convert services to array
        let parsedServices = [];
        if (services) {
            try {
                parsedServices = JSON.parse(services);
                if (!Array.isArray(parsedServices)) {
                    return res.status(400).json({ error: "Services should be a JSON array." });
                }
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

        console.log("✅ Salon Updated Successfully:", salon);
        res.status(200).json({ message: "Salon updated successfully. Status remains 'pending' until admin approval.", salon });
    } catch (error) {
        console.error("🚨 Error updating salon:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });

    }
};

exports.approveSalon = async (req, res) => {
    try {
        const { salonId } = req.params;
        let salon = await Salon.findById(salonId);

        if (!salon) return res.status(404).json({ message: "Salon not found" });

        // 🧹 Clean incomplete service entries to avoid validation error
        salon.services = salon.services.filter(service =>
            service.title && service.description && service.rate && service.duration && service.gender
        );

        // ✅ Approve salon
        salon.status = "approved";
        await salon.save();

        res.status(200).json({ message: "Salon approved successfully", salon });
    } catch (error) {
        console.error("❌ Error approving salon:", error);
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
        const { latitude, longitude ,search} = req.query;

        const searches = search || ''; // e.g., "gentel" or "haircut"
        const status = "approve"; // show only approved salons

        if (!latitude || !longitude) {
            return res.status(400).json({ message: "Latitude and Longitude are required." });
        }

        const lat = parseFloat(latitude);
        const lon = parseFloat(longitude);


        // Convert all stored lat/lng to numbers to avoid mismatches
        await Salon.updateMany({}, [
            {
                $set: {
                    latitude: { $toDouble: "$latitude" },
                    longitude: { $toDouble: "$longitude" }
                }
            }
        ]);

        // Function to calculate distance
        const calculateDistance = (salonLat, salonLon) => {
            const R = 6371; // Earth radius in km
            const dLat = (Math.PI / 180) * (salonLat - lat);
            const dLon = (Math.PI / 180) * (salonLon - lon);
            const a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos((Math.PI / 180) * lat) *
                Math.cos((Math.PI / 180) * salonLat) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return R * c; // Distance in km
        };

        const searchWithinRadius = async (radius) => {
            console.log(`🔍 Searching salons within ${radius} km...`);

            const salons = await Salon.find({
                latitude: { $exists: true, $ne: null },
                longitude: { $exists: true, $ne: null },
                status: status,
                $or: [
                    { 'services.category': { $regex: searches, $options: 'i' } },
                ] // optional additional category filter
            }).lean();

            // Calculate distance for each salon
            const filteredSalons = salons
                .map(salon => {
                    salon.latitude = parseFloat(salon.latitude);
                    salon.longitude = parseFloat(salon.longitude);
                    salon.distance = calculateDistance(salon.latitude, salon.longitude);
                    return salon;
                })
                .filter(salon => salon.distance <= radius) // Filter salons within the radius
                .sort((a, b) => a.distance - b.distance); // Sort by distance
            console.log(`Found ${filteredSalons.length} salons within ${radius} km`);
            return filteredSalons;
        };

        // Check in increasing radius
        let salons = await searchWithinRadius(2);
        if (salons.length === 0) salons = await searchWithinRadius(5);
        if (salons.length === 0) salons = await searchWithinRadius(10);

        if (salons.length === 0) {
            return res.status(404).json({ message: "No salons found." });
        }

        res.status(200).json({ count: salons.length, salons });

    } catch (error) {
        console.error("🚨 Error:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};

exports.getTopReviewedSalons = async (req, res) => {
    try {
        console.log("🔍 Searching for top 5 reviewed salons...");

        // Find top 5 salons sorted by review count in descending order
        const salons = await Salon.find({
            reviews: { $exists: true, $ne: null } // Ensure reviews exist
        })
            .sort({ "reviews.length": -1 }) // Sort by review count (highest first)
            .limit(5) // Only get the top 5 salons
            .lean();

        console.log(`🟢 Found ${salons.length} top reviewed salons`);

        if (salons.length === 0) {
            return res.status(404).json({ message: "No reviewed salons found." });
        }

        res.status(200).json({ count: salons.length, salons });

    } catch (error) {
        console.error("🚨 Error:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};

// Haversine formula helper (if not using GeoJSON)
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    function deg2rad(deg) {
        return deg * (Math.PI / 180);
    }
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(deg2rad(lat1)) *
        Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

exports.getNearbySalonsByService = async (req, res) => {
    try {
        const { latitude, longitude, service } = req.query;

        if (!latitude || !longitude || !service) {
            return res.status(400).json({ message: "Latitude, longitude and service are required." });
        }

        const allSalons = await Salon.find({ status: "approved" });

        const filteredSalons = allSalons
            .filter((salon) =>
                salon.services.some((s) =>
                    s.title.toLowerCase().includes(service.toLowerCase())
                )
            )
            .map((salon) => {
                const distance = getDistanceFromLatLonInKm(
                    parseFloat(latitude),
                    parseFloat(longitude),
                    salon.latitude,
                    salon.longitude
                );
                return { ...salon.toObject(), distance };
            })
            .filter((salon) => salon.distance <= 10) // 🔍 only salons within 10km
            .sort((a, b) => a.distance - b.distance); // 📍 sort by closest

        res.status(200).json({ salons: filteredSalons });
    } catch (error) {
        console.error("Nearby Salon Error:", error);
        res.status(500).json({ message: "Something went wrong", error: error.message });
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


exports.getReviews = async (req, res) => {
    try {
        const { salonId } = req.params;

        const salon = await Salon.findById(salonId)
            .select('reviews')
            .populate('reviews.userId', 'name phone'); // populate user's name & phone

        if (!salon) {
            return res.status(404).json({ message: "Salon not found." });
        }

        res.status(200).json({ reviews: salon.reviews });
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch reviews", error: error.message });
    }
};