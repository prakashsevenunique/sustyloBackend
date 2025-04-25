const commission = require("../models/commissionModel");

// Create a package
const createCommissionPackage = async (req, res) => {
  try {
    const data = await commission.create(req.body);
    res.status(201).json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get all
const getCommissionPackages = async (req, res) => {
  const data = await commission.find();
  res.json(data);
};

// Apply Commission (main flow)
const applyCommission = async (req, res) => {
  const { userId, amount, serviceType } = req.body;

  const pkg = await commission.findOne({
    serviceType,
    minAmount: { $lte: amount },
    maxAmount: { $gte: amount }
  });

  if (!pkg) return res.status(404).json({ error: 'No package found' });

  const isPercent = pkg.type === 'percentage';
  const calc = (value) => isPercent ? (value / 100) * amount : value;

  const charge = calc(pkg.charges);
  const adminCommission = calc(pkg.commission);
  const distributorCommission = calc(pkg.distributorCommission);
  const gst = calc(pkg.gst);
  const tds = calc(pkg.tds);

  const totalDeduction = charge + adminCommission + distributorCommission + gst + tds;
  const finalAmount = amount - totalDeduction;

  res.json({
    userReceives: finalAmount,
    adminGets: charge + adminCommission + gst,
    distributorGets: distributorCommission,
    breakdown: { charge, commission: adminCommission, distributorCommission, gst, tds }
  });
};

module.exports = {
  createCommissionPackage,
  getCommissionPackages,
  applyCommission
};