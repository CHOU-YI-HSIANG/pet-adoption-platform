import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'react-query';
import { petAPI } from '../services/api';
import { useAuth } from '../services/auth';
import toast from 'react-hot-toast';
import { ArrowLeft, Send, User, Home, Briefcase, Heart } from 'lucide-react';

const AdoptionApplicationPage = () => {
  const { petId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);

  // 獲取寵物資訊
  const { data: pet, isLoading: petLoading } = useQuery(
    ['pet', petId],
    () => petAPI.getPet(petId),
    {
      select: (response) => response.data,
    }
  );

  // 申請表單資料
  const [formData, setFormData] = useState({
    // 居住環境
    applicantDetails: {
      housingType: 'apartment',
      hasYard: false,
      isRented: false,
      landlordApproval: false,
      householdMembers: {
        adults: 1,
        children: 0,
        childrenAges: []
      },
      allergies: {
        hasAllergies: false,
        allergyDetails: ''
      },
      petExperience: {
        hasPrevious: false,
        previousPets: [],
        currentPets: []
      },
      workSchedule: {
        employmentStatus: 'employed',
        hoursAway: 8,
        whoWillCare: '本人'
      },
      veterinarianInfo: {
        hasVet: false,
        vetName: '',
        vetPhone: '',
        vetAddress: ''
      }
    },
    motivation: {
      reasons: [],
      expectations: '',
      commitment: ''
    },
    emergencyContact: {
      name: '',
      relationship: '',
      phone: '',
      email: ''
    },
    agreementAccepted: false
  });
  // flattened top-level fields used by the form
  // ensure defaults exist for new required fields
  React.useEffect(() => {
    setFormData(prev => ({
      applicantDetails: prev.applicantDetails,
      motivation: prev.motivation,
      emergencyContact: prev.emergencyContact,
      agreementAccepted: prev.agreementAccepted,
      // personal info
      applicantName: prev.applicantName || '',
      email: prev.email || '',
      phone: prev.phone || '',
      age: prev.age || '',
      occupation: prev.occupation || '',
      // housing / living
      housingType: prev.housingType || prev.applicantDetails?.housingType || '',
      housingOwnership: prev.housingOwnership || '',
      address: prev.address || '',
      hasYard: prev.hasYard || prev.applicantDetails?.hasYard || false,
      yardSize: prev.yardSize || '',
      householdMembers: prev.householdMembers || prev.applicantDetails?.householdMembers || 1,
      hasChildren: prev.hasChildren || false,
      childrenAges: prev.childrenAges || '',
      allMembersAgree: prev.allMembersAgree || false,
      // experience
      previousPetExperience: prev.previousPetExperience || false,
      previousPetDetails: prev.previousPetDetails || '',
      currentPets: prev.currentPets || false,
      currentPetsDetails: prev.currentPetsDetails || '',
      noPetExperience: prev.noPetExperience || false,
      // care plan
      dailyCareTime: prev.dailyCareTime || '',
      exercisePlan: prev.exercisePlan || '',
      veterinaryCare: prev.veterinaryCare || '',
      financialCapability: prev.financialCapability || '',
      adoptionReason: prev.adoptionReason || '',
      motivation: prev.motivation,
      emergencyContact: prev.emergencyContact,
      additionalNotes: prev.additionalNotes || ''
    }));
  }, []);

  // 提交申請
  const submitMutation = useMutation(
    async (applicationData) => {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/adoptions/apply/${petId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(applicationData)
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        // log full error for debugging
        // eslint-disable-next-line no-console
        console.error('Adoption apply error response:', errorBody || `(status ${response.status} ${response.statusText})`);
        // include full server JSON in thrown Error so UI and console will show it
        const errText = errorBody ? JSON.stringify(errorBody) : `${response.status} ${response.statusText}`;
        throw new Error(errText);
      }

      return response.json();
    },
    {
      onSuccess: () => {
        toast.success('認養申請已提交！我們會儘快審核並與您聯繫。');
        setTimeout(() => {
          navigate('/profile?tab=applications');
        }, 2000);
      },
      onError: (error) => {
        // show summarized message and log full Error
        // eslint-disable-next-line no-console
        console.error('Submit mutation error object:', error);
        toast.error(error.message || '提交失敗，請稍後再試');
      }
    }
  );

  const handleChange = (field, value) => {
    // Experience logic:
    // - Selecting previousPetExperience or currentPets will clear noPetExperience.
    // - Selecting noPetExperience clears previous/current and their details.
    if (field === 'previousPetExperience') {
      if (value === true) {
        setFormData(prev => ({ ...prev, previousPetExperience: true, noPetExperience: false }));
      } else {
        setFormData(prev => ({ ...prev, previousPetExperience: false, previousPetDetails: '' }));
      }
      return;
    }

    if (field === 'currentPets') {
      if (value === true) {
        setFormData(prev => ({ ...prev, currentPets: true, noPetExperience: false }));
      } else {
        setFormData(prev => ({ ...prev, currentPets: false, currentPetsDetails: '' }));
      }
      return;
    }

    if (field === 'noPetExperience') {
      if (value === true) {
        setFormData(prev => ({ 
          ...prev, 
          noPetExperience: true, 
          previousPetExperience: false, 
          previousPetDetails: '',
          currentPets: false,
          currentPetsDetails: ''
        }));
      } else {
        setFormData(prev => ({ ...prev, noPetExperience: false }));
      }
      return;
    }

    // If user edits currentPetsDetails while currentPets=false, ignore
    if (field === 'currentPetsDetails' && !formData.currentPets) return;

    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // 驗證必填欄位
    // 個人資訊
    if (!formData.age || !formData.occupation) {
      toast.error('請填寫年齡與職業');
      setStep(1);
      return;
    }

    // 居住環境
    if (!formData.housingType || !formData.housingOwnership || !formData.address || !formData.householdMembers) {
      toast.error('請完成居住環境所有欄位');
      setStep(2);
      return;
    }

    // 養寵經驗：至少選一（曾經飼養 / 目前家中有其他寵物 / 無養寵物經驗）
    if (!formData.previousPetExperience && !formData.noPetExperience && !formData.currentPets) {
      toast.error('請選擇養寵經驗（曾經飼養、目前家中有其他寵物，或無養寵物經驗）');
      setStep(3);
      return;
    }

    // 照顧計畫與認養原因
    if (!formData.veterinaryCare || !formData.adoptionReason) {
      toast.error('請填寫獸醫照護計畫與認養原因');
      setStep(4);
      return;
    }

    // 緊急聯絡人
    if (!formData.emergencyContact.name || !formData.emergencyContact.phone) {
      toast.error('請填寫緊急聯絡人資訊');
      setStep(4);
      return;
    }

    // 建立送給後端的 payload，並做必要的欄位正規化
    const buildApplicationPayload = (fd) => {
      const payload = { ...fd };

      // 保證 applicantDetails 存在
      payload.applicantDetails = payload.applicantDetails || {};
      payload.applicantDetails.carePlan = payload.applicantDetails.carePlan || {};
      payload.carePlan = payload.carePlan || {};

      // 如果使用者在表單填寫了自由文字的 `adoptionReason`，則明確把它覆寫到 motivation.reasons
      // 以避免舊的預設選項（如 'companionship'）被意外保留
      if (payload.adoptionReason && typeof payload.adoptionReason === 'string' && payload.adoptionReason.trim() !== '') {
        payload.motivation = payload.motivation || {};
        payload.motivation.reasons = [payload.adoptionReason.trim()];
      }

      // dailyAvailableHours 可能來自多個欄位（表單上可能為範圍字串如 "3-5"）
      const rawDaily = (fd.dailyCareTime || fd.dailyAvailableHours || fd.applicantDetails?.carePlan?.dailyAvailableHours || fd.carePlan?.dailyAvailableHours || '').toString().trim();

      const parseDailyHours = (v) => {
        if (v === '' || v === null || v === undefined) return null;
        if (typeof v === 'number' && !isNaN(v)) return v;
        // 支援範圍如 "3-5"、"3 ~ 5"，採用平均值
        const rangeMatch = v.match(/(\d+)\s*[-~\uFF5E]\s*(\d+)/);
        if (rangeMatch) {
          const a = parseInt(rangeMatch[1], 10);
          const b = parseInt(rangeMatch[2], 10);
          if (!isNaN(a) && !isNaN(b)) return Math.round((a + b) / 2);
        }
        // 若為單一數字字串
        const num = parseInt(v.replace(/[^0-9]/g, ''), 10);
        return isNaN(num) ? null : num;
      };

      const dailyNum = parseDailyHours(rawDaily);
      if (dailyNum === null) {
        // 如果無法解析，移除該欄位以避免送出不合法的型別
        delete payload.applicantDetails.carePlan.dailyAvailableHours;
        delete payload.carePlan.dailyCareTime;
      } else {
        payload.applicantDetails.carePlan.dailyAvailableHours = dailyNum;
        payload.carePlan.dailyCareTime = dailyNum;
      }

      // 確保前端的 "其他補充說明" (additionalNotes) 被後端接收：
      // 將其同步到多個可能的欄位名稱（otherNotes / carePlan.otherNotes / applicantDetails.carePlan.otherNotes）
      if (payload.additionalNotes && typeof payload.additionalNotes === 'string' && payload.additionalNotes.trim() !== '') {
        const noteText = payload.additionalNotes.trim();
        // top-level
        payload.otherNotes = payload.otherNotes || noteText;
        // top-level carePlan
        payload.carePlan = payload.carePlan || {};
        payload.carePlan.otherNotes = payload.carePlan.otherNotes || noteText;
        // applicantDetails.carePlan
        payload.applicantDetails = payload.applicantDetails || {};
        payload.applicantDetails.carePlan = payload.applicantDetails.carePlan || {};
        payload.applicantDetails.carePlan.otherNotes = payload.applicantDetails.carePlan.otherNotes || noteText;
      }

      return payload;
    };

    const applicationPayload = buildApplicationPayload(formData);
    // 在 mutation 前也印一次 payload 以供 debug
    // eslint-disable-next-line no-console
    console.log('Submitting adoption payload:', applicationPayload);
    submitMutation.mutate(applicationPayload);
  };

  if (petLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-1/3 mb-6"></div>
            <div className="bg-white rounded-lg shadow p-6 space-y-4">
              <div className="h-6 bg-gray-300 rounded w-3/4"></div>
              <div className="h-6 bg-gray-300 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!pet) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-600 mb-4">找不到該寵物資訊</p>
            <button onClick={() => navigate('/pets')} className="btn-primary">
              返回待領養清單
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 返回按鈕 */}
        <button
          onClick={() => navigate(`/pets/${petId}`)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          返回寵物詳情
        </button>

        {/* 標題 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">認養申請</h1>
          <p className="text-gray-600">
            您正在申請認養：<span className="font-semibold text-purple-600">{pet.name}</span>
          </p>
        </div>

        {/* 寵物卡片 */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex gap-4">
          <img
            src={pet.photos?.[0]?.url || pet.photos?.[0] || '/placeholder-pet.jpg'}
            alt={pet.name}
            className="w-24 h-24 object-cover rounded-lg"
          />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{pet.name}</h3>
            <p className="text-sm text-gray-600">
              {pet.species} · {pet.breed} · {pet.ageDescription || '年齡未知'}
            </p>
            <p className="text-sm text-gray-600">{pet.shelterInfo?.name}</p>
          </div>
        </div>
        
        {/* 步驟指示器 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[
              { num: 1, label: '個人資訊', icon: User },
              { num: 2, label: '居住環境', icon: Home },
              { num: 3, label: '養寵經驗', icon: Briefcase },
              { num: 4, label: '照顧計畫', icon: Heart }
            ].map((s, idx) => (
              <React.Fragment key={s.num}>
                <div className="flex flex-col items-center">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      step >= s.num
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    <s.icon className="w-6 h-6" />
                  </div>
                  <span className="text-xs mt-2 text-gray-600">{s.label}</span>
                </div>
                {idx < 3 && (
                  <div
                    className={`flex-1 h-1 ${
                      step > s.num ? 'bg-purple-600' : 'bg-gray-200'
                    }`}
                  ></div>
                )}
              </React.Fragment>
            ))}
          </div>
          </div>

        {/* 申請表單 */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">個人資訊</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  姓名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.applicantName}
                  onChange={(e) => handleChange('applicantName', e.target.value)}
                  className="input-field"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    電子郵件 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    聯絡電話 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className="input-field"
                    pattern="09\d{8}"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    年齡 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.age}
                    onChange={(e) => handleChange('age', e.target.value)}
                    className="input-field"
                    min="18"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    職業 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.occupation}
                    onChange={(e) => handleChange('occupation', e.target.value)}
                    className="input-field"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">居住環境</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  住宅類型 <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.housingType}
                  onChange={(e) => handleChange('housingType', e.target.value)}
                  className="input-field"
                  required
                >
                  <option value="">請選擇</option>
                  <option value="apartment">公寓</option>
                  <option value="house">透天厝</option>
                  <option value="condo">大樓</option>
                  <option value="other">其他</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  住宅所有權 <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.housingOwnership}
                  onChange={(e) => handleChange('housingOwnership', e.target.value)}
                  className="input-field"
                  required
                >
                  <option value="">請選擇</option>
                  <option value="owned">自有</option>
                  <option value="rented">租賃</option>
                  <option value="family">家族共有</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  居住地址 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  className="input-field"
                  required
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.hasYard}
                  onChange={(e) => handleChange('hasYard', e.target.checked)}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <label className="ml-3 text-sm text-gray-700">有庭院或戶外空間</label>
              </div>

              {formData.hasYard && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    庭院大小
                  </label>
                  <input
                    type="text"
                    value={formData.yardSize}
                    onChange={(e) => handleChange('yardSize', e.target.value)}
                    className="input-field"
                    placeholder="例：10坪"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  家庭成員人數 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.householdMembers}
                  onChange={(e) => handleChange('householdMembers', e.target.value)}
                  className="input-field"
                  min="1"
                  required
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.hasChildren}
                  onChange={(e) => handleChange('hasChildren', e.target.checked)}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <label className="ml-3 text-sm text-gray-700">家中有小孩</label>
              </div>

              {formData.hasChildren && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    孩童年齡
                  </label>
                  <input
                    type="text"
                    value={formData.childrenAges}
                    onChange={(e) => handleChange('childrenAges', e.target.value)}
                    className="input-field"
                    placeholder="例：3歲、7歲"
                  />
                </div>
              )}

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.allMembersAgree}
                  onChange={(e) => handleChange('allMembersAgree', e.target.checked)}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <label className="ml-3 text-sm text-gray-700">所有家庭成員同意認養</label>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">養寵經驗</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  養寵經驗 <span className="text-red-500">*</span>
                </label>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.previousPetExperience}
                    onChange={(e) => handleChange('previousPetExperience', e.target.checked)}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <label className="ml-3 text-sm text-gray-700">曾經飼養過寵物</label>
                </div>
                {formData.previousPetExperience && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      請描述您的養寵經驗
                    </label>
                    <textarea
                      value={formData.previousPetDetails}
                      onChange={(e) => handleChange('previousPetDetails', e.target.value)}
                      className="input-field"
                      rows="3"
                      placeholder="例：曾飼養過狗狗5年，直到牠因老去世"
                    />
                  </div>
                )}

                <div className="flex items-center mt-3">
                  <input
                    type="checkbox"
                    checked={formData.noPetExperience}
                    onChange={(e) => handleChange('noPetExperience', e.target.checked)}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <label className="ml-3 text-sm text-gray-700">無養寵物經驗</label>
                </div>
              </div>

              

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.currentPets}
                  onChange={(e) => handleChange('currentPets', e.target.checked)}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <label className="ml-3 text-sm text-gray-700">目前家中有其他寵物</label>
              </div>

              {formData.currentPets && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    請描述現有寵物
                  </label>
                  <textarea
                    value={formData.currentPetsDetails}
                    onChange={(e) => handleChange('currentPetsDetails', e.target.value)}
                    className="input-field"
                    rows="3"
                    placeholder="例：一隻3歲的米克斯貓，已結紮"
                  />
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">照顧計畫</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  每日可陪伴時間
                </label>
                <select
                  value={formData.dailyCareTime}
                  onChange={(e) => handleChange('dailyCareTime', e.target.value)}
                  className="input-field"
                >
                  <option value="">請選擇</option>
                  <option value="1-2">1-2 小時</option>
                  <option value="3-5">3-5 小時</option>
                  <option value="6-8">6-8 小時</option>
                  <option value="8+">8 小時以上</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  運動與活動計畫
                </label>
                <textarea
                  value={formData.exercisePlan}
                  onChange={(e) => handleChange('exercisePlan', e.target.value)}
                  className="input-field"
                  rows="3"
                  placeholder="例：每天早晚散步各30分鐘，週末帶去公園玩"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  獸醫照護計畫 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.veterinaryCare}
                  onChange={(e) => handleChange('veterinaryCare', e.target.value)}
                  className="input-field"
                  rows="3"
                  placeholder="例：定期健康檢查、預防針接種、緊急醫療準備"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  財務規劃
                </label>
                <textarea
                  value={formData.financialCapability}
                  onChange={(e) => handleChange('financialCapability', e.target.value)}
                  className="input-field"
                  rows="2"
                  placeholder="例：每月預算約5000元用於飼料、醫療等"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  認養期望
                </label>
                <textarea
                  value={formData.motivation.expectations}
                  onChange={(e) => {
                    setFormData(prev => ({
                      ...prev,
                      motivation: {
                        ...prev.motivation,
                        expectations: e.target.value
                      }
                    }));
                  }}
                  className="input-field"
                  rows="4"
                  placeholder="請描述您對認養這隻寵物的期望,包括您希望如何與牠相處、照顧牠的生活等"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  承諾聲明
                </label>
                <textarea
                  value={formData.motivation.commitment}
                  onChange={(e) => {
                    setFormData(prev => ({
                      ...prev,
                      motivation: {
                        ...prev.motivation,
                        commitment: e.target.value
                      }
                    }));
                  }}
                  className="input-field"
                  rows="3"
                  placeholder="請承諾您將如何對這隻寵物負責"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  認養原因 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.adoptionReason}
                  onChange={(e) => handleChange('adoptionReason', e.target.value)}
                  className="input-field"
                  rows="3"
                  placeholder="告訴我們為什麼想認養這隻寵物"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    緊急聯絡人 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.emergencyContact.name}
                    onChange={(e) => {
                      setFormData(prev => ({
                        ...prev,
                        emergencyContact: {
                          ...prev.emergencyContact,
                          name: e.target.value
                        }
                      }));
                    }}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    緊急聯絡電話 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.emergencyContact.phone}
                    onChange={(e) => {
                      setFormData(prev => ({
                        ...prev,
                        emergencyContact: {
                          ...prev.emergencyContact,
                          phone: e.target.value
                        }
                      }));
                    }}
                    className="input-field"
                    pattern="09\d{8}"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  其他補充說明
                </label>
                <textarea
                  value={formData.additionalNotes}
                  onChange={(e) => handleChange('additionalNotes', e.target.value)}
                  className="input-field"
                  rows="3"
                  placeholder="任何想讓我們知道的事情"
                />
              </div>
            </div>
          )}

          {/* 按鈕 */}
          <div className="flex justify-between pt-6 border-t">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(s => s - 1)}
                className="btn-secondary"
              >
                上一步
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate(`/pets/${petId}`)}
                className="btn-secondary"
              >
                取消
              </button>
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep(s => s + 1)}
                className="btn-primary"
              >
                下一步
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitMutation.isLoading}
                className="btn-primary flex items-center gap-2"
              >
                {submitMutation.isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    提交中...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    提交申請
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdoptionApplicationPage;