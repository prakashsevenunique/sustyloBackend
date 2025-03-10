const jwt = require("jsonwebtoken");

// ✅ Middleware to Protect Routes
const protect = (req, res, next) => {
    try {
        const token= req.headers.authorization;

        if (!token || !token.startsWith("Bearer ")) {
            return res.status(401).json({ message: "Unauthorized: Token missing or invalid format" });
        }

        // ✅ Verify Token
        const decoded = jwt.verify(token.split(" ")[1], process.env.JWT_SECRET);
        req.user = decoded;

        next();
    } catch (error) {
        console.error("JWT Verification Error:", error.message);
        return res.status(401).json({ message: "Unauthorized: Invalid or expired token" });
    }
};

// ✅ Role-Based Authorization Middleware
const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: "Forbidden: You do not have permission" });
        }
        next();
    };
};

// ✅ Super Admin Authorization Middleware
const authorizeSuperAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== "super_admin") {
        return res.status(403).json({ message: "Forbidden: Only super admins can perform this action" });
    }
    next();
};

module.exports = { protect, authorizeRoles, authorizeSuperAdmin };
