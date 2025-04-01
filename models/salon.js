const mongoose = require("mongoose");

// ✅ Subdocument for user reviews
const ReviewSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, required: true, min: 0, max: 5 },
    comment: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});

// ✅ Main Salon Schema
const SalonSchema = new mongoose.Schema(
    {
        ownerName: { type: String, required: true },
        salonName: { type: String, required: true },
        mobile: { type: String, required: true, unique: true },
        email: { type: String, required: true, unique: true },
        salonAddress: { type: String, required: true },
        locationMapUrl: { type: String },

        // ✅ New Fields
        salonTitle: { type: String, default: "" },
        salonDescription: { type: String, default: "" },

        // ✅ Location Fields
        latitude: { type: Number, default: null },
        longitude: { type: Number, default: null },

        // ✅ File Uploads
        salonPhotos: [{ type: String }], // ✅ Array to store multiple image URLs
        salonAgreement: { type: String, default: "" }, // ✅ PDF file path

        // ✅ Other Fields
        socialLinks: {
            facebook: { type: String, default: "" },
            instagram: { type: String, default: "" },
            youtube: { type: String, default: "" },
        },

        openingHours: {},
        facilities: [{ type: String }],
        services: [
            {
                title: { type: String, required: true },
                description: { type: String, required: true },
                rate: { type: Number, required: true },
                duration: { type: String, required: true },
                gender: { type: String, enum: ["male", "female", "unisex"], required: true },
            },
        ],

        category: { type: String },
        status: { type: String, enum: ["pending", "approved"], default: "pending" },
        reviews: [ReviewSchema],
    },
    { timestamps: true }
);

// ✅ Export model
module.exports = mongoose.model("Salon", SalonSchema);
