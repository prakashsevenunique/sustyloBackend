const Joi = require("joi");

const validateSalon = (data) => {
  const schema = Joi.object({
    name: Joi.string().required(),
    owner: Joi.string().required(), // Changed from `ownerId` to `owner`
    address: Joi.string().required(),
    latitude: Joi.number().required(),
    longitude: Joi.number().required(),
    services: Joi.array().items(Joi.string()).required(),
    pricing: Joi.object().optional(), // Added pricing validation
    status: Joi.string().valid("pending", "approved").optional(), // Matches schema enum
  });

  return schema.validate(data);
};

module.exports = validateSalon;
