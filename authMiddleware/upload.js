const multer = require("multer");
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");


const createFolder = (folder) => {
    if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
    }
};
createFolder("uploads/salonPhotos");
createFolder("uploads/salonAgreements");
createFolder("uploads/blogs");


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        console.log("📂 Saving File:", file.originalname, "Type:", file.mimetype);
        if (file.fieldname === "salonPhotos") {
            cb(null, "uploads/salonPhotos/");
        } else if (file.fieldname === "salonAgreement") {
            cb(null, "uploads/salonAgreements/");
        } else if (file.fieldname === "blogImage") { 
            cb(null, "uploads/blogs/");
        } else {
            cb(new Error("❌ Invalid file field: " + file.fieldname), null);
        }
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});


const fileFilter = (req, file, cb) => {
    if (file.fieldname === "salonPhotos" && file.mimetype.startsWith("image/")) {
        cb(null, true);
    } else if (file.fieldname === "salonAgreement") {
        cb(null, true);
    } else if (file.fieldname === "blogImage" && file.mimetype.startsWith("image/")) { // 🔹 Added for blogs
        cb(null, true);
    } else {
        cb(new Error("❌ Invalid file type: " + file.mimetype), false);
    }
};


const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 }, 
});


const convertToJpg = async (req, res, next) => {
    if (!req.files) return next();

    try {
        const processImages = async (files) => {
            return Promise.all(
                files.map(async (file) => {
                    const outputFilePath = file.path.replace(path.extname(file.path), ".jpg");
                    await sharp(file.path)
                        .resize({ width: 1024 }) // Resize images to max width of 1024px
                        .jpeg({ quality: 80 })
                        .toFile(outputFilePath);
                    fs.unlinkSync(file.path); // Delete original file after conversion
                    file.path = outputFilePath; // Update file path
                })
            );
        };

        if (req.files.salonPhotos) await processImages(req.files.salonPhotos);
        if (req.files.blogImage) await processImages(req.files.blogImage); // 🔹 Added for blog images

        next();
    } catch (error) {
        console.error("❌ Error during image conversion:", error);
        return res.status(500).json({ message: "Image conversion failed!" });
    }
};

module.exports = { upload, convertToJpg };
