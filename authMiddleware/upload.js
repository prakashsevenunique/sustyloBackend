const multer = require("multer");
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");

// ✅ Ensure Upload Folders Exist
const createFolder = (folder) => {
    if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
    }
};
createFolder("uploads/salonPhotos");
createFolder("uploads/salonAgreements");

// ✅ Multer Storage Configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        console.log("📂 Saving File:", file.originalname, "Type:", file.mimetype);
        if (file.fieldname === "salonPhotos") {
            cb(null, "uploads/salonPhotos/");
        } else if (file.fieldname === "salonAgreement") {
            cb(null, "uploads/salonAgreements/");
        } else {
            cb(new Error("❌ Invalid file field: " + file.fieldname), null);
        }
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname)); // Unique filename
    }
});

// ✅ File Filter (Allow Only Images & PDFs)
const fileFilter = (req, file, cb) => {
    if (file.fieldname === "salonPhotos" && file.mimetype.startsWith("image/")) {
        cb(null, true);
    } else if (file.fieldname === "salonAgreement" && file.mimetype === "application/pdf") {
        cb(null, true);
    } else {
        cb(new Error("❌ Invalid file type: " + file.mimetype), false); // Reject invalid files
    }
};

// ✅ Multer Upload Middleware
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 }, // Max file size 10MB
});

// ✅ Convert Uploaded Images to JPG (Compression)
const convertToJpg = async (req, res, next) => {
    if (!req.files || !req.files.salonPhotos) return next();

    try {
        await Promise.all(
            req.files.salonPhotos.map(async (file) => {
                const outputFilePath = file.path.replace(path.extname(file.path), ".jpg");
                await sharp(file.path)
                    .resize({ width: 1024 }) // Resize images to max width of 1024px
                    .jpeg({ quality: 80 })
                    .toFile(outputFilePath);
                fs.unlinkSync(file.path); // Delete original file after conversion
                file.path = outputFilePath; // Update file path
            })
        );
        next();
    } catch (error) {
        console.error("❌ Error during image conversion:", error);
        return res.status(500).json({ message: "Image conversion failed!" });
    }
};

module.exports = { upload, convertToJpg };
