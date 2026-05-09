# 🏦 Bank Info Management System

A high-performance, modern MERN stack application designed for seamless management of bank account details, bulk data processing, and transaction documentation.

## ✨ Key Features

### 🧠 Smart Data Management
- **Intelligent Bulk Import**: Upload Excel or CSV files directly. Our **Smart Mapping** engine automatically identifies columns like 'Sender No', 'Bene Name', 'A/C No', and 'IFSC', ignoring irrelevant columns.
- **Hybrid Data Architecture**: Supports both legacy nested structures and modern flat records for maximum flexibility.
- **Duplicate Prevention**: Advanced logic prevents adding the same Account Number multiple times for the same Mobile Number.

### 🛡️ Robust Validation
- **Strict Data Integrity**: Real-time validation for Mobile (10 digits), Account Numbers (9-18 digits), and IFSC formats.
- **Auto Bank Discovery**: Automatically fetches the Bank Name via Razorpay API when a valid IFSC code is entered.

### 📊 Advanced Operations
- **Pagination**: Optimized viewing with 10 records per page for better performance.
- **Bulk Cleanup**: Secure "Delete All" feature with multiple safety prompts.
- **Instant Search**: Search by Mobile or Account Number with live result filtering.

### 📄 Documentation & Tools
- **Pro Exporting**: Export results to high-quality **Excel** or **PDF** formats instantly.
- **Receipt System**: Generate and print professional transaction receipts for customers.
- **Dynamic UPI QR**: Create instant UPI QR codes for any account for seamless mobile payments.

## 🛠️ Technology Stack
- **Frontend**: React.js, Axios, SheetJS (XLSX), jsPDF, QRCode.react.
- **Backend**: Node.js, Express.js, MongoDB (Mongoose).
- **UI/UX**: Custom Glassmorphism design with responsive CSS.

## 🚀 Quick Start

### Setup
1. **Backend**:
   ```bash
   cd backend
   npm install
   npm start
   ```
2. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm start
   ```

## 📝 Project Context
Developed for **Agrawal Mobile Sayan** to streamline banking account administration.
