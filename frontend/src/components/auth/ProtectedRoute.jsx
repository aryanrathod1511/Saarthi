import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { LoadingSpinner } from '../common';

const ProtectedRoute = ({ children, requireAuth = true }) => {
    const { isAuthenticated, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-50 via-primary-50/30 to-secondary-50/30">
                <div className="text-center">
                    <LoadingSpinner size="lg" />
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    if (requireAuth && !isAuthenticated) {
        // Redirect to login page with return URL
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (!requireAuth && isAuthenticated) {
        // Redirect authenticated users away from login/register pages
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

export default ProtectedRoute;