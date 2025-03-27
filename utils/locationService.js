const User = require("../models/User"); // Ensure this model exists

// Update user location
const updateUserLocation = async (userId, latitude, longitude) => {
    try {
        await User.findByIdAndUpdate(userId, { location: { latitude, longitude } });
        console.log(`📍 Location updated for user: ${userId}`);
    } catch (error) {
        console.error("❌ Error updating user location:", error);
    }
};

module.exports = { updateUserLocation };
