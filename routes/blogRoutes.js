const express = require("express");
const router = express.Router();

const {
  createBlog,
  getAllBlogs,
  getBlogById,
  updateBlog,
  deleteBlog,
  getBlogsByCategory,
  postComment,
  getCommentsByBlogId,
  approveComment,
  replyToComment
} = require("../controllers/blogController");

// 📌 Blog CRUD Routes
router.post("/createBlog", createBlog);
router.get("/all", getAllBlogs);
router.get("/:id", getBlogById);
router.put("/update/:id", updateBlog);
router.delete("/delete/:id", deleteBlog);

// 📌 Blog Category Filter
router.get("/blogs/category/:category", getBlogsByCategory);

// 📌 Comment Routes
router.post("/:blogId/comments", postComment);
router.get("/:blogId/comments", getCommentsByBlogId);
router.put("/comments/:commentId/approve", approveComment);
router.post("/comments/:commentId/reply", replyToComment);

module.exports = router;
