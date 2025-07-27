import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import toast from 'react-hot-toast';
import { authService } from '../services/authService.js';

const AuthContext = createContext();

const initialState = {
    user: null,
    token: localStorage.getItem('token'),
    isAuthenticated: false,
    loading: true
};

const authReducer = (state, action) => {
    switch (action.type) {
        case 'LOGIN_SUCCESS':
            return {
                ...state,
                user: action.payload.user,
                token: action.payload.token,
                isAuthenticated: true,
                loading: false
            };
        case 'LOGOUT':
            return {
                ...state,
                user: null,
                token: null,
                isAuthenticated: false,
                loading: false
            };
        case 'SET_LOADING':
            return {
                ...state,
                loading: action.payload
            };
        case 'UPDATE_USER':
            return {
                ...state,
                user: { ...state.user, ...action.payload }
            };
        default:
            return state;
    }
};

export const AuthProvider = ({ children }) => {
    const [state, dispatch] = useReducer(authReducer, initialState);

    // Check token validity on app load
    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('token');
            
            if (token) {
                try {
                    // Check if token is expired
                    const decoded = jwtDecode(token);
                    const currentTime = Date.now() / 1000;
                    
                    if (decoded.exp < currentTime) {
                        // Token expired
                        localStorage.removeItem('token');
                        dispatch({ type: 'LOGOUT' });
                        return;
                    }
                    
                    // Fetch current user data
                    const data = await authService.getCurrentUser();
                    dispatch({
                        type: 'LOGIN_SUCCESS',
                        payload: { user: data.user, token }
                    });
                } catch (error) {
                    console.error('Auth check error:', error);
                    localStorage.removeItem('token');
                    dispatch({ type: 'LOGOUT' });
                }
            } else {
                dispatch({ type: 'SET_LOADING', payload: false });
            }
        };
        
        checkAuth();
    }, []);

    const login = async (token) => {
        try {
            localStorage.setItem('token', token);
            
            // Use authService instead of direct fetch
            const data = await authService.getCurrentUser();
            dispatch({
                type: 'LOGIN_SUCCESS',
                payload: { user: data.user, token }
            });
            toast.success('Login successful!');
            return true;
        } catch (error) {
            console.error('Login error:', error);
            localStorage.removeItem('token');
            toast.error('Login failed. Please try again.');
            return false;
        }
    };

    const logout = async () => {
        try {
            await authService.logout();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.removeItem('token');
            dispatch({ type: 'LOGOUT' });
            toast.success('Logged out successfully');
        }
    };

    const updateUserPreferences = async (preferences) => {
        try {
            const data = await authService.updatePreferences(preferences);
            dispatch({ type: 'UPDATE_USER', payload: data.user });
            toast.success('Preferences updated successfully');
            return true;
        } catch (error) {
            console.error('Update preferences error:', error);
            toast.error('Failed to update preferences');
            return false;
        }
    };

    const value = {
        ...state,
        login,
        logout,
        updateUserPreferences
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}; 