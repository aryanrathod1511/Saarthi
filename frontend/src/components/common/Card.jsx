import React from 'react';
import { motion } from 'framer-motion';

const Card = ({ 
  children, 
  className = '', 
  padding = 'md',
  shadow = 'lg',
  hover = false,
  ...props 
}) => {
  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };
  
  const shadowClasses = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-xl'
  };

  const baseClasses = `bg-white rounded-2xl border border-gray-100 ${paddingClasses[padding]} ${shadowClasses[shadow]}`;
  const hoverClasses = hover ? 'hover:shadow-2xl transition-shadow duration-300' : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${baseClasses} ${hoverClasses} ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export default Card; 