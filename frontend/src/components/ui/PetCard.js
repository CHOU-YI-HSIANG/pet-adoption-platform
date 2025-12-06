import React from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import Badge from './Badge';

const PetCard = ({ pet, className = '' }) => {
  const navigate = useNavigate();

  const statusColors = {
    available: 'success',
    pending: 'warning',
    adopted: 'default',
  };

  const statusLabels = {
    available: '可領養',
    pending: '審核中',
    adopted: '已領養',
  };

  return (
    <div
      onClick={() => navigate(`/pets/${pet._id}`)}
      className={`bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow ${className}`}
    >
      <div className="aspect-w-16 aspect-h-12 bg-gray-200">
        <img
          src={pet.primaryPhoto?.url || pet.images?.[0] || '/placeholder-pet.png'}
          alt={pet.name}
          className="w-full h-48 object-cover"
        />
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-800">{pet.name}</h3>
          <Badge variant={statusColors[pet.status]}>{statusLabels[pet.status]}</Badge>
        </div>
        <div className="text-sm text-gray-600 space-y-1">
          <p>品種: {pet.breed}</p>
          <p>年齡: {pet.age}</p>
          <p>性別: {pet.gender === 'male' ? '公' : '母'}</p>
        </div>
        {pet.description && (
          <p className="mt-3 text-sm text-gray-500 line-clamp-2">{pet.description}</p>
        )}
      </div>
    </div>
  );
};

PetCard.propTypes = {
  pet: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    breed: PropTypes.string.isRequired,
    age: PropTypes.string.isRequired,
    gender: PropTypes.oneOf(['male', 'female']).isRequired,
    status: PropTypes.oneOf(['available', 'pending', 'adopted']).isRequired,
    images: PropTypes.arrayOf(PropTypes.string),
    description: PropTypes.string,
  }).isRequired,
  className: PropTypes.string,
};

export default PetCard;
