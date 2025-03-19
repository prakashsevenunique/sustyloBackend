const Joi = require("joi");

const validateSalon = (data) => {
  const schema = Joi.object({
    ownerName: Joi.string().required(),
    salonName: Joi.string().required(),
    salonTitle: Joi.string().required(),
    salonAbout: Joi.string().required(),
    mobile: Joi.string().required(),
    email: Joi.string().email().required(),
    
    fullAddress: Joi.string().required(),  // ✅ Added validation for full address

    latitude: Joi.number().required(),
    longitude: Joi.number().required(),
    
    googleMapUrl: Joi.string().optional(), // ✅ Added validation for Google Map URL
    
    facilities: Joi.array().items(Joi.string()).optional(),
    openingHours: Joi.object().optional(),
    images: Joi.array().items(Joi.string()).optional(),
  });

  return schema.validate(data);
};

module.exports = validateSalon;
