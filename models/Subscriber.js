const mongoose = require("mongoose");

const subscriberSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/\S+@\S+\.\S+/, 'is invalid']
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],  // [longitude, latitude]
      required: false
    }
  },
  ipAddress: {
    type: String,
    required: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create geospatial index for location queries
subscriberSchema.index({ location: '2dsphere' });

module.exports = mongoose.model("Subscriber", subscriberSchema);