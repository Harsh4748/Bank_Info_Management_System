const mongoose = require("mongoose");

const accountSchema = new mongoose.Schema({
  mobile: { type: String, required: true },
  accountHolderName: { type: String, required: true },
  accountNumber: { type: String, required: true },
  bankName: { type: String, required: true },
  ifscCode: { type: String, required: true }
});

module.exports = mongoose.model("Account", accountSchema);
