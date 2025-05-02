const Commission = require("../models/commissionModel.js"); // Adjust path if needed

// CREATE
exports.createCommission = async (req, res) => {
  try {
    const commission = new Commission(req.body);
    await commission.save();
    res.status(201).json({ message: "Commission created", data: commission });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// READ ALL (with optional filter)
exports.getAllCommissions = async (req, res) => {
  try {
    const { userId, serviceType } = req.query;
    const filter = {};
    if (userId) filter.userId = userId;
    if (serviceType) filter.serviceType = serviceType;

    const commissions = await Commission.find(filter);
    res.status(200).json(commissions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// READ ONE
exports.getCommissionById = async (req, res) => {
  try {
    const commission = await Commission.findById(req.params.id);
    if (!commission) return res.status(404).json({ message: "Commission not found" });
    res.status(200).json(commission);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// UPDATE
exports.updateCommission = async (req, res) => {
  try {
    const updated = await Commission.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updated) return res.status(404).json({ message: "Commission not found" });
    res.status(200).json({ message: "Updated successfully", data: updated });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// DELETE
exports.deleteCommission = async (req, res) => {
  try {
    const deleted = await Commission.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Commission not found" });
    res.status(200).json({ message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
