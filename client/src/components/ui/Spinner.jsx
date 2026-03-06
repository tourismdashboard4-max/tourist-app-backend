// src/components/ui/Spinner.jsx
import React from 'react';
import './Spinner.css';

function Spinner({
  size = 'md',
  color = 'primary',
  label,
  fullScreen = false,
  className = ''
}) {
  const sizeClasses = {
    xs: 'w-4 h-4 border-2',
    sm: 'w-6 h-6 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
    xl: 'w-16 h-16 border-4'
  };

  const colorClasses = {
    primary: 'border-blue-600 border-t-transparent',
    secondary: 'border-gray-600 border-t-transparent',
    white: 'border-white border-t-transparent',
    success: 'border-green-600 border-t-transparent',
    danger: 'border-red-600 border-t-transparent',
    warning: 'border-yellow-600 border-t-transparent'
  };

  const spinner = (
    <div className={`spinner ${sizeClasses[size]} ${colorClasses[color]} ${className}`} />
  );

  if (fullScreen) {
    return (
      <div className="spinner-overlay">
        <div className="spinner-fullscreen">
          {spinner}
          {label && <p className="spinner-label">{label}</p>}
        </div>
      </div>
    );
  }

  if (label) {
    return (
      <div className="spinner-with-label">
        {spinner}
        <span className="spinner-text">{label}</span>
      </div>
    );
  }

  return spinner;
}

export default Spinner;