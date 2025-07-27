import React from 'react';
import { FcGoogle } from 'react-icons/fc';
import { motion } from 'framer-motion';

const LoginButton = ({ onLogin }) => {
    const handleGoogleLogin = () => {
        const googleAuthUrl = '/api/auth/google';
        window.location.href = googleAuthUrl;
    };

    return (
        <motion.button
            onClick={handleGoogleLogin}
            className="flex items-center justify-center gap-3 w-full max-w-sm px-6 py-3 bg-white border border-gray-300 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 text-gray-700 font-medium"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
        >
            <FcGoogle className="w-5 h-5" />
            Continue with Google
        </motion.button>
    );
};

export default LoginButton;

