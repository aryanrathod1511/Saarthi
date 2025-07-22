import React, { forwardRef } from 'react';

const TextArea = forwardRef(({ 
  label, 
  error, 
  helperText,
  required = false,
  disabled = false,
  size = 'md',
  variant = 'default',
  rows = 4,
  maxLength,
  showCharacterCount = false,
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

  const currentLength = props.value?.length || 0;

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <textarea
        ref={ref}
        rows={rows}
        className={`
          w-full border rounded-lg transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-offset-0
          resize-vertical
          ${sizeClasses[size]}
          ${getVariantClass()}
          ${getDisabledClass()}
        `}
        disabled={disabled}
        {...props}
      />
      <div className="flex justify-between items-center mt-1">
        {error && (
          <p className="text-sm text-red-600 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
        {helperText && !error && (
          <p className="text-sm text-gray-500">{helperText}</p>
        )}
        {showCharacterCount && maxLength && (
          <p className={`text-sm ml-auto ${currentLength > maxLength ? 'text-red-600' : 'text-gray-500'}`}>
            {currentLength}/{maxLength}
          </p>
        )}
      </div>
    </div>
  );
});

TextArea.displayName = 'TextArea';

export default TextArea; 