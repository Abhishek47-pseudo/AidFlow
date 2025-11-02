import React, { useState, useEffect } from 'react';
import { PlusCircle, Edit, Package, Loader, XCircle, Send, Inbox } from 'lucide-react';
import '../css/InventoryPage.css';
import RoleToggle from "../components/RoleToggle";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = 'http://localhost:5000/api/inventory/items';

const CATEGORIES = ['Medical', 'Food', 'Shelter', 'Equipment', 'Water'];
const STATUSES = ['adequate', 'low', 'critical'];
const TRANSACTION_TYPES = ['Outbound (Send)', 'Inbound (Receive)'];

const initialFormData = {
  name: '',
  category: '',
  currentStock: 0,
  minThreshold: 0,
  maxCapacity: 1000,
  unit: '',
  location: '',
  status: 'adequate',
  cost: 0,
  supplier: '',
};

const InventoryPage = () => {
  const [items, setItems] = useState([]);
  const [formData, setFormData] = useState(initialFormData);
  const [isEditing, setIsEditing] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [transactionItem, setTransactionItem] = useState(null);

  const navigate = useNavigate();

  // ✅ Role Toggle handler
  const handleRoleChange = (role) => {
    if (role === "volunteer") navigate("/volunteer");
    else if (role === "refugee") navigate("/refugee");
  };

  const fetchItems = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(API_BASE_URL);
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      setItems(data);
    } catch (err) {
      setError(`Failed to load inventory data: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleChange = (e) => {
    const { id, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: type === 'number' ? Number(value) : value,
    }));
  };

  const handleReset = () => {
    setFormData(initialFormData);
    setIsEditing(false);
    setEditingItemId(null);
    setMessage('');
    setError(null);
  };

  const populateForm = (item) => {
    setFormData({
      name: item.name,
      category: item.category,
      currentStock: item.currentStock,
      minThreshold: item.minThreshold,
      maxCapacity: item.maxCapacity,
      unit: item.unit,
      location: item.location,
      status: item.status,
      cost: item.cost,
      supplier: item.supplier,
    });
    setIsEditing(true);
    setEditingItemId(item._id);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage('');

    const method = isEditing ? 'PUT' : 'POST';
    const url = isEditing ? `${API_BASE_URL}/${editingItemId}` : API_BASE_URL;

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(`Server did not return JSON. Status: ${response.status}`);
      }

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `Server error`);

      setMessage(isEditing ? `Updated ${formData.name}` : `Created ${formData.name}`);
      handleReset();
      fetchItems();
    } catch (err) {
      setError(`Operation Failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const openTransactionModal = (item) => {
    setError(null);
    setMessage('');
    setTransactionItem(item);
    setIsTransactionModalOpen(true);
  };

  const closeTransactionModal = () => {
    setIsTransactionModalOpen(false);
    setTransactionItem(null);
  };

  const handleStockAdjustment = async (quantity, type, counterparty) => {
    if (!transactionItem || quantity <= 0) return;
    closeTransactionModal();
    setIsLoading(true);
    setError(null);
    setMessage('');

    const isOutbound = type.startsWith('Outbound');
    const change = isOutbound ? -quantity : quantity;
    let newStock = transactionItem.currentStock + change;

    if (isOutbound && newStock < 0) {
      setIsLoading(false);
      setError(`Cannot send ${quantity} units. Only ${transactionItem.currentStock} in stock.`);
      return;
    }

    if (!isOutbound && newStock > transactionItem.maxCapacity) {
      newStock = transactionItem.maxCapacity;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/${transactionItem._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentStock: newStock, lastUpdated: new Date().toISOString() }),
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(`Server did not return JSON for stock update`);
      }

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `Server error`);

      setMessage(`Recorded ${quantity} units of "${transactionItem.name}" ${isOutbound ? 'sent to' : 'received from'} ${counterparty}.`);
      fetchItems();
    } catch (err) {
      setError(`Stock adjustment failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="inventory-page">

      {/* ✅ Role Toggle added at top */}
      <RoleToggle currentRole="admin" onRoleChange={handleRoleChange} />

      <h1>Supply Chain Dashboard Overview</h1>
      <p className="subtitle">Centralized management for all disaster relief inventory.</p>

      {isLoading && <div className="status loading"><Loader className="spin" /> Loading...</div>}
      {error && <div className="status error"><XCircle /> {error}</div>}
      {message && !error && <div className="status success">{message}</div>}

      <section className="inventory-form-section">
        <h2>{isEditing ? 'Edit Inventory Item' : 'Add New Inventory Item'}</h2>
        <form onSubmit={handleSubmit} className="inventory-form">
          <div className="form-grid">
            <FormInput id="name" label="Item Name" value={formData.name} onChange={handleChange} required />
            <FormSelect id="category" label="Category" value={formData.category} onChange={handleChange} options={CATEGORIES} required />
            <FormInput id="supplier" label="Supplier" value={formData.supplier} onChange={handleChange} required />
            <FormInput id="currentStock" label="Current Stock" type="number" value={formData.currentStock} onChange={handleChange} required />
            <FormInput id="unit" label="Unit" value={formData.unit} onChange={handleChange} required />
            <FormInput id="location" label="Location" value={formData.location} onChange={handleChange} required />
            <FormInput id="cost" label="Cost" type="number" value={formData.cost} onChange={handleChange} required />
            <FormInput id="minThreshold" label="Min Threshold" type="number" value={formData.minThreshold} onChange={handleChange} />
            <FormInput id="maxCapacity" label="Max Capacity" type="number" value={formData.maxCapacity} onChange={handleChange} />
            <FormSelect id="status" label="Status" value={formData.status} onChange={handleChange} options={STATUSES} required />
          </div>

          <div className="form-buttons">
            <button type="submit" className="btn primary" disabled={isLoading}>
              {isEditing ? 'Save Changes' : <><PlusCircle /> Add Item</>}
            </button>
            {isEditing && <button type="button" onClick={handleReset} className="btn secondary">Cancel Edit</button>}
          </div>
        </form>
      </section>

      <section className="inventory-table-section">
        <h2>Inventory Overview ({items.length} items)</h2>
        {items.length === 0 ? (
          <div className="no-data">No items available.</div>
        ) : (
          <table className="inventory-table">
            <thead>
              <tr>
                <TableHeader title="Item Name" />
                <TableHeader title="Category" />
                <TableHeader title="Stock" />
                <TableHeader title="Unit" />
                <TableHeader title="Location" />
                <TableHeader title="Status" />
                <TableHeader title="Cost" />
                <TableHeader title="Actions" />
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item._id}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell>{item.currentStock}</TableCell>
                  <TableCell>{item.unit}</TableCell>
                  <TableCell>{item.location}</TableCell>
                  <TableCell>{item.status}</TableCell>
                  <TableCell>{item.cost}</TableCell>
                  <TableCell className="action-buttons">
                    <button onClick={() => populateForm(item)} className="icon-btn"><Edit size={18} /></button>
                    <button onClick={() => openTransactionModal(item)} className="icon-btn"><Package size={18} /></button>
                  </TableCell>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {isTransactionModalOpen && transactionItem && (
        <TransactionModal item={transactionItem} onConfirm={handleStockAdjustment} onCancel={closeTransactionModal} />
      )}
    </div>
  );
};

const TransactionModal = ({ item, onConfirm, onCancel }) => {
  const [quantity, setQuantity] = useState(1);
  const [type, setType] = useState(TRANSACTION_TYPES[0]);
  const [counterparty, setCounterparty] = useState('');

  const isOutbound = type.startsWith('Outbound');

  const handleConfirm = (e) => {
    e.preventDefault();
    if (quantity > 0 && counterparty) onConfirm(quantity, type, counterparty);
  };

  return (
    <div className="modal-backdrop">
      <div className="transaction-modal">
        <h3>Stock Adjustment: {item.name}</h3>
        <p>Current Stock: {item.currentStock} {item.unit}</p>

        <form onSubmit={handleConfirm} className="transaction-form">
          <label>Transaction Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)} required>
            {TRANSACTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <label>Quantity</label>
          <input type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} min="1" required />

          <label>{isOutbound ? 'Destination' : 'Source'}</label>
          <input type="text" value={counterparty} onChange={(e) => setCounterparty(e.target.value)} required />

          <div className="modal-buttons">
            <button type="button" onClick={onCancel} className="btn secondary">Cancel</button>
            <button type="submit" className="btn primary" disabled={quantity <= 0 || !counterparty}>
              {isOutbound ? <Send size={16} /> : <Inbox size={16} />} Confirm
            </button>
          </div>
        </form>
      </div>
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

const TableHeader = ({ title }) => <th>{title}</th>;
const TableCell = ({ children }) => <td>{children}</td>;

export default InventoryPage;
