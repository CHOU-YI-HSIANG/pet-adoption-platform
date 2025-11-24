import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { matchingAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import {
  Home,
  Award,
  Users,
  Save,
  Check
} from 'lucide-react';

const ProfileSettingsForm = ({ initialData, onSave }) => {
  const [activeTab, setActiveTab] = useState('lifestyle');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState({
    lifestyle: false,
    experience: false,
    environment: false
  });

  // 生活方式表單
  const [lifestyleData, setLifestyleData] = useState({
    activityLevel: initialData?.lifestyleProfile?.activityLevel || '',
    availableTime: initialData?.lifestyleProfile?.availableTime || '',
    housingType: initialData?.lifestyleProfile?.housingType || ''
  });

  // 經驗表單
  const [experienceData, setExperienceData] = useState({
    petOwnershipExperience: initialData?.experienceProfile?.petOwnershipExperience || '',
    previousPets: initialData?.experienceProfile?.previousPets || [],
    trainingExperience: initialData?.experienceProfile?.trainingExperience || false
  });

  // 環境表單
  const [environmentData, setEnvironmentData] = useState({
    hasChildren: initialData?.environmentProfile?.hasChildren || false,
    childrenAges: initialData?.environmentProfile?.childrenAges || [],
    hasOtherPets: initialData?.environmentProfile?.hasOtherPets || false,
    otherPets: initialData?.environmentProfile?.otherPets || [],
    noiseSensitive: initialData?.environmentProfile?.noiseSensitive || false,
    hasAllergies: initialData?.environmentProfile?.hasAllergies || false
  });

  const tabs = [
    { id: 'lifestyle', label: '生活方式', icon: <Home className="w-5 h-5" /> },
    { id: 'experience', label: '養寵物經驗', icon: <Award className="w-5 h-5" /> },
    { id: 'environment', label: '家庭環境', icon: <Users className="w-5 h-5" /> }
  ];

  const handleSaveLifestyle = async () => {
    try {
      setSaving(true);
      await matchingAPI.updateLifestyleProfile(lifestyleData);
      setSaved({ ...saved, lifestyle: true });
      toast.success('生活方式檔案已儲存');
      setTimeout(() => setSaved({ ...saved, lifestyle: false }), 2000);
      if (onSave) onSave();
    } catch (error) {
      toast.error('儲存失敗，請稍後再試');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveExperience = async () => {
    try {
      setSaving(true);
      await matchingAPI.updateExperienceProfile(experienceData);
      setSaved({ ...saved, experience: true });
      toast.success('經驗檔案已儲存');
      setTimeout(() => setSaved({ ...saved, experience: false }), 2000);
      if (onSave) onSave();
    } catch (error) {
      toast.error('儲存失敗，請稍後再試');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEnvironment = async () => {
    try {
      setSaving(true);
      await matchingAPI.updateEnvironmentProfile(environmentData);
      setSaved({ ...saved, environment: true });
      toast.success('環境檔案已儲存');
      setTimeout(() => setSaved({ ...saved, environment: false }), 2000);
      if (onSave) onSave();
    } catch (error) {
      toast.error('儲存失敗，請稍後再試');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex space-x-8 px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              {tab.label}
              {saved[tab.id] && (
                <Check className="w-4 h-4 text-green-600" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 表單內容 */}
      <div className="p-6">
        {activeTab === 'lifestyle' && (
          <LifestyleForm
            data={lifestyleData}
            onChange={setLifestyleData}
            onSave={handleSaveLifestyle}
            saving={saving}
          />
        )}

        {activeTab === 'experience' && (
          <ExperienceForm
            data={experienceData}
            onChange={setExperienceData}
            onSave={handleSaveExperience}
            saving={saving}
          />
        )}

        {activeTab === 'environment' && (
          <EnvironmentForm
            data={environmentData}
            onChange={setEnvironmentData}
            onSave={handleSaveEnvironment}
            saving={saving}
          />
        )}
      </div>
    </div>
  );
};

// 生活方式表單
const LifestyleForm = ({ data, onChange, onSave, saving }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          活動量需求
        </label>
        <select
          value={data.activityLevel}
          onChange={(e) => onChange({ ...data, activityLevel: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
        >
          <option value="">請選擇</option>
          <option value="low">低 - 偶爾散步即可</option>
          <option value="medium">中 - 每天需要固定運動</option>
          <option value="high">高 - 每天需要大量運動</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          可用時間
        </label>
        <select
          value={data.availableTime}
          onChange={(e) => onChange({ ...data, availableTime: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
        >
          <option value="">請選擇</option>
          <option value="minimal">有限 - 每天 1-2 小時</option>
          <option value="moderate">普通 - 每天 3-4 小時</option>
          <option value="extensive">充足 - 每天 5 小時以上</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          住宅類型
        </label>
        <select
          value={data.housingType}
          onChange={(e) => onChange({ ...data, housingType: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
        >
          <option value="">請選擇</option>
          <option value="apartment">公寓</option>
          <option value="condo">大廈</option>
          <option value="townhouse">透天厝</option>
          <option value="house-no-yard">獨棟房屋（無庭院）</option>
          <option value="house-with-yard">獨棟房屋（有庭院）</option>
        </select>
      </div>

      <button
        onClick={onSave}
        disabled={saving || !data.activityLevel || !data.availableTime || !data.housingType}
        className="w-full btn-primary py-3 flex items-center justify-center gap-2"
      >
        <Save className="w-5 h-5" />
        {saving ? '儲存中...' : '儲存生活方式'}
      </button>
    </motion.div>
  );
};

// 經驗表單
const ExperienceForm = ({ data, onChange, onSave, saving }) => {
  const [newPet, setNewPet] = useState({ species: '', yearsOwned: '' });

  const addPreviousPet = () => {
    if (newPet.species && newPet.yearsOwned) {
      onChange({
        ...data,
        previousPets: [...data.previousPets, { ...newPet, yearsOwned: Number(newPet.yearsOwned) }]
      });
      setNewPet({ species: '', yearsOwned: '' });
    }
  };

  const removePreviousPet = (index) => {
    onChange({
      ...data,
      previousPets: data.previousPets.filter((_, i) => i !== index)
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          養寵物經驗
        </label>
        <select
          value={data.petOwnershipExperience}
          onChange={(e) => onChange({ ...data, petOwnershipExperience: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
        >
          <option value="">請選擇</option>
          <option value="none">沒有經驗</option>
          <option value="beginner">初學者（1-2年）</option>
          <option value="intermediate">中級（3-5年）</option>
          <option value="experienced">資深（5年以上）</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          過往養過的寵物
        </label>
        <div className="space-y-2 mb-3">
          {data.previousPets.map((pet, index) => (
            <div key={index} className="flex items-center justify-between bg-gray-50 px-4 py-2 rounded-lg">
              <span>{pet.species} - {pet.yearsOwned} 年</span>
              <button
                onClick={() => removePreviousPet(index)}
                className="text-red-600 hover:text-red-800"
              >
                移除
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="物種（如：狗、貓）"
            value={newPet.species}
            onChange={(e) => setNewPet({ ...newPet, species: e.target.value })}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
          />
          <input
            type="number"
            placeholder="年數"
            value={newPet.yearsOwned}
            onChange={(e) => setNewPet({ ...newPet, yearsOwned: e.target.value })}
            className="w-24 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
          />
          <button
            onClick={addPreviousPet}
            className="btn-secondary"
          >
            新增
          </button>
        </div>
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="trainingExperience"
          checked={data.trainingExperience}
          onChange={(e) => onChange({ ...data, trainingExperience: e.target.checked })}
          className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
        />
        <label htmlFor="trainingExperience" className="ml-2 text-sm text-gray-700">
          我有寵物訓練經驗
        </label>
      </div>

      <button
        onClick={onSave}
        disabled={saving || !data.petOwnershipExperience}
        className="w-full btn-primary py-3 flex items-center justify-center gap-2"
      >
        <Save className="w-5 h-5" />
        {saving ? '儲存中...' : '儲存經驗檔案'}
      </button>
    </motion.div>
  );
};

// 環境表單
const EnvironmentForm = ({ data, onChange, onSave, saving }) => {
  const [newOtherPet, setNewOtherPet] = useState({ species: '', temperament: '' });

  const addOtherPet = () => {
    if (newOtherPet.species && newOtherPet.temperament) {
      onChange({
        ...data,
        otherPets: [...data.otherPets, newOtherPet]
      });
      setNewOtherPet({ species: '', temperament: '' });
    }
  };

  const removeOtherPet = (index) => {
    onChange({
      ...data,
      otherPets: data.otherPets.filter((_, i) => i !== index)
    });
  };

  const toggleChildAge = (age) => {
    const ages = data.childrenAges.includes(age)
      ? data.childrenAges.filter(a => a !== age)
      : [...data.childrenAges, age];
    onChange({ ...data, childrenAges: ages });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <div className="flex items-center mb-3">
          <input
            type="checkbox"
            id="hasChildren"
            checked={data.hasChildren}
            onChange={(e) => onChange({ ...data, hasChildren: e.target.checked, childrenAges: e.target.checked ? data.childrenAges : [] })}
            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
          />
          <label htmlFor="hasChildren" className="ml-2 text-sm font-medium text-gray-700">
            家中有小孩
          </label>
        </div>

        {data.hasChildren && (
          <div className="ml-6 space-y-2">
            <p className="text-sm text-gray-600 mb-2">小孩年齡（可複選）:</p>
            {['0-3', '4-6', '7-12', '13+'].map((age) => (
              <label key={age} className="flex items-center">
                <input
                  type="checkbox"
                  checked={data.childrenAges.includes(age)}
                  onChange={() => toggleChildAge(age)}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">{age} 歲</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center mb-3">
          <input
            type="checkbox"
            id="hasOtherPets"
            checked={data.hasOtherPets}
            onChange={(e) => onChange({ ...data, hasOtherPets: e.target.checked, otherPets: e.target.checked ? data.otherPets : [] })}
            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
          />
          <label htmlFor="hasOtherPets" className="ml-2 text-sm font-medium text-gray-700">
            家中有其他寵物
          </label>
        </div>

        {data.hasOtherPets && (
          <div className="ml-6">
            <div className="space-y-2 mb-3">
              {data.otherPets.map((pet, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 px-4 py-2 rounded-lg">
                  <span>{pet.species} - {pet.temperament}</span>
                  <button
                    onClick={() => removeOtherPet(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    移除
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="物種"
                value={newOtherPet.species}
                onChange={(e) => setNewOtherPet({ ...newOtherPet, species: e.target.value })}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
              />
              <input
                type="text"
                placeholder="性情"
                value={newOtherPet.temperament}
                onChange={(e) => setNewOtherPet({ ...newOtherPet, temperament: e.target.value })}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
              />
              <button
                onClick={addOtherPet}
                className="btn-secondary"
              >
                新增
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="noiseSensitive"
          checked={data.noiseSensitive}
          onChange={(e) => onChange({ ...data, noiseSensitive: e.target.checked })}
          className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
        />
        <label htmlFor="noiseSensitive" className="ml-2 text-sm text-gray-700">
          對噪音敏感
        </label>
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="hasAllergies"
          checked={data.hasAllergies}
          onChange={(e) => onChange({ ...data, hasAllergies: e.target.checked })}
          className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
        />
        <label htmlFor="hasAllergies" className="ml-2 text-sm text-gray-700">
          有寵物過敏問題
        </label>
      </div>

      <button
        onClick={onSave}
        disabled={saving}
        className="w-full btn-primary py-3 flex items-center justify-center gap-2"
      >
        <Save className="w-5 h-5" />
        {saving ? '儲存中...' : '儲存環境檔案'}
      </button>
    </motion.div>
  );
};

export default ProfileSettingsForm;
