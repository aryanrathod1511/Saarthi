import React, { useState, useCallback, useEffect } from 'react';
import Toast from './Toast';

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
    'top-right': 'top-24 right-4',
    'top-left': 'top-24 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-24 left-1/2 transform -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2'
  };

  return (
    <div className={`fixed z-50 ${positionClasses[position]} space-y-2`}>
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

export default ToastContainer; 