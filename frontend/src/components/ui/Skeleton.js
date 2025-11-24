import React from 'react';
import PropTypes from 'prop-types';

const Skeleton = ({ variant = 'text', width, height, className = '' }) => {
  const variantClasses = {
    text: 'h-4 rounded',
    circle: 'rounded-full',
    rect: 'rounded',
  };

  const style = {
    width: width || (variant === 'circle' ? '40px' : '100%'),
    height: height || (variant === 'text' ? '1rem' : variant === 'circle' ? '40px' : '100px'),
  };

  return (
    <div
      className={`bg-gray-200 animate-pulse ${variantClasses[variant]} ${className}`}
      style={style}
    />
  );
};

Skeleton.propTypes = {
  variant: PropTypes.oneOf(['text', 'circle', 'rect']),
  width: PropTypes.string,
  height: PropTypes.string,
  className: PropTypes.string,
};

export default Skeleton;
