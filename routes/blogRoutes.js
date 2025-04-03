const express = require("express");
const router = express.Router();
const blogController = require("../controllers/blogController");

// ✅ Blog CRUD Routes
router.post("/upload", blogController.uploadBlog); // Upload Blog
router.get("/all", blogController.getAllBlogs); // Get All Blogs
router.get("/:id", blogController.getBlogById); // Get Single Blog
router.put("/update/:id", blogController.updateBlog); // Update Blog
router.delete("/delete/:id", blogController.deleteBlog); // Delete Blog

module.exports = router;
