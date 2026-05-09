import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { QRCodeSVG } from "qrcode.react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import "./App.css";

const API = process.env.REACT_APP_API_URL;
const SHOP_NAME = process.env.REACT_APP_SHOP_NAME;
const SHOP_MOBILE = process.env.REACT_APP_SHOP_MOBILE;

export default function App() {
  const [addForm, setAddForm] = useState({
    mobile: "",
    accountHolderName: "",
    accountNumber: "",
    bankName: "",
    ifscCode: "",
  });

  const [searchInput, setSearchInput] = useState("");
  const [rows, setRows] = useState([]);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;
  
  const [sidebarMode, setSidebarMode] = useState('add');
  const [activeAccount, setActiveAccount] = useState(null);
  const [printAmount, setPrintAmount] = useState("");

  const fileInputRef = useRef(null);

  const validateAccount = (acc) => {
    const { mobile, accountHolderName, accountNumber, ifscCode } = acc;
    if (!/^[6-9]\d{9}$/.test(String(mobile).trim())) return "❌ Invalid Mobile (10 digits starting with 6-9)";
    if (String(accountHolderName).trim().length < 3) return "❌ Name must be at least 3 characters";
    if (!/^\d{9,18}$/.test(String(accountNumber).trim())) return "❌ Invalid Account Number (9-18 digits)";
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(String(ifscCode).trim().toUpperCase())) return "❌ Invalid IFSC Format (e.g. SBIN0001234)";
    return null;
  };

  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => setMessage({ text: "", type: "" }), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const fetchBankDetails = async (ifsc) => {
    if (ifsc.length !== 11) return;
    try {
      const res = await axios.get(`https://ifsc.razorpay.com/${ifsc}`);
      if (res.data) {
        if (sidebarMode === 'add') setAddForm(prev => ({ ...prev, bankName: res.data.BANK }));
        else if (sidebarMode === 'edit') setActiveAccount(prev => ({ ...prev, bankName: res.data.BANK }));
      }
    } catch (err) {}
  };

  const onSearch = useCallback(async (e) => {
    if (e) e.preventDefault();
    if (!searchInput.trim()) {
      setMessage({ text: "⚠️ Enter mobile or account number", type: "error" });
      return;
    }
    setLoading(true);
    try {
      const isMobile = /^[6-9]\d{9}$/.test(searchInput);
      const payload = isMobile ? { mobile: searchInput } : { accountNumber: searchInput };
      const res = await axios.post(`${API}/getAccounts`, payload);
      setRows((res.data.accounts || []).map(a => ({ ...a, mobile: res.data.mobile || a.mobile })));
      setCurrentPage(1);
    } catch (err) {
      setRows([]);
      setMessage({ text: "⚠️ Not found", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [searchInput]);

  const viewAllAccounts = async () => {
    setLoading(true);
    setSearchInput("");
    try {
      const res = await axios.get(`${API}/accounts/all`);
      setRows(res.data.accounts || []);
      setCurrentPage(1);
      setMessage({ text: `✅ Loaded ${res.data.accounts.length} accounts`, type: "success" });
    } catch (err) {
      setMessage({ text: "❌ Error loading accounts", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const onAddChange = (e) => {
    const { name, value } = e.target;
    setAddForm(f => ({ ...f, [name]: value }));
    if (name === "ifscCode") fetchBankDetails(value);
  };

  const onAddSubmit = async (e) => {
    e.preventDefault();
    const error = validateAccount(addForm);
    if (error) {
      setMessage({ text: error, type: "error" });
      return;
    }
    setLoading(true);
    try {
      const savedMobile = addForm.mobile;
      await axios.post(`${API}/accounts`, addForm);
      setMessage({ text: "✅ Added successfully!", type: "success" });
      
      // 🔍 Filter view to show only this mobile's accounts
      setSearchInput(savedMobile);
      const res = await axios.post(`${API}/getAccounts`, { mobile: savedMobile });
      setRows(res.data.accounts || []);
      setCurrentPage(1);

      setAddForm({ mobile: "", accountHolderName: "", accountNumber: "", bankName: "", ifscCode: "" });
    } catch (err) {
      setMessage({ text: err.response?.data?.message || "❌ Add failed", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const data = new Uint8Array(evt.target.result);
      const wb = XLSX.read(data, { type: "array" });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const rawData = XLSX.utils.sheet_to_json(ws);

      // 🧠 Smart Mapping Logic: Detect columns automatically
      const mappedData = rawData.map(row => {
        const keys = Object.keys(row);
        const findVal = (terms) => {
          // Iterate through terms in ORDER to handle priority (e.g., Bene Name > Customer Name)
          for (const term of terms) {
            const key = keys.find(k => k.toLowerCase().includes(term.toLowerCase()));
            if (key && row[key] !== undefined && row[key] !== null) return String(row[key]).trim();
          }
          return "";
        };

        return {
          mobile: findVal(["sender no", "mobile", "phone", "mob", "contact"]),
          accountHolderName: findVal(["bene name", "beneficiary", "holder name", "holder", "customer", "name"]),
          accountNumber: findVal(["a/c no", "account no", "account number", "acc no", "bene no"]),
          ifscCode: findVal(["ifsc code", "ifsc"]),
          bankName: findVal(["bank", "bank name"])
        };
      }).filter(acc => {
        if (!acc.mobile || !acc.accountNumber) return false;
        return !validateAccount(acc); // Only keep valid records
      });

      if (mappedData.length === 0) {
        setMessage({ text: "❌ No valid data found in Excel", type: "error" });
        return;
      }

      setLoading(true);
      try {
        await axios.post(`${API}/accounts/bulk`, { accounts: mappedData });
        setMessage({ text: `✅ Successfully imported ${mappedData.length} accounts!`, type: "success" });
        viewAllAccounts();
      } catch (err) {
        setMessage({ text: "❌ Bulk import failed", type: "error" });
      } finally {
        setLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Accounts");
    XLSX.writeFile(wb, `BankAccounts_${new Date().toLocaleDateString()}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text(SHOP_NAME + " - Bank Accounts", 14, 15);
    doc.autoTable({
      head: [['Holder', 'Bank', 'Account No', 'IFSC', 'Mobile']],
      body: rows.map(r => [r.accountHolderName, r.bankName, r.accountNumber, r.ifscCode, r.mobile]),
      startY: 20,
    });
    doc.save(`BankAccounts_${new Date().toLocaleDateString()}.pdf`);
  };

  const onUpdateSubmit = async () => {
    const error = validateAccount(activeAccount);
    if (error) {
      setMessage({ text: error, type: "error" });
      return;
    }
    try {
      const { mobile, _id, accountHolderName, accountNumber, bankName, ifscCode } = activeAccount;
      await axios.put(`${API}/accounts/${mobile}/${_id}`, { accountHolderName, accountNumber, bankName, ifscCode });
      setMessage({ text: "✅ Updated!", type: "success" });
      setRows(rows.map(r => r._id === _id ? { ...activeAccount } : r));
      setSidebarMode('add');
    } catch (err) {
      setMessage({ text: "❌ Update failed", type: "error" });
    }
  };

  const onDelete = async (row) => {
    if (!window.confirm("Delete this account?")) return;
    try {
      await axios.delete(`${API}/accounts/${row.mobile}/${row._id}`);
      setMessage({ text: "✅ Deleted", type: "success" });
      setRows(rows.filter(r => r._id !== row._id));
    } catch (err) {
      setMessage({ text: "❌ Delete failed", type: "error" });
    }
  };

  const deleteAllAccounts = async () => {
    if (!window.confirm("⚠️ WARNING: Are you sure you want to DELETE ALL records? This cannot be undone!")) return;
    if (!window.confirm("Final check: Click OK to wipe the entire database.")) return;
    setLoading(true);
    try {
      await axios.delete(`${API}/accounts/delete-all`);
      setRows([]);
      setMessage({ text: "✅ Database cleared!", type: "success" });
    } catch (err) {
      setMessage({ text: "❌ Clear failed", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const switchToEdit = (row) => { setSidebarMode('edit'); setActiveAccount({ ...row }); };
  const switchToPrint = (row) => { setSidebarMode('print'); setActiveAccount({ ...row }); setPrintAmount(""); };
  const switchToQR = (row) => { setSidebarMode('qr'); setActiveAccount({ ...row }); };

  const generateReceipt = (e) => {
    if (e) e.preventDefault();
    const receiptContent = `
      <html><head><style>body { font-family: sans-serif; padding: 40px; color: #1e293b; } .receipt { max-width: 400px; margin: auto; border: 1px solid #e2e8f0; padding: 30px; border-radius: 12px; } .header { text-align: center; border-bottom: 2px dashed #e2e8f0; padding-bottom: 20px; margin-bottom: 20px; } .row { display: flex; justify-content: space-between; margin: 10px 0; } .total { margin-top: 20px; background: #f8fafc; padding: 15px; border-radius: 8px; text-align: center; font-size: 24px; font-weight: bold; color: #7c3aed; }</style></head><body>
      <div class="receipt"><div class="header"><h2>${SHOP_NAME}</h2><p>${SHOP_MOBILE}</p><p style="font-size:12px;color:#64748b;">${new Date().toLocaleString()}</p></div><div class="row"><span>Holder:</span> <span>${activeAccount.accountHolderName}</span></div><div class="row"><span>Bank:</span> <span>${activeAccount.bankName}</span></div><div class="row"><span>A/C No:</span> <span>${activeAccount.accountNumber}</span></div><div class="total">₹ ${Number(printAmount).toLocaleString()}</div></div></body></html>
    `;
    const win = window.open("", "_blank");
    win.document.write(receiptContent);
    win.document.close();
    win.onload = () => { win.print(); win.close(); setSidebarMode('add'); };
  };

  return (
    <div className="app-container">
      <header>
        <h1>{SHOP_NAME}</h1>
        <p style={{ color: "var(--text-secondary)", fontWeight: 500 }}>Bank Information Hub</p>
      </header>

      <div className="search-bar-wrapper">
        <div className="search-input-container">
          <span className="search-icon-fixed">🔍</span>
          <input type="text" placeholder="Search Mobile or Account No..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onSearch()} />
        </div>
        <button className="btn btn-search" onClick={onSearch} disabled={loading}>{loading ? "⌛" : "Search"}</button>
        <button className="btn btn-secondary btn-search" onClick={viewAllAccounts} style={{ width: 'auto', background: 'rgba(255,255,255,0.05)' }}>View All</button>
      </div>

      <div className="main-grid">
        <div className="glass-card">
          {sidebarMode === 'add' && (
            <>
              <h2><span>✨</span> Add Account</h2>
              <form onSubmit={onAddSubmit}>
                <div className="input-group"><label>Mobile</label><input name="mobile" value={addForm.mobile} onChange={onAddChange} required /></div>
                <div className="input-group"><label>Holder Name</label><input name="accountHolderName" value={addForm.accountHolderName} onChange={onAddChange} required /></div>
                <div className="input-group"><label>Account No</label><input name="accountNumber" value={addForm.accountNumber} onChange={onAddChange} required /></div>
                <div className="input-group"><label>IFSC</label><input name="ifscCode" value={addForm.ifscCode} onChange={onAddChange} required /></div>
                <div className="input-group"><label>Bank</label><input name="bankName" value={addForm.bankName} onChange={onAddChange} required /></div>
                <button className="btn" type="submit">Save Account</button>
                <button className="btn btn-secondary" type="button" onClick={() => fileInputRef.current.click()} style={{ marginTop: '0.75rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>📥 Bulk Import (Excel)</button>
                <input type="file" ref={fileInputRef} onChange={handleBulkImport} style={{ display: 'none' }} accept=".xlsx, .xls, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, text/csv" />
              </form>
            </>
          )}

          {sidebarMode === 'edit' && (
            <>
              <h2><span>✏️</span> Edit Account</h2>
              <form onSubmit={(e) => { e.preventDefault(); onUpdateSubmit(); }}>
                <div className="input-group"><label>Mobile (Locked)</label><input value={activeAccount.mobile} disabled /></div>
                <div className="input-group"><label>Holder</label><input value={activeAccount.accountHolderName} onChange={(e) => setActiveAccount({...activeAccount, accountHolderName: e.target.value})} required /></div>
                <div className="input-group"><label>Account No</label><input value={activeAccount.accountNumber} onChange={(e) => setActiveAccount({...activeAccount, accountNumber: e.target.value})} required /></div>
                <div className="input-group"><label>IFSC</label><input value={activeAccount.ifscCode} onChange={(e) => { setActiveAccount({...activeAccount, ifscCode: e.target.value}); fetchBankDetails(e.target.value); }} required /></div>
                <div className="input-group"><label>Bank</label><input value={activeAccount.bankName} onChange={(e) => setActiveAccount({...activeAccount, bankName: e.target.value})} required /></div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn" type="submit" style={{ flex: 2 }}>Update</button>
                  <button className="btn btn-secondary" type="button" onClick={() => setSidebarMode('add')} style={{ flex: 1 }}>Cancel</button>
                </div>
              </form>
            </>
          )}

          {sidebarMode === 'print' && (
            <>
              <h2><span>🧾</span> Print</h2>
              <form onSubmit={generateReceipt}>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>Printing for: <strong>{activeAccount.accountHolderName}</strong></p>
                <div className="input-group"><label>Amount (₹)</label><input type="number" value={printAmount} onChange={(e) => setPrintAmount(e.target.value)} autoFocus required /></div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn" type="submit" style={{ flex: 2 }}>Print</button>
                  <button className="btn btn-secondary" type="button" onClick={() => setSidebarMode('add')} style={{ flex: 1 }}>Cancel</button>
                </div>
              </form>
            </>
          )}

          {sidebarMode === 'qr' && (
            <>
              <h2><span>📱</span> QR Code</h2>
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <QRCodeSVG value={`upi://pay?pa=${activeAccount.accountNumber}@${activeAccount.ifscCode}.ifsc.npci&pn=${activeAccount.accountHolderName}&cu=INR`} size={200} />
              </div>
              <button className="btn btn-secondary" onClick={() => setSidebarMode('add')}>Back</button>
            </>
          )}

          {message.text && <div className={`message ${message.type}`} style={{ marginTop: "1rem" }}>{message.text}</div>}
        </div>

        <div className="results-column">
          <div className="results-header">
            <h2><span>📊</span> Results</h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="export-btn" onClick={deleteAllAccounts} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }} title="Delete All Records">🗑️ Delete All</button>
              <button className="export-btn" onClick={exportToExcel} title="Export to Excel">📊 Excel</button>
              <button className="export-btn" onClick={exportToPDF} title="Export to PDF">📄 PDF</button>
            </div>
          </div>
          <div className="results-grid">
            {rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((r) => (
              <div key={r._id} className={`account-card ${activeAccount?._id === r._id ? 'active' : ''}`}>
                <div className="acc-main-info">
                  <h4>{r.accountHolderName}</h4>
                  <div className="acc-bank-details">🏦 {r.bankName} • {r.accountNumber}</div>
                  <div className="acc-meta"><span>IFSC: {r.ifscCode}</span><span>Mob: {r.mobile}</span></div>
                </div>
                <div className="acc-actions">
                  <button className="action-btn" onClick={() => switchToEdit(r)} data-tooltip="Edit">✏️</button>
                  <button className="action-btn" onClick={() => switchToPrint(r)} data-tooltip="Print">🧾</button>
                  <button className="action-btn" onClick={() => switchToQR(r)} data-tooltip="QR Code">📱</button>
                  <button className="action-btn delete" onClick={() => onDelete(r)} data-tooltip="Delete">🗑️</button>
                </div>
              </div>
            ))}
            {rows.length === 0 && <div className="glass-card" style={{ textAlign: "center", color: "var(--text-secondary)", padding: "3rem" }}>Search or click "View All"</div>}
            
            {rows.length > PAGE_SIZE && (
              <div className="pagination" style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1.5rem', alignItems: 'center' }}>
                <button className="btn btn-secondary" style={{ width: 'auto', padding: '0.5rem 1rem' }} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>← Prev</button>
                <span style={{ color: 'var(--text-secondary)' }}>Page {currentPage} of {Math.ceil(rows.length / PAGE_SIZE)}</span>
                <button className="btn btn-secondary" style={{ width: 'auto', padding: '0.5rem 1rem' }} onClick={() => setCurrentPage(p => Math.min(Math.ceil(rows.length / PAGE_SIZE), p + 1))} disabled={currentPage === Math.ceil(rows.length / PAGE_SIZE)}>Next →</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
