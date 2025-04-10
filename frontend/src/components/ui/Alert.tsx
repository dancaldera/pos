import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

type AlertType = 'success' | 'error' | 'warning' | 'info';

interface AlertProps {
  type: AlertType;
  message: string;
  onClose?: () => void;
}

const Alert: React.FC<AlertProps> = ({ type, message, onClose }) => {
  const bgColors = {
    success: 'bg-green-100 border-green-500 text-green-700',
    error: 'bg-red-100 border-red-500 text-red-700',
    warning: 'bg-yellow-100 border-yellow-500 text-yellow-700',
    info: 'bg-blue-100 border-blue-500 text-blue-700',
  };

  return (
    <div className={`${bgColors[type]} px-4 py-3 rounded relative border-l-4 mb-4`} role="alert">
      <span className="block sm:inline">{message}</span>
      {onClose && (
        <span className="absolute top-0 bottom-0 right-0 px-4 py-3">
          <XMarkIcon
            className="h-5 w-5 cursor-pointer"
            onClick={onClose}
            role="button"
            aria-label="Close"
          />
        </span>
      )}
    </div>
  );
};

export default Alert;
