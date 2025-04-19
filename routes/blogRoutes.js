const express = require("express");
const router = express.Router();
const blogController = require("../controllers/blogController");


router.post("/createBlog", blogController.createBlog); 
router.get("/all", blogController.getAllBlogs); 
router.get("/:id", blogController.getBlogById); 
router.put("/update/:id", blogController.updateBlog); 
router.delete("/delete/:id", blogController.deleteBlog); 
router.get("/blogs/category/:category", blogController.getBlogsByCategory);
router.post("/:blogId/comments", blogController.postComment);
router.get("/:blogId/comments", blogController.getCommentsByBlogId);

module.exports = router;
