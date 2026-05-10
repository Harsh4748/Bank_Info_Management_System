// server.js - Smart Hybrid Structure
import express from "express";
import mongoose from "mongoose";
import cors from "cors";

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

mongoose
  .connect("mongodb://127.0.0.1:27017/bankAccounts", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB error:", err));

// Flexible Schema to handle both old and new data
const accountSchema = new mongoose.Schema(
  {
    mobile: String,
    accountHolderName: String,
    accountNumber: String,
    bankName: String,
    ifscCode: String,
    accounts: [
      {
        accountHolderName: String,
        accountNumber: String,
        bankName: String,
        ifscCode: String,
      }
    ]
  },
  { timestamps: true }
);

const Account = mongoose.model("Account", accountSchema);

// 🛡️ Data Validation Helper
const validateAccount = (acc) => {
  const { mobile, accountHolderName, accountNumber, ifscCode } = acc;
  if (!/^[6-9]\d{9}$/.test(String(mobile).trim())) return "Invalid Mobile (10 digits starting with 6-9)";
  if (String(accountHolderName).trim().length < 3) return "Name must be at least 3 characters";
  if (!/^\d{9,18}$/.test(String(accountNumber).trim())) return "Invalid Account Number (9-18 digits)";
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(String(ifscCode).trim().toUpperCase())) return "Invalid IFSC Format (e.g. SBIN0001234)";
  return null;
};

// Helper to flatten results for the frontend
const getFlattened = (docs) => {
  let result = [];
  docs.forEach(doc => {
    if (doc.accounts && doc.accounts.length > 0) {
      doc.accounts.forEach(acc => {
        result.push({
          _id: acc._id,
          mobile: doc.mobile,
          accountHolderName: acc.accountHolderName,
          accountNumber: acc.accountNumber,
          bankName: acc.bankName,
          ifscCode: acc.ifscCode
        });
      });
    } else if (doc.accountNumber) {
      result.push(doc.toObject());
    }
  });
  return result;
};

app.get("/api/test", (req, res) => res.json({ message: "Backend is working!" }));

app.get("/api/accounts/all", async (req, res) => {
  try {
    const docs = await Account.find();
    res.json({ accounts: getFlattened(docs) });
  } catch (err) {
    res.status(500).json({ message: "❌ Error" });
  }
});

app.post("/api/getAccounts", async (req, res) => {
  try {
    const { mobile, accountNumber } = req.body;
    let query = {};
    if (mobile) query.mobile = String(mobile).trim();
    if (accountNumber) {
      query = { $or: [{ accountNumber }, { "accounts.accountNumber": accountNumber }] };
    }
    
    const docs = await Account.find(query);
    const flattened = getFlattened(docs);
    
    // If we searched by accountNumber, filter the flattened list
    const final = accountNumber ? flattened.filter(a => a.accountNumber === accountNumber) : flattened;
    
    if (!final.length) return res.status(404).json({ message: "Not found" });
    res.json({ accounts: final });
  } catch (err) {
    res.status(500).json({ message: "❌ Error" });
  }
});

app.post("/api/accounts", async (req, res) => {
  try {
    const { mobile, accountNumber } = req.body;
    
    // 🛡️ Validation
    const error = validateAccount(req.body);
    if (error) return res.status(400).json({ message: `❌ ${error}` });

    // 🛡️ Prevent duplicate: Check if same mobile has same account number
    const existing = await Account.findOne({
      $or: [
        { mobile, accountNumber },
        { mobile, "accounts.accountNumber": accountNumber }
      ]
    });

    if (existing) {
      return res.status(400).json({ message: "❌ Error: This Account Number already exists for this Mobile!" });
    }

    const newAcc = new Account(req.body);
    await newAcc.save();
    res.json({ message: "✅ Added", account: newAcc });
  } catch (err) {
    res.status(500).json({ message: "❌ Error" });
  }
});

app.put("/api/accounts/:mobile/:id", async (req, res) => {
  try {
    const { id } = req.params;
    // Try updating flat first
    let updated = await Account.findByIdAndUpdate(id, req.body, { new: true });
    
    // If not found, it might be a nested account
    if (!updated) {
      const doc = await Account.findOne({ "accounts._id": id });
      if (doc) {
        const acc = doc.accounts.id(id);
        Object.assign(acc, req.body);
        await doc.save();
        updated = acc;
      }
    }
    res.json({ message: "✅ Updated" });
  } catch (err) {
    res.status(500).json({ message: "❌ Error" });
  }
});

app.delete("/api/accounts/delete-all", async (req, res) => {
  try {
    await Account.deleteMany({});
    res.json({ message: "✅ All records deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "❌ Error deleting records" });
  }
});

app.delete("/api/accounts/:mobile/:id", async (req, res) => {
  try {
    const { id } = req.params;
    let deleted = await Account.findByIdAndDelete(id);
    if (!deleted) {
      const doc = await Account.findOne({ "accounts._id": id });
      if (doc) {
        doc.accounts.id(id).deleteOne();
        await doc.save();
      }
    }
    res.json({ message: "✅ Deleted" });
  } catch (err) {
    res.status(500).json({ message: "❌ Error" });
  }
});

app.post("/api/accounts/bulk", async (req, res) => {
  try {
    const cleaned = req.body.accounts.map(acc => ({
      mobile: String(acc.mobile).trim(),
      accountHolderName: String(acc.accountHolderName).trim(),
      accountNumber: String(acc.accountNumber).trim(),
      bankName: String(acc.bankName).trim(),
      ifscCode: String(acc.ifscCode).trim(),
    })).filter(acc => {
      // Must have mobile & account, and pass validation
      return acc.mobile && acc.accountNumber && !validateAccount(acc);
    });

    // 🛡️ Filter out duplicates from bulk list AND within the list itself
    const finalData = [];
    const seenInBatch = new Set();

    for (const acc of cleaned) {
      // Create a unique key for this mobile + account pair
      const uniqueKey = `${acc.mobile}_${acc.accountNumber}`;
      
      // 1. Skip if we already picked this one in the CURRENT batch
      if (seenInBatch.has(uniqueKey)) continue;

      // 2. Skip if it already exists in the DATABASE
      const exists = await Account.findOne({
        $or: [
          { mobile: acc.mobile, accountNumber: acc.accountNumber },
          { mobile: acc.mobile, "accounts.accountNumber": acc.accountNumber }
        ]
      });

      if (!exists) {
        finalData.push(acc);
        seenInBatch.add(uniqueKey);
      }
    }

    if (finalData.length > 0) {
      await Account.insertMany(finalData, { ordered: false });
    }
    
    res.json({ 
      message: `✅ Import complete. Added ${finalData.length} new records.`, 
      count: finalData.length,
      ignored: cleaned.length - finalData.length
    });
  } catch (err) {
    res.status(500).json({ message: "❌ Error during bulk import" });
  }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server started on port ${PORT}`));
