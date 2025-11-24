import React from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Heart,
  Home,
  Award,
  AlertCircle,
  CheckCircle,
  Info,
  Target
} from 'lucide-react';

const MatchAnalysisPanel = ({ matchData, pet }) => {
  if (!matchData) return null;

  const { matchScore, confidence, breakdown, analysis, recommendations, matchLevel } = matchData;

  // 取得配對等級的顏色
  const getLevelColor = (level) => {
    const colors = {
      green: 'bg-green-500',
      blue: 'bg-blue-500',
      teal: 'bg-teal-500',
      yellow: 'bg-yellow-500',
      red: 'bg-red-500'
    };
    return colors[level] || 'bg-gray-500';
  };

  // 取得分數顏色類別
  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  // 取得分數背景顏色
  const getScoreBgColor = (score) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-blue-100';
    if (score >= 40) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  return (
    <div className="space-y-6">
      {/* 主要配對分數 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8 text-center"
      >
        <div className="flex items-center justify-center mb-4">
          <div className={`${getLevelColor(matchLevel.color)} w-16 h-16 rounded-full flex items-center justify-center`}>
            <Heart className="w-8 h-8 text-white" fill="currentColor" />
          </div>
        </div>

        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          {matchLevel.label}
        </h2>

        <div className="flex items-center justify-center gap-2 mb-4">
          <span className={`text-6xl font-bold ${getScoreColor(matchScore)}`}>
            {Math.round(matchScore)}
          </span>
          <span className="text-2xl text-gray-600">/100</span>
        </div>

        <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
          <Target className="w-4 h-4" />
          <span>信心指數: {Math.round(confidence)}%</span>
        </div>

        <p className="mt-4 text-gray-700">
          您與 <span className="font-semibold">{pet?.name}</span> 的配對分數
        </p>
      </motion.div>

      {/* 詳細分數拆解 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl shadow-sm p-6"
      >
        <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-purple-600" />
          詳細分析
        </h3>

        <div className="space-y-4">
          {/* 相容性分數 */}
          <ScoreBar
            label="基礎相容性"
            score={breakdown.compatibility}
            icon={<Heart className="w-5 h-5" />}
            description="物種、體型、年齡、性格匹配度"
          />

          {/* 生活方式分數 */}
          <ScoreBar
            label="生活方式"
            score={breakdown.lifestyle}
            icon={<Home className="w-5 h-5" />}
            description="活動量、時間、住宅類型匹配度"
          />

          {/* 經驗分數 */}
          <ScoreBar
            label="經驗配對"
            score={breakdown.experience}
            icon={<Award className="w-5 h-5" />}
            description="您的養寵物經驗與照顧難度"
          />

          {/* 環境分數 */}
          <ScoreBar
            label="環境適配"
            score={breakdown.environment}
            icon={<CheckCircle className="w-5 h-5" />}
            description="家庭環境與寵物需求的匹配"
          />
        </div>
      </motion.div>

      {/* 優勢與亮點 */}
      {analysis.strengths && analysis.strengths.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-green-50 rounded-xl p-6"
        >
          <h3 className="text-lg font-semibold text-green-900 mb-3 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            配對優勢
          </h3>
          <ul className="space-y-2">
            {analysis.strengths.map((strength, index) => (
              <li key={index} className="flex items-start gap-2 text-green-800">
                <span className="text-green-600 mt-0.5"></span>
                <span>{strength}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* 特色亮點 */}
      {analysis.highlights && analysis.highlights.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-blue-50 rounded-xl p-6"
        >
          <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <Info className="w-5 h-5" />
            特色亮點
          </h3>
          <ul className="space-y-2">
            {analysis.highlights.map((highlight, index) => (
              <li key={index} className="flex items-start gap-2 text-blue-800">
                <span className="text-blue-600 mt-0.5"></span>
                <span>{highlight}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* 需要考量的部分 */}
      {analysis.concerns && analysis.concerns.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-yellow-50 rounded-xl p-6"
        >
          <h3 className="text-lg font-semibold text-yellow-900 mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            需要考量
          </h3>
          <ul className="space-y-2">
            {analysis.concerns.map((concern, index) => (
              <li key={index} className="flex items-start gap-2 text-yellow-800">
                <span className="text-yellow-600 mt-0.5">!</span>
                <span>{concern}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* 智慧建議 */}
      {recommendations && recommendations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-white rounded-xl shadow-sm p-6"
        >
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            建議事項
          </h3>
          <div className="space-y-3">
            {recommendations.map((rec, index) => (
              <RecommendationCard key={index} recommendation={rec} />
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

// 分數條組件
const ScoreBar = ({ label, score, icon, description }) => {
  const getScoreColor = (score) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-blue-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="text-purple-600">{icon}</div>
          <span className="font-medium text-gray-900">{label}</span>
        </div>
        <span className="font-semibold text-gray-900">{Math.round(score)}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className={`h-full ${getScoreColor(score)} rounded-full`}
        />
      </div>
      {description && (
        <p className="text-xs text-gray-600 mt-1">{description}</p>
      )}
    </div>
  );
};

// 建議卡片組件
const RecommendationCard = ({ recommendation }) => {
  const getTypeColor = (type) => {
    const colors = {
      positive: 'border-green-200 bg-green-50',
      neutral: 'border-blue-200 bg-blue-50',
      caution: 'border-yellow-200 bg-yellow-50',
      tip: 'border-purple-200 bg-purple-50'
    };
    return colors[type] || 'border-gray-200 bg-gray-50';
  };

  const getTypeIcon = (type) => {
    const icons = {
      positive: '',
      neutral: 'ℹ',
      caution: '',
      tip: ''
    };
    return icons[type] || '';
  };

  return (
    <div className={`border-2 rounded-lg p-4 ${getTypeColor(recommendation.type)}`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl">{getTypeIcon(recommendation.type)}</span>
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 mb-1">
            {recommendation.title}
          </h4>
          <p className="text-sm text-gray-700">
            {recommendation.message}
          </p>
        </div>
      </div>
    </div>
  );
};

export default MatchAnalysisPanel;
