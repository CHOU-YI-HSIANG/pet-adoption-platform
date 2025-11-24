import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { petAPI } from '../services/api';
import { ArrowLeft, Save, AlertCircle, DollarSign, X, Plus, Heart, Users, Activity } from 'lucide-react';
import { toast } from 'react-hot-toast';

const PetEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    name: '',
    species: 'dog',
    breed: '',
    age: { value: 0, unit: 'years' },
    ageCategory: 'adult',
    gender: 'male',
    size: 'medium',
    color: '',
    description: '',
    adoptionFee: 0,
    adoptionStatus: 'available',
    featured: false,
    tags: [],
    personality: {
      traits: [],
      activityLevel: 'moderate',
      goodWith: {
        children: null,
        otherPets: null,
        strangers: null
      }
    },
    healthStatus: {
      vaccinated: false,
      spayed: false,
      microchipped: false
    },
    sponsorship: {
      enabled: false,
      externalLink: ''
    }
  });

  const [newTag, setNewTag] = useState('');

  const [errors, setErrors] = useState({});

  // 取得寵物資料
  const { data: pet, isLoading } = useQuery(
    ['pet', id],
    () => petAPI.getPet(id),
    {
      select: (response) => response.data,
      onSuccess: (data) => {
        setFormData({
          name: data.name || '',
          species: data.species || 'dog',
          breed: data.breed || '',
          age: data.age || { value: 0, unit: 'years' },
          ageCategory: data.ageCategory || 'adult',
          gender: data.gender || 'male',
          size: data.size || 'medium',
          color: data.color || '',
          description: data.description || '',
          adoptionFee: data.adoptionFee || 0,
          adoptionStatus: data.adoptionStatus || 'available',
          featured: data.featured || false,
          tags: data.tags || [],
          personality: {
            traits: data.personality?.traits || [],
            activityLevel: data.personality?.activityLevel || 'moderate',
            goodWith: {
              children: data.personality?.goodWith?.children ?? null,
              otherPets: data.personality?.goodWith?.otherPets ?? null,
              strangers: data.personality?.goodWith?.strangers ?? null
            }
          },
          healthStatus: {
            vaccinated: data.healthStatus?.vaccinated || false,
            spayed: data.healthStatus?.spayed || false,
            microchipped: data.healthStatus?.microchipped || false
          },
          sponsorship: {
            enabled: data.sponsorship?.enabled || false,
            externalLink: data.sponsorship?.externalLink || ''
          }
        });
      }
    }
  );

  // 更新寵物資料
  const updateMutation = useMutation(
    (data) => petAPI.updatePet(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['pet', id]);
        toast.success('寵物資料更新成功');
        navigate('/shelter/dashboard?tab=pets');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || '更新失敗');
      }
    }
  );

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('sponsorship.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        sponsorship: {
          ...prev.sponsorship,
          [field]: type === 'checkbox' ? checked : value
        }
      }));
    } else if (name.startsWith('personality.')) {
      const parts = name.split('.');
      if (parts.length === 3) {
        // personality.goodWith.children
        setFormData(prev => ({
          ...prev,
          personality: {
            ...prev.personality,
            goodWith: {
              ...prev.personality.goodWith,
              [parts[2]]: checked ? true : (checked === false ? false : null)
            }
          }
        }));
      } else {
        // personality.activityLevel
        setFormData(prev => ({
          ...prev,
          personality: {
            ...prev.personality,
            [parts[1]]: value
          }
        }));
      }
    } else if (name.startsWith('healthStatus.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        healthStatus: {
          ...prev.healthStatus,
          [field]: checked
        }
      }));
    } else if (name.startsWith('age.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        age: {
          ...prev.age,
          [field]: field === 'value' ? parseInt(value) : value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'number' ? parseFloat(value) : 
                type === 'checkbox' ? checked : value
      }));
    }

    // 清除錯誤
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  // 標籤管理
  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim().toLowerCase())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim().toLowerCase()]
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  // 個性特質管理
  const handleToggleTrait = (trait) => {
    setFormData(prev => ({
      ...prev,
      personality: {
        ...prev.personality,
        traits: prev.personality.traits.includes(trait)
          ? prev.personality.traits.filter(t => t !== trait)
          : [...prev.personality.traits, trait]
      }
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = '寵物名稱為必填';
    }

    if (!formData.breed.trim()) {
      newErrors.breed = '品種為必填';
    }

    if (formData.description.length < 50) {
      newErrors.description = '描述至少需要 50 個字元';
    }

    // Story 3.6: 助養 URL 驗證
    if (formData.sponsorship.enabled) {
      if (!formData.sponsorship.externalLink.trim()) {
        newErrors['sponsorship.externalLink'] = '啟用助養時必須提供連結';
      } else if (!/^https:\/\/.+/.test(formData.sponsorship.externalLink)) {
        newErrors['sponsorship.externalLink'] = '助養連結必須使用 HTTPS 協定 (例: https://example.com/donate)';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('請修正表單錯誤');
      return;
    }

    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/shelter/dashboard?tab=pets')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          返回儀表板
        </button>
        <h1 className="text-3xl font-bold text-gray-900">編輯寵物資料</h1>
        <p className="text-gray-600 mt-2">修改 {pet?.name} 的資訊</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
        
        {/* 基本資訊 */}
        <div className="border-b pb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">基本資訊</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* 寵物名稱 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                寵物名稱 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.name}
                </p>
              )}
            </div>

            {/* 物種 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                物種 <span className="text-red-500">*</span>
              </label>
              <select
                name="species"
                value={formData.species}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="dog">狗</option>
                <option value="cat">貓</option>
                <option value="rabbit">兔子</option>
                <option value="bird">鳥</option>
                <option value="hamster">倉鼠</option>
                <option value="guinea-pig">天竺鼠</option>
                <option value="other">其他</option>
              </select>
            </div>

            {/* 品種 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                品種 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="breed"
                value={formData.breed}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.breed ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.breed && (
                <p className="mt-1 text-sm text-red-600">{errors.breed}</p>
              )}
            </div>

            {/* 性別 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                性別 <span className="text-red-500">*</span>
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="male">公</option>
                <option value="female">母</option>
                <option value="unknown">未知</option>
              </select>
            </div>

            {/* 年齡 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                年齡 <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  name="age.value"
                  value={formData.age.value}
                  onChange={handleChange}
                  min="0"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <select
                  name="age.unit"
                  value={formData.age.unit}
                  onChange={handleChange}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="years">歲</option>
                  <option value="months">個月</option>
                </select>
              </div>
            </div>

            {/* 體型 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                體型 <span className="text-red-500">*</span>
              </label>
              <select
                name="size"
                value={formData.size}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="small">小型</option>
                <option value="medium">中型</option>
                <option value="large">大型</option>
                <option value="extra-large">超大型</option>
              </select>
            </div>

            {/* 毛色 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                毛色
              </label>
              <input
                type="text"
                name="color"
                value={formData.color}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="例如: 黑色、黃色、花色"
              />
            </div>

            {/* 年齡類別 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                年齡類別 <span className="text-red-500">*</span>
              </label>
              <select
                name="ageCategory"
                value={formData.ageCategory}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="young">幼年</option>
                <option value="adult">成年</option>
                <option value="senior">老年</option>
              </select>
            </div>

            {/* 認養費用 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                認養費用 (NT$)
              </label>
              <input
                type="number"
                name="adoptionFee"
                value={formData.adoptionFee}
                onChange={handleChange}
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 認養狀態 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                認養狀態 <span className="text-red-500">*</span>
              </label>
              <select
                name="adoptionStatus"
                value={formData.adoptionStatus}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="available">可認養</option>
                <option value="pending">審核中</option>
                <option value="adopted">已認養</option>
                <option value="hold">保留中</option>
                <option value="not-available">不可認養</option>
              </select>
            </div>

            {/* 特色推薦 */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="featured"
                  checked={formData.featured}
                  onChange={handleChange}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  設為特色寵物（首頁顯示）
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* 健康狀態 */}
        <div className="border-b pb-6">
          <div className="flex items-center gap-2 mb-4">
            <Heart className="w-5 h-5 text-red-500" />
            <h2 className="text-xl font-semibold text-gray-900">健康狀態</h2>
          </div>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="healthStatus.vaccinated"
                checked={formData.healthStatus.vaccinated}
                onChange={handleChange}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">已接種疫苗</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="healthStatus.spayed"
                checked={formData.healthStatus.spayed}
                onChange={handleChange}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">已結紮</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="healthStatus.microchipped"
                checked={formData.healthStatus.microchipped}
                onChange={handleChange}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">已植入晶片</span>
            </label>
          </div>
        </div>

        {/* 個性特質 */}
        <div className="border-b pb-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-purple-500" />
            <h2 className="text-xl font-semibold text-gray-900">個性特質</h2>
          </div>
          
          {/* 活動力 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              活動力 <span className="text-red-500">*</span>
            </label>
            <select
              name="personality.activityLevel"
              value={formData.personality.activityLevel}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="low">低</option>
              <option value="moderate">中等</option>
              <option value="high">高</option>
            </select>
          </div>

          {/* 個性標籤 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              個性標籤
            </label>
            <div className="flex flex-wrap gap-2">
              {['friendly', 'shy', 'playful', 'calm', 'energetic', 
                'independent', 'social', 'protective', 'gentle', 
                'curious', 'loyal', 'active', 'quiet'].map(trait => (
                <button
                  key={trait}
                  type="button"
                  onClick={() => handleToggleTrait(trait)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    formData.personality.traits.includes(trait)
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {trait === 'friendly' && '友善'}
                  {trait === 'shy' && '害羞'}
                  {trait === 'playful' && '愛玩'}
                  {trait === 'calm' && '冷靜'}
                  {trait === 'energetic' && '活潑'}
                  {trait === 'independent' && '獨立'}
                  {trait === 'social' && '社交'}
                  {trait === 'protective' && '保護性'}
                  {trait === 'gentle' && '溫和'}
                  {trait === 'curious' && '好奇'}
                  {trait === 'loyal' && '忠誠'}
                  {trait === 'active' && '活躍'}
                  {trait === 'quiet' && '安靜'}
                </button>
              ))}
            </div>
          </div>

          {/* 適合對象 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              適合對象
            </label>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-24">與小孩相處：</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      personality: {
                        ...prev.personality,
                        goodWith: { ...prev.personality.goodWith, children: true }
                      }
                    }))}
                    className={`px-3 py-1 rounded text-sm ${
                      formData.personality.goodWith.children === true
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    良好
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      personality: {
                        ...prev.personality,
                        goodWith: { ...prev.personality.goodWith, children: false }
                      }
                    }))}
                    className={`px-3 py-1 rounded text-sm ${
                      formData.personality.goodWith.children === false
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    不適合
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      personality: {
                        ...prev.personality,
                        goodWith: { ...prev.personality.goodWith, children: null }
                      }
                    }))}
                    className={`px-3 py-1 rounded text-sm ${
                      formData.personality.goodWith.children === null
                        ? 'bg-gray-400 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    未知
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-24">與其他寵物：</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      personality: {
                        ...prev.personality,
                        goodWith: { ...prev.personality.goodWith, otherPets: true }
                      }
                    }))}
                    className={`px-3 py-1 rounded text-sm ${
                      formData.personality.goodWith.otherPets === true
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    良好
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      personality: {
                        ...prev.personality,
                        goodWith: { ...prev.personality.goodWith, otherPets: false }
                      }
                    }))}
                    className={`px-3 py-1 rounded text-sm ${
                      formData.personality.goodWith.otherPets === false
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    不適合
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      personality: {
                        ...prev.personality,
                        goodWith: { ...prev.personality.goodWith, otherPets: null }
                      }
                    }))}
                    className={`px-3 py-1 rounded text-sm ${
                      formData.personality.goodWith.otherPets === null
                        ? 'bg-gray-400 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    未知
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-24">與陌生人：</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      personality: {
                        ...prev.personality,
                        goodWith: { ...prev.personality.goodWith, strangers: true }
                      }
                    }))}
                    className={`px-3 py-1 rounded text-sm ${
                      formData.personality.goodWith.strangers === true
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    良好
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      personality: {
                        ...prev.personality,
                        goodWith: { ...prev.personality.goodWith, strangers: false }
                      }
                    }))}
                    className={`px-3 py-1 rounded text-sm ${
                      formData.personality.goodWith.strangers === false
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    不適合
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      personality: {
                        ...prev.personality,
                        goodWith: { ...prev.personality.goodWith, strangers: null }
                      }
                    }))}
                    className={`px-3 py-1 rounded text-sm ${
                      formData.personality.goodWith.strangers === null
                        ? 'bg-gray-400 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    未知
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 標籤 */}
        <div className="border-b pb-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-blue-500" />
            <h2 className="text-xl font-semibold text-gray-900">標籤</h2>
          </div>
          <div className="mb-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                placeholder="輸入標籤 (例如: 待認養, 親人, 已結紮)"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                添加
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:bg-blue-200 rounded-full p-0.5"
                >
                  <X className="w-4 h-4" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* 描述 */}
        <div className="border-b pb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            寵物描述 <span className="text-red-500">*</span>
            <span className="text-gray-500 text-xs ml-2">(至少 50 字元)</span>
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={5}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
              errors.description ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="請描述寵物的個性、習慣、健康狀況等..."
          />
          <div className="flex justify-between mt-1">
            {errors.description && (
              <p className="text-sm text-red-600">{errors.description}</p>
            )}
            <p className="text-sm text-gray-500 ml-auto">
              {formData.description.length} / 1000
            </p>
          </div>
        </div>

        {/* Story 3.6: 助養系統設定 */}
        <div className="border-2 border-orange-200 rounded-lg p-6 bg-gradient-to-r from-orange-50 to-yellow-50">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-6 h-6 text-orange-600" />
            <h2 className="text-xl font-semibold text-gray-900">助養系統設定</h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            啟用助養功能後，使用者可以透過外部連結支持此寵物
          </p>

          {/* 啟用開關 */}
          <div className="flex items-center gap-3 mb-4">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="sponsorship.enabled"
                checked={formData.sponsorship.enabled}
                onChange={handleChange}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
            </label>
            <span className="text-sm font-medium text-gray-900">
              {formData.sponsorship.enabled ? '已啟用' : '未啟用'}
            </span>
          </div>

          {/* 外部連結 */}
          {formData.sponsorship.enabled && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                助養連結 (HTTPS) <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                name="sponsorship.externalLink"
                value={formData.sponsorship.externalLink}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 ${
                  errors['sponsorship.externalLink'] ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="https://example.com/donate"
              />
              {errors['sponsorship.externalLink'] && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors['sponsorship.externalLink']}
                </p>
              )}
              <p className="mt-2 text-xs text-gray-500">
                 提示：請提供完整的 HTTPS 連結，指向您的捐款或助養平台
              </p>
            </div>
          )}
        </div>

        {/* 送出按鈕 */}
        <div className="flex justify-end gap-4 pt-4">
          <button
            type="button"
            onClick={() => navigate('/shelter/dashboard?tab=pets')}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={updateMutation.isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="w-5 h-5" />
            {updateMutation.isLoading ? '儲存中...' : '儲存變更'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PetEditPage;
