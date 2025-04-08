const mongoose = require("mongoose");


const ReviewSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, required: true, min: 0, max: 5 },
    comment: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});


const SalonSchema = new mongoose.Schema(
    {
        ownerName: { type: String, required: true },
        salonName: { type: String, required: true },
        mobile: { type: String, required: true, unique: true },
        email: { type: String, required: true, unique: true },
        salonAddress: { type: String, required: true },
        locationMapUrl: { type: String },

       
        salonTitle: { type: String, default: "" },
        salonDescription: { type: String, default: "" },

      
        latitude: { type: Number, default: null },
        longitude: { type: Number, default: null },

      
        salonPhotos: [{ type: String }],
        salonAgreement: { type: String, default: "" }, 

       
        socialLinks: {
            facebook: { type: String, default: "" },
            instagram: { type: String, default: "" },
            youtube: { type: String, default: "" },
        },

        

        openingHours: {},
        facilities: [{ type: String }],
            services: [
                {
                    discount: { type: Number, default: 0 },
                    title: { type: String, required: true },
                    description: { type: String, required: true },
                    rate: { type: Number, required: true },
                    duration: { type: String, required: true },
                    gender: { type: String, enum: ["male", "female", "unisex"], required: true },
                },
            ],

        category: { type: String },

        bankDetails: {
            accountHolderName: { type: String, default: "" },
            accountNumber: { type: String, default: "" },
            ifscCode: { type: String, default: "" },
            bankName: { type: String, default: "" },
            branchName: { type: String, default: "" },
        },

        status: { type: String, enum: ["pending", "approved"], default: "pending" },
        rating: [ReviewSchema],
        reviews: [ReviewSchema],
    },
    { timestamps: true }
);


module.exports = mongoose.model("Salon", SalonSchema);
