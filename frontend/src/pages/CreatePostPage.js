import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from 'react-query';
import { Toaster, toast } from 'react-hot-toast';
import { Save, X, Send, Clock } from 'lucide-react';
import useInterval from '../hooks/useInterval';
import useLocalStorage from '../hooks/useLocalStorage';

const CreatePostPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [lastSaved, setLastSaved] = useState(null);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [draftData, setDraftData] = useLocalStorage('postDraft', null);
  const [selectedImages, setSelectedImages] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  
  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm({
    defaultValues: {
      type: 'general',
      title: '',
      content: '',
      // Story 2.3: 走失寵物欄位
      petName: '',
      species: 'dog',
      lastSeenLocation: '',
      lastSeenDate: '',
      contactPhone: '',
      reward: ''
    }
  });
  
  const formData = watch();
  
  // 自動儲存草稿（每 30 秒）
  useInterval(() => {
    if (formData.title || formData.content) {
      const draftToSave = {
        ...formData,
        savedAt: new Date().toISOString()
      };
      setDraftData(draftToSave);
      setLastSaved(new Date());
    }
  }, 30000);
  
  // 檢查是否有草稿
  useEffect(() => {
    if (draftData && (draftData.title || draftData.content)) {
      setShowDraftModal(true);
    }
  }, []);
  
  // 處理圖片選擇
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    
    if (selectedImages.length + files.length > 5) {
      toast.error('最多只能上傳 5 張圖片');
      return;
    }
    
    const newImages = [...selectedImages, ...files];
    setSelectedImages(newImages);
    
    // 生成預覽 URL
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setPreviewUrls([...previewUrls, ...newPreviews]);
  };
  
  // 移除圖片
  const removeImage = (index) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    const newPreviews = previewUrls.filter((_, i) => i !== index);
    URL.revokeObjectURL(previewUrls[index]);
    setSelectedImages(newImages);
    setPreviewUrls(newPreviews);
  };
  
  // 恢復草稿
  const restoreDraft = () => {
    setValue('type', draftData.type);
    setValue('title', draftData.title);
    setValue('content', draftData.content);
    setShowDraftModal(false);
    toast.success('已恢復草稿');
  };
  
  // 捨棄草稿
  const discardDraft = () => {
    setDraftData(null);
    setShowDraftModal(false);
    toast.success('已捨棄草稿');
  };
  
  // 提交貼文
  const createPostMutation = useMutation(
    async (data) => {
      // 檢查 token
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('請先登入才能發布貼文');
      }

      const formData = new FormData();
      
      // 調試日誌 - 查看實際數據
      console.log('=== 準備發送的數據 ===');
      console.log('type:', data.type);
      console.log('title:', data.title, '(長度:', data.title?.length, ')');
      console.log('content:', data.content, '(長度:', data.content?.length, ')');
      
      formData.append('type', data.type);
      formData.append('title', data.title);
      formData.append('content', data.content);
      
      // Story 2.3: 走失寵物資訊
      if (data.type === 'lost-pet' || data.type === 'found-pet') {
        const lostPetInfo = {};
        
        // 只添加有值的欄位
        if (data.petName) lostPetInfo.petName = data.petName;
        if (data.species) lostPetInfo.species = data.species;
        if (data.lastSeenLocation) lostPetInfo.lastSeenLocation = data.lastSeenLocation;
        if (data.lastSeenDate) lostPetInfo.lastSeenDate = data.lastSeenDate;
        if (data.contactPhone) lostPetInfo.contactPhone = data.contactPhone;
        if (data.reward) lostPetInfo.reward = parseInt(data.reward);
        
        // 只有當至少有一個欄位時才發送
        if (Object.keys(lostPetInfo).length > 0) {
          formData.append('lostPetInfo', JSON.stringify(lostPetInfo));
          console.log('走失寵物資訊:', lostPetInfo);
        }
      }
      
      selectedImages.forEach((image) => {
        formData.append('images', image);
      });
      
      console.log('發送請求, Token:', token ? `${token.substring(0, 20)}...` : 'null');
      
      const response = await fetch('http://localhost:5000/api/posts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
          // 注意: 不要設定 Content-Type，讓瀏覽器自動設定 multipart/form-data 的 boundary
        },
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('=== 發布失敗詳細資訊 ===');
        console.error('狀態碼:', response.status);
        console.error('完整錯誤:', JSON.stringify(errorData, null, 2));
        if (errorData.error?.details) {
          console.error('驗證錯誤詳情:', errorData.error.details);
        }
        if (response.status === 401) {
          throw new Error('登入已過期，請重新登入');
        }
        throw new Error(errorData.error?.message || errorData.message || '發布失敗');
      }
      
      return response.json();
    },
    {
      onSuccess: () => {
        setDraftData(null);
        // 清除posts相關的所有query cache,強制重新載入
        queryClient.invalidateQueries('posts');
        toast.success('貼文發布成功！');
        // 延遲一點點再導航,確保toast顯示
        setTimeout(() => {
          navigate('/community');
        }, 500);
      },
      onError: (error) => {
        toast.error(error.message || '發布失敗，請稍後再試');
      }
    }
  );
  
  const onSubmit = (data) => {
    createPostMutation.mutate(data);
  };
  
  // 儲存草稿
  const saveDraft = () => {
    const draftToSave = {
      ...formData,
      savedAt: new Date().toISOString()
    };
    setDraftData(draftToSave);
    setLastSaved(new Date());
    toast.success('草稿已儲存');
  };
  
  // 取消
  const handleCancel = () => {
    if (formData.title || formData.content) {
      if (window.confirm('確定要離開嗎？未儲存的內容將會遺失')) {
        navigate('/community');
      }
    } else {
      navigate('/community');
    }
  };
  
  // 格式化時間
  const formatLastSaved = () => {
    if (!lastSaved) return '';
    const seconds = Math.floor((new Date() - lastSaved) / 1000);
    if (seconds < 60) return `${seconds} 秒前`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} 分鐘前`;
    const hours = Math.floor(minutes / 60);
    return `${hours} 小時前`;
  };
  
  const typeOptions = [
    { value: 'general', label: '一般討論', color: 'bg-blue-100 text-blue-800' },
    { value: 'lost-pet', label: '尋找走失寵物', color: 'bg-red-100 text-red-800' },
    { value: 'found-pet', label: '發現走失寵物', color: 'bg-green-100 text-green-800' },
    { value: 'adoption-story', label: '領養故事分享', color: 'bg-purple-100 text-purple-800' }
  ];
  
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <Toaster position="top-right" />
      
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">發布貼文</h1>
            {lastSaved && (
              <div className="flex items-center text-sm text-gray-500">
                <Clock className="w-4 h-4 mr-1" />
                草稿已自動儲存於 {formatLastSaved()}
              </div>
            )}
          </div>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* 貼文類型 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                貼文類型 <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {typeOptions.map(option => (
                  <label
                    key={option.value}
                    className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                      formData.type === option.value
                        ? 'border-purple-600 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    <input
                      type="radio"
                      value={option.value}
                      {...register('type', { required: '請選擇貼文類型' })}
                      className="mr-3"
                    />
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${option.color}`}>
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>
              {errors.type && (
                <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>
              )}
            </div>
            
            {/* 標題 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                標題 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('title', {
                  required: '標題為必填項目',
                  maxLength: { value: 100, message: '標題不能超過 100 個字元' }
                })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                placeholder="請輸入標題（最多 100 字元）"
              />
              <div className="flex justify-between mt-1">
                {errors.title && (
                  <p className="text-sm text-red-600">{errors.title.message}</p>
                )}
                <p className="text-sm text-gray-500 ml-auto">
                  {formData.title.length}/100
                </p>
              </div>
            </div>
            
            {/* 內容 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                內容 <span className="text-red-500">*</span>
              </label>
              <textarea
                {...register('content', {
                  required: '內容為必填項目',
                  minLength: { value: 10, message: '內容至少需要 10 個字元' },
                  maxLength: { value: 5000, message: '內容不能超過 5000 個字元' }
                })}
                rows="10"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                placeholder="請輸入內容（至少 10 個字，最多 5000 字）"
              />
              <div className="flex justify-between mt-1">
                {errors.content && (
                  <p className="text-sm text-red-600">{errors.content.message}</p>
                )}
                <p className="text-sm text-gray-500 ml-auto">
                  {formData.content.length}/5000 {formData.content.length < 10 && <span className="text-red-500">(至少 10 字)</span>}
                </p>
              </div>
            </div>
            
            {/* Story 2.3: 走失寵物條件式欄位 */}
            {(formData.type === 'lost-pet' || formData.type === 'found-pet') && (
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 space-y-4">
                <h3 className="text-lg font-semibold text-red-800 mb-4">
                  {formData.type === 'lost-pet' ? '走失寵物資訊' : '發現寵物資訊'}
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  {/* 寵物名稱 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      寵物名稱 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      {...register('petName', {
                        required: formData.type === 'lost-pet' || formData.type === 'found-pet' ? '寵物名稱為必填項目' : false,
                        maxLength: { value: 50, message: '寵物名稱不能超過 50 個字元' }
                      })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                      placeholder="例如：小白"
                    />
                    {errors.petName && (
                      <p className="mt-1 text-sm text-red-600">{errors.petName.message}</p>
                    )}
                  </div>
                  
                  {/* 物種 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      物種 <span className="text-red-500">*</span>
                    </label>
                    <select
                      {...register('species', {
                        required: formData.type === 'lost-pet' || formData.type === 'found-pet' ? '物種為必填項目' : false
                      })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                    >
                      <option value="dog">狗</option>
                      <option value="cat">貓</option>
                      <option value="other">其他</option>
                    </select>
                    {errors.species && (
                      <p className="mt-1 text-sm text-red-600">{errors.species.message}</p>
                    )}
                  </div>
                </div>
                
                {/* 最後出現地點 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    最後出現地點 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register('lastSeenLocation', {
                      required: formData.type === 'lost-pet' || formData.type === 'found-pet' ? '最後出現地點為必填項目' : false,
                      maxLength: { value: 200, message: '地點不能超過 200 個字元' }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                    placeholder="例如：台北市大安區羅斯福路四段"
                  />
                  {errors.lastSeenLocation && (
                    <p className="mt-1 text-sm text-red-600">{errors.lastSeenLocation.message}</p>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  {/* 最後出現日期 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      最後出現日期 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      {...register('lastSeenDate', {
                        required: formData.type === 'lost-pet' || formData.type === 'found-pet' ? '最後出現日期為必填項目' : false
                      })}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                    />
                    {errors.lastSeenDate && (
                      <p className="mt-1 text-sm text-red-600">{errors.lastSeenDate.message}</p>
                    )}
                  </div>
                  
                  {/* 聯絡電話 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      聯絡電話 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      {...register('contactPhone', {
                        required: formData.type === 'lost-pet' || formData.type === 'found-pet' ? '聯絡電話為必填項目' : false,
                        pattern: {
                          value: /^09\d{8}$/,
                          message: '請輸入有效的手機號碼 (09xxxxxxxx)'
                        }
                      })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                      placeholder="0912345678"
                    />
                    {errors.contactPhone && (
                      <p className="mt-1 text-sm text-red-600">{errors.contactPhone.message}</p>
                    )}
                  </div>
                </div>
                
                {/* 懸賞金額 (選填) */}
                {formData.type === 'lost-pet' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      懸賞金額 (選填)
                    </label>
                    <input
                      type="number"
                      {...register('reward', {
                        min: { value: 0, message: '金額不能為負數' }
                      })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                      placeholder="例如：5000"
                    />
                    {errors.reward && (
                      <p className="mt-1 text-sm text-red-600">{errors.reward.message}</p>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {/* 圖片上傳 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                圖片（最多 5 張）
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="hidden"
                  id="image-upload"
                  disabled={selectedImages.length >= 5}
                />
                <label
                  htmlFor="image-upload"
                  className={`flex flex-col items-center cursor-pointer ${
                    selectedImages.length >= 5 ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <svg
                    className="w-12 h-12 text-gray-400 mb-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="text-sm text-gray-600">
                    {selectedImages.length >= 5
                      ? '已達上傳上限'
                      : '點擊上傳圖片或拖曳圖片至此'}
                  </p>
                </label>
                
                {/* 圖片預覽 */}
                {previewUrls.length > 0 && (
                  <div className="grid grid-cols-5 gap-3 mt-4">
                    {previewUrls.map((url, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={url}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* 按鈕 */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={saveDraft}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center"
              >
                <Save className="w-4 h-4 mr-2" />
                儲存草稿
              </button>
              <button
                type="submit"
                disabled={createPostMutation.isLoading}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center disabled:opacity-50"
              >
                <Send className="w-4 h-4 mr-2" />
                {createPostMutation.isLoading ? '發布中...' : '發布'}
              </button>
            </div>
          </form>
        </div>
      </div>
      
      {/* 草稿恢復 Modal */}
      {showDraftModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">發現草稿</h3>
            <p className="text-gray-600 mb-2">我們發現您有未完成的草稿：</p>
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <p className="text-sm text-gray-700">
                <strong>標題：</strong>{draftData?.title || '（無標題）'}
              </p>
              <p className="text-sm text-gray-700 mt-2">
                <strong>內容：</strong>
                {draftData?.content ? draftData.content.substring(0, 100) + '...' : '（無內容）'}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                儲存於：{draftData?.savedAt ? new Date(draftData.savedAt).toLocaleString('zh-TW') : '未知'}
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={discardDraft}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                捨棄
              </button>
              <button
                onClick={() => setShowDraftModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                取消
              </button>
              <button
                onClick={restoreDraft}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                恢復草稿
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreatePostPage;
