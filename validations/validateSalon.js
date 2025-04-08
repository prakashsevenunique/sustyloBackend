const Joi = require("joi");

const validateSalon = (data) => {
  const schema = Joi.object({
    ownerName: Joi.string().required().messages({
      'string.base': 'Owner name should be a string.',
      'any.required': 'Owner name is required.',
    }),
    salonName: Joi.string().required().messages({
      'string.base': 'Salon name should be a string.',
      'any.required': 'Salon name is required.',
    }),
    salonTitle: Joi.string().required().messages({
      'string.base': 'Salon title should be a string.',
      'any.required': 'Salon title is required.',
    }),
    salonAbout: Joi.string().required().messages({
      'string.base': 'Salon about should be a string.',
      'any.required': 'Salon about is required.',
    }),
    mobile: Joi.string().required().messages({
      'string.base': 'Mobile number should be a string.',
      'any.required': 'Mobile number is required.',
    }),
    email: Joi.string().email().required().messages({
      'string.base': 'Email should be a string.',
      'string.email': 'Please provide a valid email address.',
      'any.required': 'Email is required.',
    }),
    fullAddress: Joi.string().required().messages({
      'string.base': 'Full address should be a string.',
      'any.required': 'Full address is required.',
    }),
    latitude: Joi.number().required().messages({
      'number.base': 'Latitude should be a number.',
      'any.required': 'Latitude is required.',
    }),
    longitude: Joi.number().required().messages({
      'number.base': 'Longitude should be a number.',
      'any.required': 'Longitude is required.',
    }),
    googleMapUrl: Joi.string().optional(),
    facilities: Joi.array().items(Joi.string()).optional(),
    openingHours: Joi.object().optional(),
    images: Joi.array().items(Joi.string()).optional(),
  });

  return schema.validate(data, { abortEarly: false });
};

module.exports = validateSalon;
