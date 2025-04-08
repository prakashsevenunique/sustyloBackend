const haversine = require("haversine-distance");

const getNearbySalons = (userLocation, salons, maxDistance = 5000) => {
  return salons.filter((salon) => {
    if (!salon.latitude || !salon.longitude) return false; 
    const salonLocation = { latitude: salon.latitude, longitude: salon.longitude };
    const distance = haversine(userLocation, salonLocation);
    return distance <= maxDistance; 
  });
};

module.exports = getNearbySalons;
