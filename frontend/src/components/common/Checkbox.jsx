import React, { forwardRef } from 'react';

const Checkbox = forwardRef(({ 
  label, 
  error, 
  helperText,
  disabled = false,
  size = 'md',
  variant = 'default',
  className = '', 
  ...props 
}, ref) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const variantClasses = {
    default: 'text-blue-600 border-gray-300 focus:ring-blue-500',
    error: 'text-red-600 border-red-500 focus:ring-red-500',
    success: 'text-green-600 border-green-500 focus:ring-green-500'
  };

  const getVariantClass = () => {
    if (error) return variantClasses.error;
    if (variant === 'success') return variantClasses.success;
    return variantClasses.default;
  };

  const getDisabledClass = () => {
    return disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';
  };

  return (
    <div className={`flex items-start ${className}`}>
      <div className="flex items-center h-5">
        <input
          ref={ref}
          type="checkbox"
          className={`
            rounded border transition-colors duration-200
            focus:ring-2 focus:ring-offset-0
            ${sizeClasses[size]}
            ${getVariantClass()}
            ${getDisabledClass()}
          `}
          disabled={disabled}
          {...props}
        />
      </div>
      <div className="ml-3 text-sm">
        {label && (
          <label className={`font-medium text-gray-700 ${getDisabledClass()}`}>
            {label}
          </label>
        )}
        {error && (
          <p className="mt-1 text-red-600 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-gray-500">{helperText}</p>
        )}
      </div>
    </div>
  );
});

Checkbox.displayName = 'Checkbox';

export default Checkbox; 