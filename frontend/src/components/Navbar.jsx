import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Menu, 
    X, 
    User, 
    LogOut, 
    Settings, 
    BarChart3,
    Home,
    MessageSquare,
    FileText
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { cn } from '../utils/helpers.js';

const Navbar = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const { user, isAuthenticated, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = async () => {
        await logout();
        navigate('/');
        setIsProfileOpen(false);
    };

    const navItems = [
        { name: 'Home', path: '/', icon: Home },
        { name: 'Interview', path: '/interview', icon: MessageSquare },
        { name: 'Dashboard', path: '/dashboard', icon: BarChart3, requiresAuth: true },
        { name: 'Profile', path: '/profile', icon: User, requiresAuth: true },
    ].filter(item => !item.requiresAuth || isAuthenticated);

    const isActive = (path) => location.pathname === path;

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <Link to="/" className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-sm">AI</span>
                        </div>
                        <span className="text-xl font-bold text-gray-800">Interviewer</span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center space-x-8">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.name}
                                    to={item.path}
                                    className={cn(
                                        "flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                                        isActive(item.path)
                                            ? "text-blue-600 bg-blue-50"
                                            : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                                    )}
                                >
                                    <Icon className="w-4 h-4" />
                                    <span>{item.name}</span>
                                </Link>
                            );
                        })}
                    </div>

                    {/* Auth Section */}
                    <div className="flex items-center space-x-4">
                        {isAuthenticated ? (
                            <div className="relative">
                                <button
                                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                                    className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    {user?.picture ? (
                                        <img
                                            src={user.picture}
                                            alt={user.name}
                                            className="w-8 h-8 rounded-full"
                                        />
                                    ) : (
                                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                                            <span className="text-white text-sm font-medium">
                                                {user?.name?.charAt(0) || 'U'}
                                            </span>
                                        </div>
                                    )}
                                    <span className="hidden sm:block text-sm font-medium text-gray-700">
                                        {user?.name}
                                    </span>
                                </button>

                                <AnimatePresence>
                                    {isProfileOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2"
                                        >
                                            <Link
                                                to="/profile"
                                                className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                                onClick={() => setIsProfileOpen(false)}
                                            >
                                                <User className="w-4 h-4" />
                                                <span>Profile</span>
                                            </Link>
                                            <Link
                                                to="/dashboard"
                                                className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                                onClick={() => setIsProfileOpen(false)}
                                            >
                                                <BarChart3 className="w-4 h-4" />
                                                <span>Dashboard</span>
                                            </Link>
                                            <button
                                                onClick={handleLogout}
                                                className="flex items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                                            >
                                                <LogOut className="w-4 h-4" />
                                                <span>Logout</span>
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ) : (
                            <div className="flex items-center space-x-3">
                                <Link
                                    to="/login"
                                    className="text-gray-600 hover:text-gray-900 font-medium"
                                >
                                    Sign In
                                </Link>
                                <Link
                                    to="/login"
                                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                                >
                                    Get Started
                                </Link>
                            </div>
                        )}

                        {/* Mobile menu button */}
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="md:hidden p-2 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            {isMenuOpen ? (
                                <X className="w-6 h-6 text-gray-600" />
                            ) : (
                                <Menu className="w-6 h-6 text-gray-600" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Navigation */}
            <AnimatePresence>
                {isMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden border-t border-gray-200 bg-white"
                    >
                        <div className="px-4 py-4 space-y-2">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.name}
                                        to={item.path}
                                        className={cn(
                                            "flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                                            isActive(item.path)
                                                ? "text-blue-600 bg-blue-50"
                                                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                                        )}
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        <Icon className="w-4 h-4" />
                                        <span>{item.name}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
};

export default Navbar; 