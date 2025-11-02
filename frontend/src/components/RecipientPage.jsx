// ---------------------- RecipientPage.jsx ----------------------
import React, { useState, useEffect } from 'react';
import { PlusCircle, Loader, XCircle, CheckCircle2 } from 'lucide-react';
import '../css/InventoryPage.css';
import RoleToggle from "../components/RoleToggle";
import { useNavigate } from "react-router-dom";

const REQUEST_API = 'http://localhost:5000/api/requests';
const INVENTORY_API = 'http://localhost:5000/api/inventory/items';
const CATEGORIES = ['Medical', 'Food', 'Shelter', 'Equipment', 'Water'];

const initialFormData = {
  itemName: '',
  category: '',
  quantity: 1,
  location: '',
};

const RecipientPage = () => {
  const [requests, setRequests] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [formData, setFormData] = useState(initialFormData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');

  const navigate = useNavigate();

  // ✅ Role Toggle handler
  const handleRoleChange = (role) => {
    if (role === "admin") navigate("/inventory");
    else if (role === "volunteer") navigate("/volunteer");
    else if (role === "recipient") navigate("/recipient");
  };

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [invRes, reqRes] = await Promise.all([
        fetch(INVENTORY_API),
        fetch(REQUEST_API),
      ]);

      const invData = await invRes.json();
      const reqData = await reqRes.json();

      setInventory(invData);
      setRequests(reqData);
    } catch (err) {
      setError(`Failed to load data: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (message || error) {
      const timer = setTimeout(() => {
        setMessage('');
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message, error]);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.quantity <= 0) {
      setError("Quantity must be greater than zero");
      return;
    }

    setIsLoading(true);
    setError(null);
    setMessage('');

    try {
      const response = await fetch(REQUEST_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to submit request');

      setMessage(`Request for "${formData.itemName}" sent successfully!`);
      setFormData(initialFormData);
      fetchData();
    } catch (err) {
      setError(`Submission failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="inventory-page">
      {/* ✅ Role Toggle at top */}
      <RoleToggle currentRole="recipient" onRoleChange={handleRoleChange} />

      <h1>Relief Request Portal</h1>
      <p className="subtitle">Request supplies and view available inventory.</p>

      {isLoading && <div className="status loading"><Loader className="spin" /> Loading...</div>}
      {error && <div className="status error"><XCircle /> {error}</div>}
      {message && !error && <div className="status success"><CheckCircle2 /> {message}</div>}

      {/* ---------------- Request Form ---------------- */}
      <section className="inventory-form-section">
        <h2>Request an Item</h2>
        <form onSubmit={handleSubmit} className="inventory-form">
          <div className="form-grid">
            <FormInput id="itemName" label="Item Name" value={formData.itemName} onChange={handleChange} required />
            <FormSelect id="category" label="Category" value={formData.category} onChange={handleChange} options={CATEGORIES} required />
            <FormInput id="quantity" label="Quantity" type="number" value={formData.quantity} onChange={handleChange} min="1" required />
            <FormInput id="location" label="Location" value={formData.location} onChange={handleChange} required />
          </div>

          <div className="form-buttons">
            <button type="submit" className="btn primary" disabled={isLoading}>
              <PlusCircle /> Request Item
            </button>
          </div>
        </form>
      </section>

      {/* ---------------- Inventory Overview ---------------- */}
      <section className="inventory-table-section">
        <h2>Available Inventory</h2>
        {inventory.length === 0 ? (
          <div className="no-data">No inventory data available.</div>
        ) : (
          <table className="inventory-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Category</th>
                <th>Stock</th>
                <th>Location</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((item) => (
                <tr key={item._id}>
                  <td>{item.name}</td>
                  <td>{item.category}</td>
                  <td>{item.currentStock}</td>
                  <td>{item.location}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* ---------------- User Requests ---------------- */}
      <section className="inventory-table-section">
        <h2>My Requests ({requests.length} entries)</h2>
        {requests.length === 0 ? (
          <div className="no-data">No requests made yet.</div>
        ) : (
          <table className="inventory-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Category</th>
                <th>Quantity</th>
                <th>Location</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req._id}>
                  <td>{req.itemName}</td>
                  <td>{req.category}</td>
                  <td>{req.quantity}</td>
                  <td>{req.location}</td>
                  <td className={`status-tag ${req.status}`}>{req.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
};

const FormInput = ({ id, label, value, onChange, type = "text", required = false, min }) => (
  <div className="form-group">
    <label htmlFor={id}>{label}</label>
    <input type={type} id={id} value={value} onChange={onChange} required={required} min={min} />
  </div>
);

const FormSelect = ({ id, label, value, onChange, options, required = false }) => (
  <div className="form-group">
    <label htmlFor={id}>{label}</label>
    <select id={id} value={value} onChange={onChange} required={required}>
      <option value="" disabled>-- Select --</option>
      {options.map(option => <option key={option} value={option}>{option}</option>)}
    </select>
  </div>
);

export default RecipientPage;
