const express = require("express");
const router = express.Router();
const { shareAppLink } = require("../controllers/shareAppLinkController");

router.post("/share-app-link", shareAppLink);

module.exports = router;
