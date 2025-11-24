import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation } from 'react-query';
import toast from 'react-hot-toast';
import { ArrowLeft, Upload, X } from 'lucide-react';

const EditPetPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [photos, setPhotos] = useState([]);
  const [existingPhotos, setExistingPhotos] = useState([]);
  const [formData, setFormData] = useState(null);

  // 獲取寵物資料
  const { data: petData, isLoading } = useQuery(
    ['pet', id],
    async () => {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/pets/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error('獲取寵物資料失敗');
      }
      
      return response.json();
    },
    {
      onSuccess: (data) => {
        // 初始化表單資料
        setFormData({
          name: data.name || '',
          species: data.species || 'dog',
          breed: data.breed || '混種',
          gender: data.gender || 'male',
          age: data.age || { value: 1, unit: 'years' },
          ageCategory: data.ageCategory || 'adult',
          size: data.size || 'medium',
          color: data.color || '',
          description: data.description || '',
          location: data.location || { city: '', district: '' },
          personality: data.personality || { 
            traits: [], 
            activityLevel: 'moderate',
            goodWith: { children: null, otherPets: null, strangers: null }
          },
          healthStatus: data.healthStatus || { vaccinated: false, spayed: false, microchipped: false },
          shelterInfo: data.shelterInfo || {
            source: 'owner-surrender',
            location: ''
          }
        });
        setExistingPhotos(data.photos || []);
      }
    }
  );

  const updatePetMutation = useMutation(
    async (petData) => {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('請先登入');
        navigate('/login');
        return;
      }

      const formDataToSend = new FormData();
      
      // 添加新照片
      photos.forEach((photo) => {
        formDataToSend.append('newPhotos', photo);
      });
      
      // 添加基本欄位
      formDataToSend.append('name', petData.name);
      formDataToSend.append('species', petData.species);
      formDataToSend.append('breed', petData.breed);
      formDataToSend.append('gender', petData.gender);
      formDataToSend.append('size', petData.size);
      formDataToSend.append('color', petData.color);
      formDataToSend.append('description', petData.description);
      formDataToSend.append('ageCategory', petData.ageCategory);
      
      // age 欄位
      formDataToSend.append('age[value]', petData.age.value || 1);
      formDataToSend.append('age[unit]', petData.age.unit || 'years');
      
      // location 欄位
      formDataToSend.append('location[city]', petData.location.city || '');
      formDataToSend.append('location[district]', petData.location.district || '');
      
      // healthStatus 欄位
      formDataToSend.append('healthStatus[vaccinated]', petData.healthStatus.vaccinated);
      formDataToSend.append('healthStatus[spayed]', petData.healthStatus.spayed);
      formDataToSend.append('healthStatus[microchipped]', petData.healthStatus.microchipped);
      
      // shelterInfo 欄位
      formDataToSend.append('shelterInfo[source]', petData.shelterInfo.source || 'owner-surrender');
      formDataToSend.append('shelterInfo[location]', petData.shelterInfo.location || '台灣');
      
      // personality 欄位
      formDataToSend.append('personality[activityLevel]', petData.personality.activityLevel || 'moderate');
      
      // personalityTraits 使用 JSON 字串
      formDataToSend.append('personalityTraits', JSON.stringify(petData.personality.traits || []));

      const response = await fetch(`http://localhost:5000/api/pets/${id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formDataToSend
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || '更新失敗');
      }
      
      return response.json();
    },
    {
      onSuccess: () => {
        toast.success('寵物資訊已更新');
        navigate('/my-pets');
      },
      onError: (error) => {
        toast.error(error.message);
      }
    }
  );

  const handlePhotoChange = (e) => {
    const files = Array.from(e.target.files);
    setPhotos(prev => [...prev, ...files]);
  };

  const removeNewPhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingPhoto = (index) => {
    setExistingPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleChange = (field, value) => {
    setFormData(prev => {
      const keys = field.split('.');
      if (keys.length === 1) {
        return { ...prev, [field]: value };
      }
      
      const newData = { ...prev };
      let current = newData;
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return newData;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('請輸入寵物名稱');
      return;
    }
    
    if (existingPhotos.length === 0 && photos.length === 0) {
      toast.error('請至少上傳一張照片');
      return;
    }
    
    updatePetMutation.mutate(formData);
  };

  if (isLoading || !formData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 標題 */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/my-pets')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            返回我的送養列表
          </button>
          <h1 className="text-3xl font-bold text-gray-900">編輯送養資訊</h1>
          <p className="mt-2 text-gray-600">修改寵物的詳細資訊</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
          {/* 照片上傳區 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              寵物照片 <span className="text-red-500">*</span>
            </label>
            
            {/* 現有照片 */}
            {existingPhotos.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">現有照片:</p>
                <div className="grid grid-cols-3 gap-4">
                  {existingPhotos.map((photo, index) => (
                    <div key={index} className="relative">
                      <img
                        src={`http://localhost:5000${photo.url}`}
                        alt={`寵物照片 ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeExistingPhoto(index)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 新增照片 */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <label className="cursor-pointer">
                <span className="text-blue-600 hover:text-blue-700">點擊上傳新照片</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </label>
              <p className="text-sm text-gray-500 mt-1">支援 JPG、PNG 格式</p>
            </div>

            {/* 新照片預覽 */}
            {photos.length > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-4">
                {photos.map((photo, index) => (
                  <div key={index} className="relative">
                    <img
                      src={URL.createObjectURL(photo)}
                      alt={`新照片 ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeNewPhoto(index)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 基本資訊 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                寵物名稱 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                物種 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.species}
                onChange={(e) => handleChange('species', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="dog">狗</option>
                <option value="cat">貓</option>
                <option value="rabbit">兔子</option>
                <option value="bird">鳥</option>
                <option value="hamster">倉鼠</option>
                <option value="other">其他</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                品種
              </label>
              <input
                type="text"
                value={formData.breed}
                onChange={(e) => handleChange('breed', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                性別 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.gender}
                onChange={(e) => handleChange('gender', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="male">公</option>
                <option value="female">母</option>
                <option value="unknown">未知</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                體型 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.size}
                onChange={(e) => handleChange('size', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="small">小型</option>
                <option value="medium">中型</option>
                <option value="large">大型</option>
                <option value="extra-large">超大型</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                毛色
              </label>
              <input
                type="text"
                value={formData.color}
                onChange={(e) => handleChange('color', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="例如: 黑色、棕色"
              />
            </div>
          </div>

          {/* 年齡 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                年齡數值
              </label>
              <select
                value={String(formData.age.value)}
                onChange={(e) => handleChange('age', { ...formData.age, value: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 min-w-0"
                style={{ minWidth: '5rem' }}
              >
                {Array.from({ length: 50 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={String(n)}>{n}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                單位
              </label>
              <select
                value={formData.age.unit}
                onChange={(e) => handleChange('age', { ...formData.age, unit: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="months">月</option>
                <option value="years">歲</option>
              </select>
            </div>
          </div>

          {/* 地點 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                城市
              </label>
              <input
                type="text"
                value={formData.location.city}
                onChange={(e) => handleChange('location', { ...formData.location, city: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="例如: 台北市"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                區域
              </label>
              <input
                type="text"
                value={formData.location.district}
                onChange={(e) => handleChange('location', { ...formData.location, district: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="例如: 大安區"
              />
            </div>
          </div>

          {/* 描述 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              詳細描述
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows="4"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="描述寵物的個性、習慣、特殊需求等..."
            ></textarea>
          </div>

          {/* 健康狀況 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              健康狀況
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.healthStatus.vaccinated}
                  onChange={(e) => handleChange('healthStatus', { ...formData.healthStatus, vaccinated: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-gray-700">已施打疫苗</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.healthStatus.spayed}
                  onChange={(e) => handleChange('healthStatus', { ...formData.healthStatus, spayed: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-gray-700">已絕育</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.healthStatus.microchipped}
                  onChange={(e) => handleChange('healthStatus', { ...formData.healthStatus, microchipped: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-gray-700">已植入晶片</span>
              </label>
            </div>
          </div>

          {/* 活動力 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              活動力
            </label>
            <select
              value={formData.personality.activityLevel}
              onChange={(e) => handleChange('personality', { ...formData.personality, activityLevel: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="low">低 - 喜歡安靜</option>
              <option value="moderate">中等 - 平衡活動與休息</option>
              <option value="high">高 - 精力充沛</option>
            </select>
          </div>

          {/* 送養資訊 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              送養地點
            </label>
            <input
              type="text"
              value={formData.shelterInfo.location}
              onChange={(e) => handleChange('shelterInfo', { ...formData.shelterInfo, location: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="例如: 台北市大安區"
            />
          </div>

          {/* 提交按鈕 */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={updatePetMutation.isLoading}
              className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {updatePetMutation.isLoading ? '更新中...' : '儲存變更'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/my-pets')}
              className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 font-medium transition-colors"
            >
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditPetPage;