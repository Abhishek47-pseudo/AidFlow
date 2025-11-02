import React, { useState, useEffect } from "react";
import { PackagePlus, Loader, XCircle, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import RoleToggle from "../components/RoleToggle";
import "../css/InventoryPage.css";

const DONATION_API = "http://localhost:5000/api/donations";
const INVENTORY_API = "http://localhost:5000/api/inventory/items";
const CATEGORIES = ["Medical", "Food", "Shelter", "Equipment", "Water"];

const initialFormData = {
  itemName: "",
  category: "",
  quantity: 1,
  location: "",
};

const VolunteerPage = () => {
  const [donations, setDonations] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [formData, setFormData] = useState(initialFormData);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  const handleRoleChange = (role) => {
    if (role === "admin") navigate("/inventory");
    else if (role === "recipient") navigate("/recipient");
  };

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [invRes, donRes] = await Promise.all([
        fetch(INVENTORY_API),
        fetch(DONATION_API),
      ]);
      setInventory(await invRes.json());
      setDonations(await donRes.json());
    } catch (err) {
      setError(`Failed to load data: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");
    setError(null);

    try {
      const res = await fetch(DONATION_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Failed to donate");
      setMessage(`Donation for "${formData.itemName}" added!`);
      setFormData(initialFormData);
      fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="inventory-page">
      <RoleToggle currentRole="volunteer" onRoleChange={handleRoleChange} />
      <h1>Volunteer Donation Portal</h1>
      <p className="subtitle">Donate items, track donations, and view needs.</p>

      {isLoading && <div className="status loading"><Loader className="spin" /> Loading...</div>}
      {error && <div className="status error"><XCircle /> {error}</div>}
      {message && <div className="status success"><CheckCircle2 /> {message}</div>}

      {/* Donate Form */}
      <section className="inventory-form-section">
        <h2>Donate an Item</h2>
        <form onSubmit={handleSubmit} className="inventory-form">
          <div className="form-grid">
            <FormInput id="itemName" label="Item Name" value={formData.itemName} onChange={handleChange} required />
            <FormSelect id="category" label="Category" value={formData.category} onChange={handleChange} options={CATEGORIES} required />
            <FormInput id="quantity" label="Quantity" type="number" value={formData.quantity} onChange={handleChange} min="1" required />
            <FormInput id="location" label="Location" value={formData.location} onChange={handleChange} required />
          </div>
          <button type="submit" className="btn primary" disabled={isLoading}>
            <PackagePlus /> Donate Item
          </button>
        </form>
      </section>

      {/* My Donations */}
      <section className="inventory-table-section">
        <h2>My Donations ({donations.length})</h2>
        {donations.length === 0 ? (
          <div className="no-data">No donations yet.</div>
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
              {donations.map((d) => (
                <tr key={d._id}>
                  <td>{d.itemName}</td>
                  <td>{d.category}</td>
                  <td>{d.quantity}</td>
                  <td>{d.location}</td>
                  <td>{d.status}</td>
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
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  </div>
);

export default VolunteerPage;
