const User = require("../models/User"); 


const updateUserLocation = async (userId, latitude, longitude) => {
    try {
        await User.findByIdAndUpdate(userId, { location: { latitude, longitude } });
        console.log(`📍 Location updated for user: ${userId}`);
    } catch (error) {
        console.error("❌ Error updating user location:", error);
    }
};

module.exports = { updateUserLocation };
