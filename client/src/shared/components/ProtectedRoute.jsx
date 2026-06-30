import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, token } = useAuth();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role?.toUpperCase())) {
    // Redirect to their own dashboard if they try to access wrong one
    const dashboardPath = user?.role ? `/dashboard/${user.role.toLowerCase()}` : '/';
    return <Navigate to={dashboardPath} replace />;
  }

  return children;
};
