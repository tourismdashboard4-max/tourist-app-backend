// src/components/ui/Input.jsx
import React from 'react';
import './Input.css';

function Input({
  label,
  type = 'text',
  name,
  value,
  onChange,
  placeholder,
  error,
  disabled = false,
  required = false,
  icon,
  className = '',
  ...props
}) {
  return (
    <div className={`input-container ${className}`}>
      {label && (
        <label htmlFor={name} className="input-label">
          {label}
          {required && <span className="required-star">*</span>}
        </label>
      )}
      
      <div className="input-wrapper">
        {icon && <span className="input-icon">{icon}</span>}
        
        <input
          id={name}
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`input-field ${error ? 'input-error' : ''} ${icon ? 'with-icon' : ''}`}
          {...props}
        />
      </div>
      
      {error && <p className="input-error-message">{error}</p>}
      
      {!error && props.maxLength && (
        <div className="char-counter">
          {value?.length || 0} / {props.maxLength}
        </div>
      )}
    </div>
  );
}

export default Input;