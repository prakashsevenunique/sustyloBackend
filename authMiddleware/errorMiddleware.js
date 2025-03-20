const errorHandler = (err, req, res, next) => {
  // Log full error stack in development environment for debugging purposes
  if (process.env.NODE_ENV === "development") {
      console.error(`Error: ${err.stack}`);
  } else {
      console.error(`Error: ${err.message}`);
  }

  // Handle specific error types
  if (err.name === 'ValidationError') {
      // Handle validation errors, e.g. mongoose validation
      return res.status(400).json({
          success: false,
          message: `Validation error: ${err.message}`,
      });
  }

  if (err.code === 11000) {
      // Handle MongoDB duplicate key error (e.g., trying to insert a duplicate email)
      return res.status(400).json({
          success: false,
          message: "Duplicate field value entered. Please try again with a unique value.",
      });
  }

  // Handle unauthorized errors if any (if using JWT or Auth middleware)
  if (err.name === "UnauthorizedError") {
      return res.status(401).json({
          success: false,
          message: "Unauthorized. Please login to continue.",
      });
  }

  // Send generic error for unexpected issues
  res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Internal Server Error",
  });
};

module.exports = errorHandler;
