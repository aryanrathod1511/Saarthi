import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import LoginButton from '../components/auth/LoginButton.jsx';

const LoginPage = () => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-50 via-primary-50/30 to-secondary-50/30 px-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full"
            >
                <div className="text-center mb-8">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                        className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4"
                    >
                        <span className="text-white text-2xl font-bold">AI</span>
                    </motion.div>
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome Back</h1>
                    <p className="text-gray-600">Sign in to continue your interview preparation</p>
                </div>

                <div className="space-y-6">
                    <LoginButton />
                    
                    <div className="text-center">
                        <p className="text-sm text-gray-500">
                            By continuing, you agree to our{' '}
                            <Link to="/terms" className="text-blue-600 hover:underline">
                                Terms of Service
                            </Link>{' '}
                            and{' '}
                            <Link to="/privacy" className="text-blue-600 hover:underline">
                                Privacy Policy
                            </Link>
                        </p>
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-200">
                    <p className="text-center text-sm text-gray-600">
                        Don't have an account?{' '}
                        <Link to="/register" className="text-blue-600 hover:underline font-medium">
                            Sign up
                        </Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default LoginPage; 