import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { UserContext } from './UserContext';
import { canAccessRoute, hasPermission } from '../utils/rbac';

/**
 * Protected Route Component
 * Wraps routes that require authentication and role-based access
 */
const ProtectedRoute = ({ children, requiredRole, requiredPermissions, fallbackPath = '/login' }) => {
  const { isAuthenticated, userRole } = useContext(UserContext);

  // Check authentication
  if (!isAuthenticated) {
    return <Navigate to={fallbackPath} replace />;
  }

  // Check role-based access
  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!roles.includes(userRole?.toLowerCase())) {
      return <Navigate to="/" replace />;
    }
  }

  // Check permissions (if specified)
  if (requiredPermissions) {
    const permissions = Array.isArray(requiredPermissions) 
      ? requiredPermissions 
      : [requiredPermissions];
    
    const hasAccess = permissions.some(perm => hasPermission(userRole, perm));
    if (!hasAccess) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;


