// components/RoleToggle.jsx
import React from "react";
import { UserCog, Users, HandHeart } from "lucide-react";
import "../css/RoleToggle.css";

const RoleToggle = ({ currentRole, onRoleChange }) => {
  const roles = [
    { key: "admin", label: "Admin", icon: <UserCog size={18} /> },
    { key: "volunteer", label: "Volunteer", icon: <Users size={18} /> },
    { key: "refugee", label: "Refugee", icon: <HandHeart size={18} /> },
  ];

  return (
    <div className="role-toggle">
      {roles.map((role) => (
        <button
          key={role.key}
          className={`role-btn ${currentRole === role.key ? "active" : ""}`}
          onClick={() => onRoleChange(role.key)}
        >
          {role.icon}
          <span>{role.label}</span>
        </button>
      ))}
    </div>
  );
};

export default RoleToggle;
