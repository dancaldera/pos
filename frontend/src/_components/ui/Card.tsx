import React from 'react';

interface CardProps {
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  titleClassName?: string;
  footerClassName?: string;
}

const Card: React.FC<CardProps> = ({
  title,
  children,
  footer,
  className = '',
  bodyClassName = '',
  titleClassName = '',
  footerClassName = '',
}) => {
  return (
    <div className={`bg-white dark:bg-zinc-800 rounded-lg h-full shadow-md overflow-hidden ${className}`}>
      {title && (
        <div className={`px-6 py-4 bg-gray-50 dark:bg-zinc-700 border-b border-gray-200 ${titleClassName}`}>
          <h3 className="text-lg font-medium text-gray-900 dark:text-zinc-100">{title}</h3>
        </div>
      )}
      <div className={`px-6 py-4 ${bodyClassName}`}>{children}</div>
      {footer && (
        <div className={`px-6 py-3 bg-gray-50 dark:bg-zinc-700 border-t border-gray-200 ${footerClassName}`}>
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;
