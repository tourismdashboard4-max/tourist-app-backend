// src/components/ui/Button.jsx
import React from 'react';
import './Button.css';

function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  loading = false,
  startIcon,
  endIcon,
  onClick,
  type = 'button',
  className = '',
  ...props
}) {
  const handleClick = (e) => {
    if (!disabled && !loading && onClick) {
      onClick(e);
    }
  };

  return (
    <button
      type={type}
      className={`
        btn 
        btn-${variant} 
        btn-${size} 
        ${fullWidth ? 'btn-full-width' : ''}
        ${disabled ? 'btn-disabled' : ''}
        ${loading ? 'btn-loading' : ''}
        ${className}
      `}
      onClick={handleClick}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading && (
        <span className="btn-spinner">
          <svg className="spinner-icon" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          </svg>
        </span>
      )}
      
      {!loading && startIcon && <span className="btn-icon-start">{startIcon}</span>}
      
      <span className="btn-content">{children}</span>
      
      {!loading && endIcon && <span className="btn-icon-end">{endIcon}</span>}
    </button>
  );
}

export default Button;