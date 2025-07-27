import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext.jsx';
import { 
    User, 
    Mail, 
    Calendar, 
    Settings, 
    Moon, 
    Sun,
    Bell,
    BellOff,
    Save
} from 'lucide-react';
import { LoadingSpinner } from '../components/common';

const ProfilePage = () => {
    const { user, updateUserPreferences } = useAuth();
    const [preferences, setPreferences] = useState({
        theme: user?.preferences?.theme || 'light',
        notifications: user?.preferences?.notifications !== false
    });
    const [saving, setSaving] = useState(false);

    const handlePreferenceChange = (key, value) => {
        setPreferences(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const handleSavePreferences = async () => {
        setSaving(true);
        try {
            await updateUserPreferences(preferences);
        } catch (error) {
            console.error('Error saving preferences:', error);
        } finally {
            setSaving(false);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Profile</h1>
                <p className="text-gray-600">Manage your account settings and preferences.</p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Profile Information */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="lg:col-span-2"
                >
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h2 className="text-lg font-semibold text-gray-800">Profile Information</h2>
                        </div>
                        
                        <div className="p-6 space-y-6">
                            {/* Profile Picture */}
                            <div className="flex items-center space-x-4">
                                {user?.picture ? (
                                    <img
                                        src={user.picture}
                                        alt={user.name}
                                        className="w-16 h-16 rounded-full"
                                    />
                                ) : (
                                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                                        <span className="text-white text-xl font-medium">
                                            {user?.name?.charAt(0) || 'U'}
                                        </span>
                                    </div>
                                )}
                                <div>
                                    <h3 className="text-lg font-medium text-gray-900">{user?.name}</h3>
                                    <p className="text-sm text-gray-500">Member since {formatDate(user?.createdAt)}</p>
                                </div>
                            </div>

                            {/* User Details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 flex items-center">
                                        <User className="w-4 h-4 mr-2" />
                                        Name
                                    </label>
                                    <p className="text-gray-900">{user?.name}</p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 flex items-center">
                                        <Mail className="w-4 h-4 mr-2" />
                                        Email
                                    </label>
                                    <p className="text-gray-900">{user?.email}</p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 flex items-center">
                                        <Calendar className="w-4 h-4 mr-2" />
                                        Last Login
                                    </label>
                                    <p className="text-gray-900">
                                        {user?.lastLogin ? formatDate(user.lastLogin) : 'Never'}
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">
                                        Provider
                                    </label>
                                    <p className="text-gray-900 capitalize">{user?.provider}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Preferences */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                                <Settings className="w-5 h-5 mr-2" />
                                Preferences
                            </h2>
                        </div>
                        
                        <div className="p-6 space-y-6">
                            {/* Theme Preference */}
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-gray-700 flex items-center">
                                    <Sun className="w-4 h-4 mr-2" />
                                    Theme
                                </label>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => handlePreferenceChange('theme', 'light')}
                                        className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                                            preferences.theme === 'light'
                                                ? 'bg-blue-50 border-blue-200 text-blue-700'
                                                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                        }`}
                                    >
                                        Light
                                    </button>
                                    <button
                                        onClick={() => handlePreferenceChange('theme', 'dark')}
                                        className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                                            preferences.theme === 'dark'
                                                ? 'bg-blue-50 border-blue-200 text-blue-700'
                                                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                        }`}
                                    >
                                        Dark
                                    </button>
                                </div>
                            </div>

                            {/* Notifications */}
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-gray-700 flex items-center">
                                    {preferences.notifications ? (
                                        <Bell className="w-4 h-4 mr-2" />
                                    ) : (
                                        <BellOff className="w-4 h-4 mr-2" />
                                    )}
                                    Notifications
                                </label>
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={preferences.notifications}
                                        onChange={(e) => handlePreferenceChange('notifications', e.target.checked)}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="ml-2 text-sm text-gray-700">
                                        Receive email notifications
                                    </span>
                                </label>
                            </div>

                            {/* Save Button */}
                            <button
                                onClick={handleSavePreferences}
                                disabled={saving}
                                className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {saving ? (
                                    <LoadingSpinner size="sm" />
                                ) : (
                                    <Save className="w-4 h-4 mr-2" />
                                )}
                                {saving ? 'Saving...' : 'Save Preferences'}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default ProfilePage;