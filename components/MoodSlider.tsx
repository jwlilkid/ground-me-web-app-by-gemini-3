import React from 'react';
import { CloudRain, Sun } from 'lucide-react';

interface MoodSliderProps {
  value: number; // 0 to 100
  onChange: (value: number) => void;
  disabled?: boolean;
}

export const MoodSlider: React.FC<MoodSliderProps> = ({ value, onChange, disabled = false }) => {
  // Map 0-100 to displayed labels 5-0-5
  // 0 -> 5
  // 50 -> 0
  // 100 -> 5
  
  const getDisplayValue = (val: number) => {
    const dist = Math.abs(val - 50);
    return (dist / 10).toFixed(1).replace('.0', ''); // e.g. "5", "4.5", "0"
  };

  return (
    <div className="w-full bg-white/60 backdrop-blur-sm p-6 rounded-3xl shadow-sm border border-white/50">
      <div className="flex justify-between items-end mb-6 text-charcoal">
        <div className="flex flex-col items-start gap-1 text-cool-blue-400 max-w-[80px]">
          <CloudRain size={24} />
          <span className="text-xs font-bold leading-tight">I'm not feeling good</span>
        </div>
        
        <div className="text-3xl font-bold text-gray-400 pb-1 tabular-nums">
          {getDisplayValue(value)}
        </div>
        
        <div className="flex flex-col items-end gap-1 text-terracotta max-w-[80px] text-right">
          <Sun size={24} />
          <span className="text-xs font-bold leading-tight">I'm feeling good</span>
        </div>
      </div>
      
      <div className="relative h-8 flex items-center">
        {/* Gradient Track */}
        <div 
          className="absolute inset-0 h-4 rounded-full w-full"
          style={{
            background: `linear-gradient(90deg, #A5B4C9 0%, #F5F2EB 50%, #D4A589 100%)`
          }}
        />
        
        {/* Center Marker */}
        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/50 z-0 transform -translate-x-1/2 h-4 my-auto rounded-full" />

        <input
          type="range"
          min="0"
          max="100"
          step="0.1" // High resolution for "butter smooth" feel
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          disabled={disabled}
          className={`w-full absolute z-10 opacity-0 cursor-pointer h-full ${disabled ? 'cursor-not-allowed' : ''}`}
        />
        
        {/* Custom Thumb Representation (Visual only, follows actual value) */}
        <div 
          className="absolute h-8 w-8 bg-white border-2 shadow-md rounded-full pointer-events-none transition-transform duration-75 ease-out flex items-center justify-center z-20"
          style={{ 
            left: `calc(${value}% - 16px)`,
            borderColor: value < 50 ? '#A5B4C9' : (value > 50 ? '#D4A589' : '#A8B5A0')
          }}
        >
          <div className={`w-2 h-2 rounded-full ${value < 50 ? 'bg-cool-blue-400' : (value > 50 ? 'bg-terracotta' : 'bg-sage-400')}`} />
        </div>
      </div>

      <div className="flex justify-between mt-4 text-xs text-gray-400 font-medium px-1 select-none">
        <span>5</span>
        <span>0</span>
        <span>5</span>
      </div>
    </div>
  );
};