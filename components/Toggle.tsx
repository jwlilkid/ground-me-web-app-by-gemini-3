import React from 'react';

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
  disabled?: boolean;
}

export const Toggle: React.FC<ToggleProps> = ({ 
  label, 
  checked, 
  onChange, 
  description,
  disabled = false
}) => {
  return (
    <div className={`flex justify-between items-center py-3 ${disabled ? 'opacity-50' : ''}`}>
      <div className="flex-1 pr-4">
        <div className="text-charcoal font-medium">{label}</div>
        {description && <div className="text-xs text-gray-400 mt-0.5">{description}</div>}
      </div>
      
      <button
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={`
          relative w-12 h-7 rounded-full transition-colors duration-200 ease-in-out focus:outline-none
          ${checked ? 'bg-sage-400' : 'bg-gray-300'}
        `}
      >
        <div
          className={`
            absolute top-1 left-1 bg-white w-5 h-5 rounded-full shadow-sm transition-transform duration-200 ease-in-out
            ${checked ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </button>
    </div>
  );
};