const Salon = require("../models/salon");
const User = require("../models/User");
const mongoose = require("mongoose");
const JWT_SECRET = process.env.JWT_SECRET || "sevenunique5308";
const jwt = require("jsonwebtoken");


exports.SalonLead = async (req, res) => {
    try {
        console.log("🚀 Incoming Request for Salon Registration");
        console.log("Request Body:", req.body);

        const { ownerName, salonName, mobile, email, salonAddress } = req.body;

        if (!ownerName || !salonName || !mobile || !email || !salonAddress) {
            return res.status(400).json({ message: "All fields are required!" });
        }

        const existingSalon = await Salon.findOne({ mobile });
        if (existingSalon) {
            return res.status(400).json({ message: "Salon with this mobile number already exists." });
        }

        const newSalon = new Salon({
            ownerName,
            salonName,
            mobile,
            email,
            salonAddress,
            status: "pending",
        });

        // Generate non-expiring token
        const token = jwt.sign(
            { salonId: newSalon._id, role: "owner" },
            JWT_SECRET
        );

        newSalon.token = token; // Save token in DB
        await newSalon.save();

        res.status(201).json({
            message: "Salon registered successfully! Complete details using the update API. Status remains 'pending' until approved by admin.",
            salon: newSalon,
            token,
        });
    } catch (error) {
        console.error("❌ Error in SalonLead:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};


exports.getSalonById = async (req, res) => {
    try {
        const { id } = req.params;
        const salon = await Salon.findById(id).populate("salonowner");

        if (!salon) return res.status(404).json({ message: "Salon not found." });

        res.status(200).json({ salon });
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};

exports.deleteSalon = async (req, res) => {
    try {
      const { id } = req.params;
  
      const salon = await Salon.findById(id);
      if (!salon) {
        return res.status(404).json({ success: false, message: "Salon not found" });
      }
  
      await Salon.findByIdAndDelete(id);
  
      res.status(200).json({ success: true, message: "Salon deleted successfully" });
    } catch (error) {
      console.error("Delete Salon Error:", error);
      res.status(500).json({ success: false, message: "Internal Server Error" });
    }
  };


exports.updateSalonDetails = async (req, res) => {
    try {
        const { salonId } = req.params;
        const {
            locationMapUrl,
            salonTitle, salonDescription, socialLinks, openingHours, facilities,
            services, category, bankDetails, latitude, longitude,aadharNumber,pancardNumber
        } = req.body;

        // Validate salonId
        if (!mongoose.Types.ObjectId.isValid(salonId)) {
            return res.status(400).json({ error: "Invalid Salon ID" });
        }

        // Find existing salon
        let salon = await Salon.findById(salonId).populate("salonowner");
        if (!salon) {
            return res.status(404).json({ error: "Salon not found" });
        }

        // Email uniqueness check
        // if (email && email !== salon.salonowner.email) {
        //     const existingSalon = await Salon.findOne({ email });
        //     if (existingSalon) {
        //         return res.status(400).json({ error: "Email already in use" });
        //     }
        // }

        // Update salon
        salon = await Salon.findByIdAndUpdate(
            salonId,
            {
                locationMapUrl,
                salonTitle, salonDescription, socialLinks, openingHours, facilities,
                category, latitude, longitude, services, bankDetails,aadharNumber,pancardNumber
            },
            { new: true, runValidators: true }
        );

        res.status(200).json({
            message: "Salon updated successfully",
            salon
        });

    } catch (error) {
        console.error("Update error:", error);
        res.status(500).json({
            error: "Server error",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};


// Improved coordinate extraction
function extractLatLng(url) {
    if (!url) throw new Error("Empty URL");

    // Support multiple URL formats:
    // 1. https://maps.google.com/?q=LAT,LNG
    // 2. https://www.google.com/maps/place/@LAT,LNG
    // 3. https://goo.gl/maps/XXXX

    let lat, lng;

    // Case 1: ?q=LAT,LNG
    const qParamMatch = url.match(/[?&]q=([^&]+)/);
    if (qParamMatch) {
        const coords = qParamMatch[1].split(',');
        if (coords.length === 2) {
            lat = parseFloat(coords[0]);
            lng = parseFloat(coords[1]);
        }
    }

    // Case 2: /@LAT,LNG
    if (!lat && !lng) {
        const atParamMatch = url.match(/@([-\d.]+),([-\d.]+)/);
        if (atParamMatch) {
            lat = parseFloat(atParamMatch[1]);
            lng = parseFloat(atParamMatch[2]);
        }
    }

    if (!lat || !lng) throw new Error("Could not extract coordinates from URL");

    return { latitude: lat, longitude: lng };
}

exports.updateSalonMedia = async (req, res) => {
    try {
        const { salonId } = req.params;
        console.log("📌 Update Salon Media API hit with Salon ID:", salonId);

        if (!mongoose.Types.ObjectId.isValid(salonId)) {
            return res.status(400).json({ error: "Invalid Salon ID" });
        }

        let salon = await Salon.findById(salonId);
        if (!salon) {
            console.error("🚨 Salon not found:", salonId);
            return res.status(404).json({ error: "Salon not found" });
        }

        let salonPhotos = salon.salonPhotos || [];
        let salonAgreement = salon.salonAgreement || "";

        if (req.files && req.files["salonPhotos"]) {
            salonPhotos = req.files["salonPhotos"].map((file) => file.path);
        }

        if (req.files && req.files["salonAgreement"]) {
            salonAgreement = req.files["salonAgreement"][0].path;
        }

        salon = await Salon.findByIdAndUpdate(
            salonId,
            { salonPhotos, salonAgreement },
            { new: true }
        );

        console.log("✅ Salon Media Updated Successfully:", salon);
        res.status(200).json({ message: "Salon media updated successfully", salon });
    } catch (error) {
        console.error("🚨 Error updating salon media:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
};

exports.approveSalon = async (req, res) => {
    try {
        const { salonId } = req.params;
        let salon = await Salon.findById(salonId);

        if (!salon) return res.status(404).json({ message: "Salon not found" });


        salon.services = salon.services.filter(service =>
            service.title && service.description && service.rate && service.duration && service.gender
        );


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
exports.getNearbySalons = async (req, res) => {
    try {
        const {
            latitude,
            longitude,
            search,
            gender,
            category,
            serviceTitle,
            serviceDescription,
            minRate,
            maxRate,
            maxDistance = 200, // Default max distance in km
            sortBy = 'distance', // Default sort by distance
            sortOrder = 'asc' // Default ascending order
        } = req.query;

        if (!latitude || !longitude) {
            return res.status(400).json({ message: "Latitude and Longitude are required." });
        }

        const lat = parseFloat(latitude);
        const lon = parseFloat(longitude);

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

        // Function to calculate average rating
        const calculateAverageRating = (reviews) => {
            if (!reviews || reviews.length === 0) return 0;
            const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
            return sum / reviews.length;
        };

        // Function to calculate min service price
        const calculateMinServicePrice = (services) => {
            if (!services || services.length === 0) return Infinity;
            return Math.min(...services.map(service => service.rate));
        };

        // Build the base query
        const baseQuery = {
            latitude: { $exists: true, $ne: null },
            longitude: { $exists: true, $ne: null },
            status: "approved"
        };

        // ... [Previous filter code remains the same until the searchWithinRadius function] ...

        const searchWithinRadius = async (radius) => {
            console.log(`🔍 Searching salons within ${radius} km...`);

            // Start with base query
            const query = { ...baseQuery };

            // Only add regex search if search parameter exists
            if (search) {
                query.salonName = { $regex: search, $options: "i" };
            }
            if (category) {
                query.category = { $regex: category, $options: "i" };
            }

            const salons = await Salon.find(query).lean();

            // Process each salon
            const processedSalons = salons.map(salon => {
                salon.latitude = parseFloat(salon.latitude);
                salon.longitude = parseFloat(salon.longitude);
                salon.distance = calculateDistance(salon.latitude, salon.longitude);
                salon.reviewCount = salon.reviews ? salon.reviews.length : 0;
                salon.averageRating = calculateAverageRating(salon.reviews);
                salon.minServicePrice = calculateMinServicePrice(salon.services);

                // Filter services based on criteria
                if (gender || serviceTitle || serviceDescription || minRate || maxRate) {
                    salon.services = salon.services.filter(service => {
                        let matches = true;
                        if (gender && service.gender !== gender) matches = false;
                        if (serviceTitle && !new RegExp(serviceTitle, 'i').test(service.title)) matches = false;
                        if (serviceDescription && !new RegExp(serviceDescription, 'i').test(service.description)) matches = false;
                        if (minRate && service.rate < parseFloat(minRate)) matches = false;
                        if (maxRate && service.rate > parseFloat(maxRate)) matches = false;
                        return matches;
                    });
                }

                return salon;
            });

            // Filter salons within radius and with matching services
            let filteredSalons = processedSalons
                .filter(salon => salon.distance <= radius)
                .filter(salon => {
                    if (gender || serviceTitle || serviceDescription || minRate || maxRate) {
                        return salon.services.length > 0;
                    }
                    return true;
                });

            // Apply sorting
            filteredSalons.sort((a, b) => {
                let comparison = 0;

                switch (sortBy) {
                    case 'distance':
                        comparison = a.distance - b.distance;
                        break;
                    case 'price':
                        comparison = a.minServicePrice - b.minServicePrice;
                        break;
                    case 'rating':
                        comparison = b.averageRating - a.averageRating; // Higher ratings first
                        break;
                    default:
                        comparison = a.distance - b.distance;
                }

                // Apply sort order
                return sortOrder === 'desc' ? -comparison : comparison;
            });

            console.log(`Found ${filteredSalons.length} salons within ${radius} km`);
            return filteredSalons;
        };

        // Check in increasing radius up to maxDistance
        let salons = [];
        const radiusSteps = [2, 5, maxDistance]; // Search in 2km, then 5km, then maxDistance

        for (const radius of radiusSteps) {
            salons = await searchWithinRadius(radius);
            if (salons.length > 0) break; // Stop if we found salons
        }

        if (salons.length === 0) {
            return res.status(404).json({ message: "No salons found matching your criteria." });
        }

        res.status(200).json({
            count: salons.length,
            salons,
        });

    } catch (error) {
        console.error("🚨 Error:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};

exports.getTopReviewedSalons = async (req, res) => {
    try {
        console.log("🔍 Searching for top 5 reviewed salons by average rating...");

        const salons = await Salon.aggregate([
            {
                $match: {
                    reviews: { $exists: true }
                }
            },
            {
                $addFields: {
                    avgRating: { $avg: "$reviews.rating" }
                }
            },
            {
                $sort: { avgRating: -1 }
            },
            {
                $limit: 5
            }
        ]);

        console.log(`🟢 Found ${salons.length} top rated salons`);

        if (salons.length === 0) {
            return res.status(404).json({ message: "No reviewed salons found." });
        }

        res.status(200).json({ count: salons.length, salons });

    } catch (error) {
        console.error("🚨 Error:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};


function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    function deg2rad(deg) {
        return deg * (Math.PI / 180);
    }
    const R = 6371;
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
            .filter((salon) => salon.distance <= 10)
            .sort((a, b) => a.distance - b.distance);

        res.status(200).json({ salons: filteredSalons });
    } catch (error) {
        console.error("Nearby Salon Error:", error);
        res.status(500).json({ message: "Something went wrong", error: error.message });
    }
};


exports.addReview = async (req, res) => {
    try {
        const { salonId } = req.params;
        const { rating, comment, phone } = req.body;

        const user = await User.findOne({ mobileNumber:phone });
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        const newReview = {
            userId: user._id,
            rating,
            comment,
        };

        const updatedSalon = await Salon.findByIdAndUpdate(
            salonId,
            { $push: { reviews: newReview } },
            { new: true }
        );

        if (!updatedSalon) {
            return res.status(404).json({ message: "Salon not found." });
        }

        // 🔄 Calculate average rating using aggregation
        const avgResult = await Salon.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(salonId) } },
            { $unwind: "$reviews" },
            {
                $group: {
                    _id: "$_id",
                    averageRating: { $avg: "$reviews.rating" },
                },
            },
        ]);

        const averageRating = avgResult.length > 0 ? avgResult[0].averageRating : 0;

        res.status(201).json({
            message: "Review added successfully.",
            salon: updatedSalon,
            averageRating: averageRating.toFixed(1),
        });
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};

exports.getReviews = async (req, res) => {
    try {
        const { salonId } = req.params;

        const result = await Salon.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(salonId) } },
            { $unwind: "$reviews" },
            {
                $lookup: {
                    from: "users",
                    localField: "reviews.userId",
                    foreignField: "_id",
                    as: "userDetails"
                }
            },
            { $unwind: { path: "$userDetails", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 0,
                    rating: "$reviews.rating",
                    comment: "$reviews.comment",
                    createdAt: "$reviews.createdAt",
                    user: {
                        _id: "$userDetails._id",
                        name: "$userDetails.name",
                        phone: "$userDetails.phone"
                    }
                }
            }
        ]);

        return res.status(200).json({ reviews: result });
    } catch (error) {
        return res.status(500).json({ message: "Failed to fetch reviews", error: error.message });
    }
};

