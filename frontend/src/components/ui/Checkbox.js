import React from 'react';
import PropTypes from 'prop-types';

const Checkbox = ({ label, error, helperText, className = '', checked, onChange, ...props }) => {
  const handleChange = (e) => {
    if (onChange) {
      onChange(e.target.checked);
    }
  };

  return (
    <div className={className}>
      <div className="flex items-start">
        <div className="flex items-center h-5">
          <input
            type="checkbox"
            className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500 focus:ring-2 transition-colors cursor-pointer"
            checked={checked}
            onChange={handleChange}
            {...props}
          />
        </div>
        {label && <div className="ml-3 text-sm">
          <label className="font-medium text-gray-700 cursor-pointer">{label}</label>
        </div>}
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      {helperText && !error && <p className="mt-1 text-sm text-gray-500">{helperText}</p>}
    </div>
  );
};

Checkbox.propTypes = {
  label: PropTypes.string,
  error: PropTypes.string,
  helperText: PropTypes.string,
  className: PropTypes.string,
  checked: PropTypes.bool,
  onChange: PropTypes.func,
};

export default Checkbox;
