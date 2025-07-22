import React, { forwardRef } from 'react';

const Input = forwardRef(({ 
  label, 
  error, 
  helperText,
  required = false,
  disabled = false,
  size = 'md',
  variant = 'default',
  icon: Icon,
  className = '', 
  ...props 
}, ref) => {
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-sm',
    lg: 'px-4 py-3 text-base'
  };

  const variantClasses = {
    default: 'border-gray-300 focus:border-blue-500 focus:ring-blue-500',
    error: 'border-red-500 focus:border-red-500 focus:ring-red-500',
    success: 'border-green-500 focus:border-green-500 focus:ring-green-500'
  };

  const getVariantClass = () => {
    if (error) return variantClasses.error;
    if (variant === 'success') return variantClasses.success;
    return variantClasses.default;
  };

  const getDisabledClass = () => {
    return disabled ? 'bg-gray-50 cursor-not-allowed opacity-60' : '';
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className="h-5 w-5 text-gray-400" />
          </div>
        )}
        <input
          ref={ref}
          className={`
            w-full border rounded-lg transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-offset-0
            ${sizeClasses[size]}
            ${getVariantClass()}
            ${getDisabledClass()}
            ${Icon ? 'pl-10' : ''}
          `}
          disabled={disabled}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600 flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input; 