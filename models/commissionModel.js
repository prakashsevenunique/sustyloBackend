const mongoose = require('mongoose');

const CommissionPackageSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  packageName: String,
  serviceType: { type: String, enum: ['Payout', 'Payin', 'Money Transfer', 'booking'] },
  commission: { type: Number, required: false },
  type: { type: String, enum: ['percentage', 'flat'], required: false }
});

const commission = mongoose.model('Commission', CommissionPackageSchema);
module.exports = commission;