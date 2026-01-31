import React from 'react';

export const formatPhone = (value: string) => {
    return value
        .replace(/\D/g, '')
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2')
        .replace(/(-\d{4})\d+?$/, '$1');
};

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className = "", ...props }) => (
  <div className={`bg-white rounded-xl border border-slate-100 shadow-sm ${className}`} {...props}>
    {children}
  </div>
);

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' | 'danger', isLoading?: boolean }> = ({ 
  children, 
  variant = 'primary', 
  className = "", 
  isLoading = false,
  ...props 
}) => {
  const baseStyle = "px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-primary-600 text-white hover:bg-primary-700 shadow-lg shadow-primary-500/20",
    secondary: "bg-slate-800 text-white hover:bg-slate-900",
    outline: "border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 border border-red-100"
  };

  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} disabled={isLoading || props.disabled} {...props}>
      {isLoading ? (
        <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : children}
    </button>
  );
};

export const Input = ({ 
  label, 
  className = "", 
  ...props 
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) => (
  <div className={`space-y-1 ${className}`}>
    {label && <label className="text-sm font-medium text-slate-700">{label}</label>}
    <input 
      className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-slate-800 placeholder-slate-400"
      {...props} 
    />
  </div>
);

export const PhoneInput = ({ 
  label, 
  value, 
  onChange, 
  className = "", 
  ...props 
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> & { label?: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) => {
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        const formatted = formatPhone(raw);
        e.target.value = formatted;
        onChange(e);
    };

    return (
        <Input 
            label={label}
            value={value}
            onChange={handleChange}
            maxLength={15}
            placeholder="(00) 00000-0000"
            className={className}
            {...props}
        />
    );
};

export const Badge: React.FC<{ children?: React.ReactNode, color?: 'blue' | 'green' | 'yellow' | 'red' | 'gray', className?: string }> = ({ children, color = 'blue', className = "" }) => {
    const colors = {
        blue: 'bg-blue-50 text-blue-700 border-blue-100',
        green: 'bg-green-50 text-green-700 border-green-100',
        yellow: 'bg-amber-50 text-amber-700 border-amber-100',
        red: 'bg-red-50 text-red-700 border-red-100',
        gray: 'bg-slate-50 text-slate-600 border-slate-100',
    }
    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colors[color]} ${className}`}>
            {children}
        </span>
    )
}