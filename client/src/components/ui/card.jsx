// src/components/ui/Card.jsx
import React from 'react';
import './Card.css';

function Card({
  children,
  title,
  subtitle,
  header,
  footer,
  image,
  imageAlt,
  hoverable = false,
  elevated = true,
  padding = 'md',
  className = '',
  ...props
}) {
  return (
    <div
      className={`
        card 
        ${hoverable ? 'card-hoverable' : ''}
        ${elevated ? 'card-elevated' : ''}
        card-padding-${padding}
        ${className}
      `}
      {...props}
    >
      {/* صورة البطاقة */}
      {image && (
        <div className="card-image">
          <img src={image} alt={imageAlt || title || 'Card image'} />
        </div>
      )}

      {/* هيدر مخصص أو افتراضي */}
      {header ? (
        <div className="card-header-custom">{header}</div>
      ) : (title || subtitle) && (
        <div className="card-header">
          {title && <h3 className="card-title">{title}</h3>}
          {subtitle && <p className="card-subtitle">{subtitle}</p>}
        </div>
      )}

      {/* محتوى البطاقة */}
      <div className="card-content">{children}</div>

      {/* فوتر البطاقة */}
      {footer && <div className="card-footer">{footer}</div>}
    </div>
  );
}

// مكونات فرعية للبطاقة
Card.Header = function CardHeader({ children, className }) {
  return <div className={`card-header ${className}`}>{children}</div>;
};

Card.Content = function CardContent({ children, className }) {
  return <div className={`card-content ${className}`}>{children}</div>;
};

Card.Footer = function CardFooter({ children, className }) {
  return <div className={`card-footer ${className}`}>{children}</div>;
};

Card.Image = function CardImage({ src, alt, className }) {
  return (
    <div className={`card-image ${className}`}>
      <img src={src} alt={alt} />
    </div>
  );
};

export default Card;