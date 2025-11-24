import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from 'react-query';
import toast from 'react-hot-toast';
import { ArrowLeft, Upload, X } from 'lucide-react';

const CreatePetPage = () => {
  const navigate = useNavigate();
  const [photos, setPhotos] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    species: 'dog',
    breed: '混種',
    gender: 'male',
    age: { value: 1, unit: 'years' },
    ageCategory: 'adult',
    size: 'medium',
    color: '',
    description: '',
    location: { city: '', district: '' },
    personality: { 
      traits: [], 
      activityLevel: 'moderate',
      goodWith: { children: null, otherPets: null, strangers: null }
    },
    healthStatus: { vaccinated: false, spayed: false, microchipped: false },
    shelterInfo: {
      source: 'owner-surrender',
      location: ''
    }
  });

  const createPetMutation = useMutation(
    async (petData) => {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('請先登入');
        navigate('/login');
        return;
      }

      const formDataToSend = new FormData();
      
      // 添加照片
      photos.forEach((photo) => {
        formDataToSend.append('photos', photo);
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
      
      // age 欄位 - 需要拆開傳送讓後端能正確解析
      formDataToSend.append('age[value]', petData.age.value || 1);
      formDataToSend.append('age[unit]', petData.age.unit || 'years');
      
      // location 欄位
      formDataToSend.append('location[city]', petData.location.city || '');
      formDataToSend.append('location[district]', petData.location.district || '');
      
      // healthStatus 欄位
      formDataToSend.append('healthStatus[vaccinated]', petData.healthStatus.vaccinated);
      formDataToSend.append('healthStatus[spayed]', petData.healthStatus.spayed);
      formDataToSend.append('healthStatus[microchipped]', petData.healthStatus.microchipped);
      
      // shelterInfo 欄位 - 確保所有必填欄位
      formDataToSend.append('shelterInfo[source]', 'owner-surrender');
      formDataToSend.append('shelterInfo[location]', petData.shelterInfo.location || '台灣');
      formDataToSend.append('shelterInfo[intakeDate]', new Date().toISOString());
      
      // personality 欄位 - activityLevel 必填
      formDataToSend.append('personality[activityLevel]', petData.personality.activityLevel || 'moderate');
      
      // personalityTraits 使用 JSON 字串
      formDataToSend.append('personalityTraits', JSON.stringify(petData.personality.traits || []));

      console.log('Sending pet data:', { 
        name: petData.name,
        ageValue: petData.age.value || 1,
        activityLevel: petData.personality.activityLevel || 'moderate',
        source: 'owner-surrender',
        photosCount: photos.length 
      });

      const response = await fetch('http://localhost:5000/api/pets', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formDataToSend
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server error:', errorData);
        throw new Error(errorData.details || errorData.error || '發布失敗');
      }
      return response.json();
    },
    {
      onSuccess: (data) => {
        console.log('Pet created successfully:', data);
        toast.success('🎉 送養資訊已發布成功!現在可以在待領養列表中看到了');
        setTimeout(() => navigate('/pets'), 2000);
      },
      onError: (error) => {
        console.error('Create pet error:', error);
        toast.error(error.message || '發布失敗,請稍後再試');
      }
    }
  );

  const handlePhotoChange = (e) => {
    const files = Array.from(e.target.files);
    setPhotos(prev => [...prev, ...files].slice(0, 5));
  };

  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.description) {
      toast.error('請填寫寵物名稱和描述');
      return;
    }
    if (formData.description.length < 50) {
      toast.error('描述至少需要 50 個字元');
      return;
    }
    if (photos.length === 0) {
      toast.error('請至少上傳一張照片');
      return;
    }
    
    // 設定收容地點為用戶填寫的地點
    const dataToSend = {
      ...formData,
      shelterInfo: {
        ...formData.shelterInfo,
        location: `${formData.location.city} ${formData.location.district}`.trim() || '台灣'
      }
    };
    
    createPetMutation.mutate(dataToSend);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6">
          <ArrowLeft className="w-5 h-5" /> 返回
        </button>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">發布送養動物</h1>
        <p className="text-gray-600 mb-8">填寫資料後送出,我們會審核後上架</p>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* 照片上傳 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              寵物照片 <span className="text-red-500">*</span> (最多5張)
            </label>
            <div className="flex flex-wrap gap-4">
              {photos.map((photo, index) => (
                <div key={index} className="relative w-24 h-24">
                  <img src={URL.createObjectURL(photo)} alt="" className="w-full h-full object-cover rounded-lg" />
                  <button type="button" onClick={() => removePhoto(index)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {photos.length < 5 && (
                <label className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-purple-500">
                  <input type="file" multiple accept="image/*" onChange={handlePhotoChange} className="hidden" />
                  <Upload className="w-6 h-6 text-gray-400" />
                </label>
              )}
            </div>
          </div>

          {/* 基本資訊 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">名稱 <span className="text-red-500">*</span></label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">物種</label>
              <select value={formData.species} onChange={(e) => setFormData({...formData, species: e.target.value})} className="input-field">
                <option value="dog">狗</option>
                <option value="cat">貓</option>
                <option value="rabbit">兔子</option>
                <option value="bird">鳥</option>
                <option value="hamster">倉鼠</option>
                <option value="guinea-pig">天竺鼠</option>
                <option value="other">其他</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">品種 <span className="text-red-500">*</span></label>
              <input type="text" value={formData.breed} onChange={(e) => setFormData({...formData, breed: e.target.value})} className="input-field" placeholder="例: 柴犬、米克斯" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">性別</label>
              <select value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value})} className="input-field">
                <option value="male">公</option>
                <option value="female">母</option>
                <option value="unknown">未知</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">年齡分類 <span className="text-red-500">*</span></label>
              <select value={formData.ageCategory} onChange={(e) => setFormData({...formData, ageCategory: e.target.value})} className="input-field">
                <option value="young">幼年</option>
                <option value="adult">成年</option>
                <option value="senior">老年</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">詳細年齡</label>
              <div className="flex gap-2">
                <select
                  value={String(formData.age.value)}
                  onChange={(e) => setFormData({...formData, age: {...formData.age, value: parseInt(e.target.value) || 1}})}
                  className="input-field flex-1 min-w-0"
                  style={{ minWidth: '5rem' }}
                >
                  {Array.from({ length: 50 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={String(n)}>{n}</option>
                  ))}
                </select>
                <select 
                  value={formData.age.unit} 
                  onChange={(e) => setFormData({...formData, age: {...formData.age, unit: e.target.value}})} 
                  className="input-field w-24"
                >
                  <option value="months">個月</option>
                  <option value="years">歲</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">活動量 <span className="text-red-500">*</span></label>
              <select value={formData.personality.activityLevel} onChange={(e) => setFormData({...formData, personality: {...formData.personality, activityLevel: e.target.value}})} className="input-field">
                <option value="low">低</option>
                <option value="moderate">中等</option>
                <option value="high">高</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">體型</label>
              <select value={formData.size} onChange={(e) => setFormData({...formData, size: e.target.value})} className="input-field">
                <option value="small">小型</option>
                <option value="medium">中型</option>
                <option value="large">大型</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">毛色 <span className="text-red-500">*</span></label>
              <input type="text" value={formData.color} onChange={(e) => setFormData({...formData, color: e.target.value})} className="input-field" placeholder="例: 棕色、黑白相間" required />
            </div>
          </div>

          {/* 健康狀況 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">健康狀況</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={formData.healthStatus.vaccinated} onChange={(e) => setFormData({...formData, healthStatus: {...formData.healthStatus, vaccinated: e.target.checked}})} />
                <span className="text-sm">已施打疫苗</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={formData.healthStatus.spayed} onChange={(e) => setFormData({...formData, healthStatus: {...formData.healthStatus, spayed: e.target.checked}})} />
                <span className="text-sm">已絕育</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={formData.healthStatus.microchipped} onChange={(e) => setFormData({...formData, healthStatus: {...formData.healthStatus, microchipped: e.target.checked}})} />
                <span className="text-sm">已植入晶片</span>
              </label>
            </div>
          </div>

          {/* 詳細描述 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              詳細描述 <span className="text-red-500">*</span> <span className="text-gray-500 text-xs">(至少50個字元)</span>
            </label>
            <textarea 
              value={formData.description} 
              onChange={(e) => setFormData({...formData, description: e.target.value})} 
              className="input-field" 
              rows="5" 
              placeholder="請詳細描述寵物的個性、習慣、健康狀況等資訊,至少50個字元..." 
              required 
            />
            <p className="text-sm text-gray-500 mt-1">目前字數: {formData.description.length} / 50</p>
          </div>

          {/* 地點 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">城市</label>
              <input type="text" value={formData.location.city} onChange={(e) => setFormData({...formData, location: {...formData.location, city: e.target.value}})} className="input-field" placeholder="例: 台北市" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">區域</label>
              <input type="text" value={formData.location.district} onChange={(e) => setFormData({...formData, location: {...formData.location, district: e.target.value}})} className="input-field" placeholder="例: 大安區" />
            </div>
          </div>

          <button type="submit" disabled={createPetMutation.isLoading} className="btn-primary w-full">
            {createPetMutation.isLoading ? '發布中...' : '發布送養資訊'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreatePetPage;
