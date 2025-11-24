import React from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import { Heart, MapPin, Calendar, RefreshCw, Settings } from 'lucide-react';
import { Skeleton } from './ui';

const RecommendationSection = ({ recommendations = [], isLoading, hasPreferences, onRefresh, isRefreshing }) => {
  if (isLoading) {
    return (
      <section className="py-20 bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Skeleton className="h-10 w-64 mx-auto mb-4" />
            <Skeleton className="h-6 w-96 mx-auto" />
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-lg">
                <Skeleton className="h-48 w-full" />
                <div className="p-6 space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 bg-gradient-to-br from-purple-50 to-pink-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-4 mb-4">
            <h2 className="text-4xl font-bold text-gray-900">為你推薦</h2>
            <button onClick={onRefresh} disabled={isRefreshing} className={isRefreshing ? 'p-2 rounded-full bg-white shadow-md animate-spin' : 'p-2 rounded-full bg-white shadow-md hover:shadow-lg hover:rotate-180 transition-all'} title="重新整理推薦">
              <RefreshCw className="w-5 h-5 text-purple-600" />
            </button>
          </div>
          <p className="text-xl text-gray-600">根據你的偏好，為你精選最適合的毛孩</p>
        </div>

        {!hasPreferences && (
          <div className="max-w-2xl mx-auto mb-8 p-6 bg-white rounded-2xl shadow-lg border-2 border-dashed border-purple-300">
            <div className="text-center">
              <Settings className="w-12 h-12 text-purple-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">尚未設定偏好</h3>
              <p className="text-gray-600 mb-4">設定你的認養偏好，我們將為你提供更精準的推薦</p>
              <Link to="/profile?tab=preferences" className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all">
                <Settings className="w-5 h-5 mr-2" />設定偏好
              </Link>
            </div>
          </div>
        )}

        {recommendations.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {recommendations.map((pet, index) => (
              <motion.div key={pet._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
                <Link to={`/pets/${pet._id}`} className="block bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all">
                  <div className="relative overflow-hidden h-48">
                    <img src={pet.primaryPhoto?.url || '/placeholder-pet.jpg'} alt={pet.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                    {pet.recommendationReasons?.[0] && (
                      <div className="absolute top-3 left-3">
                        <span className="px-3 py-1 bg-green-500 text-white text-xs font-medium rounded-full shadow-lg">{pet.recommendationReasons[0]}</span>
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-semibold mb-2">{pet.name}</h3>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>{pet.breed}  {pet.ageDescription}</p>
                      <div className="flex items-center"><MapPin className="w-4 h-4 mr-1" />{pet.shelterInfo?.location}</div>
                      <div className="flex items-center"><Calendar className="w-4 h-4 mr-1" />入所 {pet.daysInShelter || 0} 天</div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12"><p className="text-gray-600">目前沒有符合條件的推薦寵物</p></div>
        )}
      </div>
    </section>
  );
};

RecommendationSection.propTypes = {
  recommendations: PropTypes.array,
  isLoading: PropTypes.bool,
  hasPreferences: PropTypes.bool,
  onRefresh: PropTypes.func,
  isRefreshing: PropTypes.bool
};

export default RecommendationSection;
