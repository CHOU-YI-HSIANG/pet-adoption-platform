import React from 'react';
import PropTypes from 'prop-types';

const Radio = ({ label, error, helperText, className = '', ...props }) => {
  return (
    <div className={className}>
      <div className="flex items-start">
        <div className="flex items-center h-5">
          <input
            type="radio"
            className="w-4 h-4 text-orange-500 border-gray-300 focus:ring-orange-500 focus:ring-2 transition-colors cursor-pointer"
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

Radio.propTypes = {
  label: PropTypes.string,
  error: PropTypes.string,
  helperText: PropTypes.string,
  className: PropTypes.string,
};

export default Radio;
