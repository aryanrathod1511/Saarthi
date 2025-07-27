import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { LoadingSpinner } from '../common';

const AuthCallback = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { login } = useAuth();
    const [error, setError] = useState(null);

    useEffect(() => {
        const token = searchParams.get('token');
        
        if (token) {
            handleLogin(token);
        } else {
            setError('No authentication token received');
        }
    }, [searchParams]);

    const handleLogin = async (token) => {
        try {
            const success = await login(token);
            if (success) {
                navigate('/dashboard');
            } else {
                setError('Login failed. Please try again.');
            }
        } catch (error) {
            console.error('Login error:', error);
            setError('An error occurred during login');
        }
    };

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100">
                <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4">
                    <div className="text-center">
                        <div className="text-red-500 text-6xl mb-4">⚠️</div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Login Failed</h2>
                        <p className="text-gray-600 mb-6">{error}</p>
                        <button
                            onClick={() => navigate('/')}
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Go Home
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
            <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4">
                <div className="text-center">
                    <LoadingSpinner size="lg" />
                    <h2 className="text-2xl font-bold text-gray-800 mt-4 mb-2">Logging you in...</h2>
                    <p className="text-gray-600">Please wait while we complete your authentication.</p>
                </div>
            </div>
        </div>
    );
};

export default AuthCallback; 