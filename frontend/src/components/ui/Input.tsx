import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
  containerClassName?: string;
  labelClassName?: string;
  inputClassName?: string;
  errorClassName?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>((
  {
    label,
    error,
    fullWidth = false,
    containerClassName = '',
    labelClassName = '',
    inputClassName = '',
    errorClassName = '',
    id,
    ...rest
  },
  ref
) => {
  const inputId = id || `input-${Math.random().toString(36).substring(2, 9)}`;
  const widthClass = fullWidth ? 'w-full' : '';
  const errorClass = error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500';

  return (
    <div className={`mb-4 ${widthClass} ${containerClassName}`}>
      {label && (
        <label htmlFor={inputId} className={`block text-sm font-medium text-gray-700 mb-1 ${labelClassName}`}>
          {label}
        </label>
      )}
      <input
        id={inputId}
        ref={ref}
        className={`appearance-none block px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 sm:text-sm ${widthClass} ${errorClass} ${inputClassName}`}
        {...rest}
      />
      {error && (
        <p className={`mt-1 text-sm text-red-600 ${errorClassName}`}>{error}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
