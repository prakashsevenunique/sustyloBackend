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
  getApprovedCommentsByBlogId,
  getAllCommentsByBlogId,
  approveComment,
  replyToComment,
  rejectComment,
  getBlogBySlug
} = require("../controllers/blogController");

// Blog routes
router.post("/createBlog", createBlog);
router.get("/all", getAllBlogs);
router.get("/slug", getBlogBySlug);
// router.get("/:id", getBlogById);
router.put("/update/:id", updateBlog);
router.delete("/delete/:id", deleteBlog);
router.get("/blogs/category/:category", getBlogsByCategory);

// Comment routes
router.post("/:blogId/comments", postComment); // Add comment
router.get("/comment/:blogId", getAllCommentsByBlogId); // All comments
router.get("/comments/approved/:blogId", getApprovedCommentsByBlogId);
router.post("/comments/:commentId/reply", replyToComment);
router.post("/comments/:commentId/approve", approveComment);
router.delete("/comment/:commentId/reject", rejectComment);
module.exports = router;
