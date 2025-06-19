const mongoose = require("mongoose");

const blogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    summary: { type: String }, // Short description for preview
    imageUrl: { type: String },
    category: { type: String, required: true },

    // SEO metadata fields
    metaTitle: { type: String },
    metaDescription: { type: String },
    metaKeywords: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Blog", blogSchema);