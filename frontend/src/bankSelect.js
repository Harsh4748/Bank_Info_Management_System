// import React, { useState } from "react";
// import axios from "axios";
// import "./App.css";
// import { mainBranchBanks } from "./banksData";

// const API = "http://localhost:5000/api";

// const SHOP_NAME = "Agrawal Mobile Sayan";
// const SHOP_MOBILE = "9714246474";

// // --- Bank Selector Component ---
// function BankSelector({ onSelect }) {
//   const [banks, setBanks] = useState(mainBranchBanks);
//   const [query, setQuery] = useState("");
//   const [selectedBank, setSelectedBank] = useState(null);
//   const [newBank, setNewBank] = useState({ name: "", ifsc: "" });
//   const [showForm, setShowForm] = useState(false);

//   const filteredBanks = banks.filter((bank) =>
//     bank.name.toLowerCase().startsWith(query.toLowerCase())
//   );

//   const handleSelect = (bank) => {
//     setSelectedBank(bank);
//     setQuery(bank.name);
//     onSelect(bank); // Pass back to parent
//   };

//   const handleAddBank = () => {
//     if (newBank.name && newBank.ifsc) {
//       setBanks([...banks, newBank]);
//       setShowForm(false);
//       setQuery(newBank.name);
//       setSelectedBank(newBank);
//       onSelect(newBank);
//       setNewBank({ name: "", ifsc: "" });
//     }
//   };

//   return (
//     <div>
//       <label>Bank Name:</label>
//       <input
//         type="text"
//         value={query}
//         onChange={(e) => {
//           setQuery(e.target.value);
//           setSelectedBank(null);
//           onSelect({ name: e.target.value, ifsc: "" });
//         }}
//         placeholder="Type bank name"
//       />

//       {query && !selectedBank && (
//         <ul style={{ border: "1px solid #ccc", maxHeight: "120px", overflowY: "auto" }}>
//           {filteredBanks.length > 0 ? (
//             filteredBanks.map((bank, idx) => (
//               <li
//                 key={idx}
//                 onClick={() => handleSelect(bank)}
//                 style={{ cursor: "pointer", padding: "5px" }}
//               >
//                 {bank.name}
//               </li>
//             ))
//           ) : (
//             <li
//               style={{ cursor: "pointer", padding: "5px", color: "blue" }}
//               onClick={() => setShowForm(true)}
//             >
//               + Add new bank
//             </li>
//           )}
//         </ul>
//       )}

//       <div>
//         <label>IFSC Code:</label>
//         <input type="text" value={selectedBank?.ifsc || ""} readOnly />
//       </div>

//       {showForm && (
//         <div style={{ marginTop: "10px", border: "1px solid #ccc", padding: "10px" }}>
//           <h4>Add New Bank</h4>
//           <input
//             type="text"
//             placeholder="Bank Name"
//             value={newBank.name}
//             onChange={(e) => setNewBank({ ...newBank, name: e.target.value })}
//           />
//           <input
//             type="text"
//             placeholder="IFSC Code"
//             value={newBank.ifsc}
//             onChange={(e) => setNewBank({ ...newBank, ifsc: e.target.value })}
//           />
//           <button onClick={handleAddBank}>Save</button>
//           <button onClick={() => setShowForm(false)}>Cancel</button>
//         </div>
//       )}
//     </div>
//   );
// }

// export default function App() {
//   const [addForm, setAddForm] = useState({
//     mobile: "",
//     accountHolderName: "",
//     accountNumber: "",
//     bankName: "",
//     ifscCode: "",
//   });

//   const [searchInput, setSearchInput] = useState("");
//   const [rows, setRows] = useState([]);
//   const [message, setMessage] = useState("");

//   const [editing, setEditing] = useState(null);
//   const [showModal, setShowModal] = useState(false);

//   const onAddChange = (e) => {
//     setAddForm((f) => ({ ...f, [e.target.name]: e.target.value }));
//   };

//   const onBankSelect = (bank) => {
//     setAddForm((f) => ({ ...f, bankName: bank.name, ifscCode: bank.ifsc }));
//   };

//   const onAddSubmit = async (e) => {
//     e.preventDefault();
//     setMessage("");
//     try {
//       await axios.post(`${API}/accounts`, addForm);
//       setMessage("✅ Account added successfully!");
//       setAddForm({
//         mobile: "",
//         accountHolderName: "",
//         accountNumber: "",
//         bankName: "",
//         ifscCode: "",
//       });
//       if (/^[6-9]\d{9}$/.test(searchInput) && searchInput === addForm.mobile) {
//         await onSearch();
//       }
//     } catch (err) {
//       setMessage(err.response?.data?.message || "❌ Error adding account");
//     }
//   };

//   const onSearch = async () => {
//     setMessage("");
//     setRows([]);
//     try {
//       const isMobile = /^[6-9]\d{9}$/.test(searchInput);
//       const payload = isMobile
//         ? { mobile: searchInput }
//         : { accountNumber: searchInput };
//       const res = await axios.post(`${API}/getAccounts`, payload);
//       const flattened = (res.data.accounts || []).map((a) => ({
//         ...a,
//         mobile: res.data.mobile,
//       }));
//       setRows(flattened);
//     } catch (err) {
//       setRows([]);
//       setMessage(err.response?.data?.message || "⚠️ No accounts found");
//     }
//   };

//   return (
//     <div className="container">
//       <div className="left-panel">
//         <h2>Add Account</h2>
//         <form onSubmit={onAddSubmit} className="form-box">
//           <input
//             name="mobile"
//             placeholder="Mobile (10 digits)"
//             value={addForm.mobile}
//             onChange={onAddChange}
//             required
//           />
//           <input
//             name="accountHolderName"
//             placeholder="Account Holder Name"
//             value={addForm.accountHolderName}
//             onChange={onAddChange}
//             required
//           />
//           <input
//             name="accountNumber"
//             placeholder="Account Number"
//             value={addForm.accountNumber}
//             onChange={onAddChange}
//             required
//           />

//           {/* 🔽 Replaced with smart bank selector */}
//           <BankSelector onSelect={onBankSelect} />

//           <button className="btn" type="submit">
//             Add
//           </button>
//         </form>

//         <h2>Search</h2>
//         <div className="form-box">
//           <input
//             placeholder="Enter Mobile OR Account Number"
//             value={searchInput}
//             onChange={(e) => setSearchInput(e.target.value)}
//           />
//           <button className="btn" onClick={onSearch}>
//             Search
//           </button>
//         </div>

//         {message && <p className="message">{message}</p>}
//       </div>

//       <div className="right-panel">
//         {rows.length > 0 && (
//           <div className="table-box">
//             <h3>Results for: {searchInput}</h3>
//             <table>
//               <thead>
//                 <tr>
//                   <th>Mobile</th>
//                   <th>Holder</th>
//                   <th>Account No</th>
//                   <th>Bank</th>
//                   <th>IFSC</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {rows.map((r) => (
//                   <tr key={r._id}>
//                     <td>{r.mobile}</td>
//                     <td>{r.accountHolderName}</td>
//                     <td>{r.accountNumber}</td>
//                     <td>{r.bankName}</td>
//                     <td>{r.ifscCode}</td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }
