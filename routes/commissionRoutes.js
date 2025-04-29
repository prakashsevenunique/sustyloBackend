const express = require('express')
const {
  createCommissionPackage,
  getCommissionPackages,
  applyCommission
} = require("../controllers/commissionController")

const router = express.Router();

router.post('/create', createCommissionPackage);
router.get('/', getCommissionPackages);
router.post('/apply', applyCommission); // user initiates transaction

module.exports = router;