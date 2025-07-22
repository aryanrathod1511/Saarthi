import React from 'react';
import { motion } from 'framer-motion';

const DashboardPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-primary-50/30 to-secondary-50/30 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl font-bold text-neutral-900 mb-2">
            Dashboard
          </h1>
          <p className="text-xl text-neutral-600">
            Track your interview performance and progress
          </p>
        </motion.div>
        
        <div className="card max-w-2xl mx-auto text-center p-8">
          <h2 className="text-2xl font-bold text-neutral-900 mb-4">
            Dashboard Coming Soon
          </h2>
          <p className="text-neutral-600">
            Performance analytics, interview history, and achievement tracking will be implemented here.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
