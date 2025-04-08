const errorHandler = (err, req, res, next) => {
 
  if (process.env.NODE_ENV === "development") {
      console.error(`Error: ${err.stack}`);
  } else {
      console.error(`Error: ${err.message}`);
  }


  if (err.name === 'ValidationError') {
     
      return res.status(400).json({
          success: false,
          message: `Validation error: ${err.message}`,
      });
  }

  if (err.code === 11000) {
      
      return res.status(400).json({
          success: false,
          message: "Duplicate field value entered. Please try again with a unique value.",
      });
  }

  
  if (err.name === "UnauthorizedError") {
      return res.status(401).json({
          success: false,
          message: "Unauthorized. Please login to continue.",
      });
  }

 
  res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Internal Server Error",
  });
};

module.exports = errorHandler;
