const Joi = require("joi");

const validateSalon = (data) => {
  const schema = Joi.object({
    name: Joi.string().required(),
    owner: Joi.string().required(), // Ensure this matches your schema
    address: Joi.string().required(),
    latitude: Joi.number().required(),
    longitude: Joi.number().required(),
    services: Joi.array().items(Joi.string()).required(),
  });

  return schema.validate(data);
};

module.exports = validateSalon;
