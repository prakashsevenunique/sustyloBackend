const Salon = require("../models/salon");

const haversine = require("haversine-distance");

// ✅ Register Salon (Owner fills basic details)
exports.registerSalon = async (req, res) => {
    try {
        const { ownerName, salonName, mobile, email, salonAddress } = req.body;

        // Check if salon with the same mobile already exists
        const existingSalon = await Salon.findOne({ mobile });
        if (existingSalon) return res.status(400).json({ message: "Salon with this mobile number already exists." });

        const newSalon = new Salon({ ownerName, salonName, mobile, email, salonAddress });
        await newSalon.save();

        res.status(201).json({ message: "Salon registration request sent. Awaiting admin approval.", salon: newSalon });
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
        const { latitude, longitude, maxDistance = 5000, gender, category } = req.query; // Default max distance = 5km

        // Validate latitude and longitude are provided
        if (!latitude || !longitude) {
            return res.status(400).json({ message: "Latitude and Longitude are required." });
        }

        // Convert maxDistance to a number (in case it's passed as a string)
        const maxDistanceInMeters = parseFloat(maxDistance);
        if (isNaN(maxDistanceInMeters)) {
            return res.status(400).json({ message: "Invalid maxDistance value." });
        }

        const userLocation = { latitude: parseFloat(latitude), longitude: parseFloat(longitude) };

        // Fetch salons that have valid latitude & longitude
        const query = { latitude: { $ne: null }, longitude: { $ne: null } };

        // Add gender filter if provided
        if (gender) {
            query['services.gender'] = gender;
        }

        // Add category filter if provided (assuming 'category' is a field or tag in your data model)
        if (category) {
            query['category'] = category;
        }

        // Fetch salons from database with applied filters
        const salons = await Salon.find(query);

        // Filter salons within maxDistance using Haversine formula
        const nearbySalons = salons.filter((salon) => {
            const salonLocation = { latitude: salon.latitude, longitude: salon.longitude };
            const distance = haversine(userLocation, salonLocation);
            return distance <= maxDistanceInMeters; // Return salons within maxDistance meters
        });

        res.status(200).json({ count: nearbySalons.length, salons: nearbySalons });
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};
