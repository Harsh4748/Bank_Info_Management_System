// const express = require("express");
// const router = express.Router();
// const Account = require("../models/Account");

// // ✅ Add account
// router.post("/accounts", async (req, res) => {
//   try {
//     const account = new Account(req.body);
//     await account.save();
//     res.json({ message: "Account added successfully", account });
//   } catch (err) {
//     res.status(500).json({ error: "Error adding account" });
//   }
// });

// // ✅ Get accounts by mobile or accountNumber
// router.post("/getAccounts", async (req, res) => {
//   try {
//     const { mobile, accountNumber } = req.body;
//     const query = {};

//     if (mobile) query.mobile = mobile;
//     if (accountNumber) query.accountNumber = accountNumber;

//     const accounts = await Account.find(query);
//     if (!accounts.length) return res.status(404).json({ message: "No accounts found" });

//     res.json({ accounts });
//   } catch (err) {
//     res.status(500).json({ error: "Error fetching accounts" });
//   }
// });

// // ✅ Update account
// router.put("/accounts/:id", async (req, res) => {
//   try {
//     const updated = await Account.findByIdAndUpdate(req.params.id, req.body, { new: true });
//     res.json({ message: "Account updated", updated });
//   } catch (err) {
//     res.status(500).json({ error: "Error updating account" });
//   }
// });

// // ✅ Delete account
// router.delete("/accounts/:id", async (req, res) => {
//   try {
//     await Account.findByIdAndDelete(req.params.id);
//     res.json({ message: "Account deleted" });
//   } catch (err) {
//     res.status(500).json({ error: "Error deleting account" });
//   }
// });

// module.exports = router;



// //--------------- update merge query-----------------

// // const express = require("express");
// // const router = express.Router();
// // const Account = require("../models/Account");

// // // ✅ Add account
// // router.post("/accounts", async (req, res) => {
// //   try {
// //     const account = new Account(req.body);
// //     await account.save();
// //     res.json({ message: "Account added successfully", account });
// //   } catch (err) {
// //     res.status(500).json({ error: "Error adding account" });
// //   }
// // });

// // // ✅ Get accounts by mobile OR accountNumber
// // router.post("/getAccounts", async (req, res) => {
// //   try {
// //     const { mobile, accountNumber, searchInput } = req.body;

// //     // take whichever input is provided
// //     const input = mobile || accountNumber || searchInput;

// //     if (!input) {
// //       return res.status(400).json({ message: "Please provide search input" });
// //     }

// //     // ✅ Use $or to match either mobile OR accountNumber
// //     const accounts = await Account.find({
// //       $or: [{ mobile: input }, { accountNumber: input }],
// //     });

// //     if (!accounts.length) {
// //       return res.status(404).json({ message: "No accounts found" });
// //     }

// //     res.json({ accounts });
// //   } catch (err) {
// //     res.status(500).json({ error: "Error fetching accounts" });
// //   }
// // });

// // // ✅ Update account
// // router.put("/accounts/:id", async (req, res) => {
// //   try {
// //     const updated = await Account.findByIdAndUpdate(req.params.id, req.body, { new: true });
// //     res.json({ message: "Account updated", updated });
// //   } catch (err) {
// //     res.status(500).json({ error: "Error updating account" });
// //   }
// // });

// // // ✅ Delete account
// // router.delete("/accounts/:id", async (req, res) => {
// //   try {
// //     await Account.findByIdAndDelete(req.params.id);
// //     res.json({ message: "Account deleted" });
// //   } catch (err) {
// //     res.status(500).json({ error: "Error deleting account" });
// //   }
// // });

// // module.exports = router;




// --------===  //
const express = require("express");
const router = express.Router();
const Account = require("../models/Account");

// ✅ Add account
router.post("/accounts", async (req, res) => {
  try {
    const account = new Account(req.body);
    await account.save();
    res.json({ message: "Account added successfully", account });
  } catch (err) {
    res.status(500).json({ error: "Error adding account" });
  }
});

// ✅ Get accounts by mobile OR accountNumber
router.post("/getAccounts", async (req, res) => {
  try {
    const { mobile, accountNumber } = req.body;

    if (!mobile && !accountNumber) {
      return res.status(400).json({ message: "Please provide mobile or account number" });
    }

    let query = {};

    // ✅ If mobile provided → search by mobile
    if (mobile) {
      // extra safety: check India mobile regex
      if (!/^[6-9]\d{9}$/.test(mobile)) {
        return res.status(400).json({ message: "Invalid mobile number format" });
      }
      query = { mobile };
    }

    // ✅ If accountNumber provided → search by accountNumber
    if (accountNumber) {
      query = { accountNumber };
    }

    const accounts = await Account.find(query);

    if (!accounts.length) {
      return res.status(404).json({ message: "No accounts found" });
    }

    res.json({ accounts });
  } catch (err) {
    res.status(500).json({ error: "Error fetching accounts" });
  }
});

// ✅ Update account
router.put("/accounts/:id", async (req, res) => {
  try {
    const updated = await Account.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ message: "Account updated", updated });
  } catch (err) {
    res.status(500).json({ error: "Error updating account" });
  }
});

// ✅ Delete account
router.delete("/accounts/:id", async (req, res) => {
  try {
    await Account.findByIdAndDelete(req.params.id);
    res.json({ message: "Account deleted" });
  } catch (err) {
    res.status(500).json({ error: "Error deleting account" });
  }
});

module.exports = router;
