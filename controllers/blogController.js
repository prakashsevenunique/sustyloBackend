const Blog = require("../models/Blog");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ✅ Ensure Upload Folder Exists
const uploadFolder = "uploads/blogs";
if (!fs.existsSync(uploadFolder)) {
    fs.mkdirSync(uploadFolder, { recursive: true });
}

// ✅ Multer Storage Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadFolder);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname)); // Unique filename
    },
});

// ✅ Multer Upload Middleware (Only Images)
const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) {
            cb(null, true);
        } else {
            cb(new Error("Only images are allowed"), false);
        }
    },
}).single("blogImage"); // Accept only one file

// ✅ 1️⃣ Upload Blog
exports.uploadBlog = (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ message: err.message });
        }

        try {
            const { title, content } = req.body;
            if (!title || !content) {
                return res.status(400).json({ message: "Title and content are required" });
            }

            const blog = new Blog({
                title,
                content,
                imageUrl: req.file ? `/uploads/blogs/${req.file.filename}` : null,
            });

            await blog.save();
            return res.status(201).json({ message: "Blog uploaded successfully", blog });
        } catch (error) {
            console.error("Error uploading blog:", error);
            return res.status(500).json({ message: "Internal server error" });
        }
    });
};

// ✅ 2️⃣ Get All Blogs
exports.getAllBlogs = async (req, res) => {
    try {
        const blogs = await Blog.find().sort({ createdAt: -1 }); // Latest blogs first
        return res.status(200).json(blogs);
    } catch (error) {
        console.error("Error fetching blogs:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// ✅ 3️⃣ Get Single Blog by ID
exports.getBlogById = async (req, res) => {
    try {
        const blogId = req.params.id;
        const blog = await Blog.findById(blogId);
        if (!blog) {
            return res.status(404).json({ message: "Blog not found" });
        }
        return res.status(200).json(blog);
    } catch (error) {
        console.error("Error fetching blog:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// ✅ 4️⃣ Update Blog
exports.updateBlog = async (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ message: err.message });
        }

        try {
            const { title, content } = req.body;
            const blogId = req.params.id;

            let blog = await Blog.findById(blogId);
            if (!blog) {
                return res.status(404).json({ message: "Blog not found" });
            }

            if (req.file) {
                // Delete old image if exists
                if (blog.imageUrl) {
                    const oldImagePath = path.join(__dirname, "..", blog.imageUrl);
                    if (fs.existsSync(oldImagePath)) {
                        fs.unlinkSync(oldImagePath);
                    }
                }
                blog.imageUrl = `/uploads/blogs/${req.file.filename}`;
            }

            blog.title = title || blog.title;
            blog.content = content || blog.content;

            await blog.save();
            return res.status(200).json({ message: "Blog updated successfully", blog });
        } catch (error) {
            console.error("Error updating blog:", error);
            return res.status(500).json({ message: "Internal server error" });
        }
    });
};

// ✅ 5️⃣ Delete Blog
exports.deleteBlog = async (req, res) => {
    try {
        const blogId = req.params.id;
        const blog = await Blog.findById(blogId);

        if (!blog) {
            return res.status(404).json({ message: "Blog not found" });
        }

        // Delete the associated image
        if (blog.imageUrl) {
            const imagePath = path.join(__dirname, "..", blog.imageUrl);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        await Blog.findByIdAndDelete(blogId);
        return res.status(200).json({ message: "Blog deleted successfully" });
    } catch (error) {
        console.error("Error deleting blog:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
