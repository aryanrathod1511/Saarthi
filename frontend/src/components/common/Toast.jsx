import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

// Individual Toast Component
const Toast = ({ 
  message, 
  type = 'info', 
  duration = 4000, 
  onClose, 
  position = 'top-right',
  className = '' 
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for exit animation
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const typeConfig = {
    success: {
      icon: CheckCircle,
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-800',
      iconColor: 'text-green-600'
    },
    error: {
      icon: XCircle,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-800',
      iconColor: 'text-red-600'
    },
    warning: {
      icon: AlertCircle,
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      textColor: 'text-yellow-800',
      iconColor: 'text-yellow-600'
    },
    info: {
      icon: Info,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-800',
      iconColor: 'text-blue-600'
    }
  };

  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: "spring", duration: 0.3 }}
          className={`${className}`}
        >
          <div className={`
            flex items-center p-4 rounded-lg border shadow-lg max-w-sm
            ${config.bgColor} ${config.borderColor}
          `}>
            <Icon className={`w-5 h-5 mr-3 ${config.iconColor}`} />
            <p className={`flex-1 text-sm font-medium ${config.textColor}`}>
              {message}
            </p>
            <button
              onClick={handleClose}
              className={`ml-3 p-1 rounded-full hover:bg-opacity-20 ${config.bgColor} ${config.textColor}`}
              aria-label="Close toast"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Toast Container Component
const ToastContainer = ({ position = 'top-right' }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ message, type = 'info', duration = 4000 }) => {
    const id = Date.now() + Math.random();
    const newToast = { id, message, type, duration };
    
    setToasts(prev => [...prev, newToast]);
    
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const success = useCallback((message, duration) => {
    return addToast({ message, type: 'success', duration });
  }, [addToast]);

  const error = useCallback((message, duration) => {
    return addToast({ message, type: 'error', duration });
  }, [addToast]);

  const info = useCallback((message, duration) => {
    return addToast({ message, type: 'info', duration });
  }, [addToast]);

  const warning = useCallback((message, duration) => {
    return addToast({ message, type: 'warning', duration });
  }, [addToast]);

  // Expose toast methods globally
  useEffect(() => {
    window.toast = {
      success,
      error,
      info,
      warning,
      addToast,
      removeToast
    };

    return () => {
      delete window.toast;
    };
  }, [success, error, info, warning, addToast, removeToast]);

  const positionClasses = {
    'top-right': 'top-20 right-4',
    'top-left': 'top-24 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-24 left-1/2 transform -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2'
  };

  return (
    <div className={`fixed z-60 ${positionClasses[position]} space-y-2`}>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => removeToast(toast.id)}
          className="w-80"
        />
      ))}
    </div>
  );
};

export { Toast, ToastContainer };
export default ToastContainer; 