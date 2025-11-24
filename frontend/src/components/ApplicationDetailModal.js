import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useAuth } from '../services/auth';
import { X, User, Home, Heart, FileText, Clock, MessageSquare, CheckCircle, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { getPetPhotoUrl } from '../utils/imageHelpers';

const ApplicationDetailModal = ({ isOpen, onClose, applicationId }) => {
  const queryClient = useQueryClient();
  const [newNote, setNewNote] = useState('');
  const [reviewDecision, setReviewDecision] = useState(null); // 'approved' or 'rejected'
  const [reviewReason, setReviewReason] = useState('');

  // 取得申請詳情
  const { user } = useAuth();
  const { data: application, isLoading, error } = useQuery(
    ['applicationDetail', applicationId],
    async () => {
      const response = await fetch(
        `http://localhost:5000/api/adoptions/${applicationId}/details`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Failed to fetch application details: ${response.status} ${response.statusText} ${text}`);
      }
      const result = await response.json();
      return result.data;
    },
    {
      enabled: !!applicationId && isOpen,
      onError: (err) => {
        console.error('Application detail fetch error:', err);
        // 只在開發時期用 console，使用者端可用 toast 提示
        try { window.alert('載入申請詳情失敗: ' + (err.message || 'Unknown')) } catch (e) {}
      }
    }
  );

  // 開發用偵錯：當 application 取得時把完整物件印到 console，方便檢查欄位名稱/結構
  useEffect(() => {
    if (application) {
      // eslint-disable-next-line no-console
      console.log('application debug (ApplicationDetailModal):', application);
    } else if (!isLoading && !application) {
      // eslint-disable-next-line no-console
      console.log('application is empty or not loaded', { applicationId, isOpen, isLoading });
    }
  }, [application, applicationId, isOpen, isLoading]);

  // 增加錯誤偵測：當取資料失敗時顯示 toast 並在 console 輸出詳細錯誤
  // 這裡使用 useQuery 的 onError 需要改寫為 options 內的 onError

  // 新增備註
  const addNoteMutation = useMutation(
    async (note) => {
      const response = await fetch(
        `http://localhost:5000/api/adoptions/${applicationId}/notes`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ note })
        }
      );
      if (!response.ok) {
        // try to extract server error message
        const text = await response.text().catch(() => '');
        let msg = '新增備註失敗';
        try {
          const j = JSON.parse(text);
          msg = j.error || j.message || msg;
        } catch (e) {
          if (text) msg = text;
        }
        throw new Error(msg);
      }
      return response.json();
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['applicationDetail', applicationId]);
        queryClient.invalidateQueries('shelterApplications');
        setNewNote('');
        toast.success('備註已新增');
      },
      onError: (error) => {
        toast.error(error?.message || '新增備註失敗');
      }
    }
  );

  // 審核申請
  const reviewMutation = useMutation(
    async ({ decision, reason }) => {
      const response = await fetch(
        `http://localhost:5000/api/adoptions/${applicationId}/review`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ decision, reason })
        }
      );
      if (!response.ok) throw new Error('Failed to review application');
      return response.json();
    },
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries(['applicationDetail', applicationId]);
        queryClient.invalidateQueries('shelterApplications');
        queryClient.invalidateQueries('shelterStats');
        toast.success(data.message);
        setReviewDecision(null);
        setReviewReason('');
        onClose();
      },
      onError: (error) => {
        toast.error('審核失敗');
      }
    }
  );

  const handleAddNote = () => {
    if (newNote.trim()) {
      addNoteMutation.mutate(newNote.trim());
    }
  };

  const handleReview = () => {
    if (reviewDecision) {
      reviewMutation.mutate({
        decision: reviewDecision,
        reason: reviewReason
      });
    }
  };

  // helper: 安全地把 pet.age（可能是物件或字串）轉成可顯示的字串
  const renderPetAge = (pet) => {
    if (!pet) return '';
    const age = pet.age;
    if (!age) return pet.ageDescription || '';
    if (typeof age === 'string') return age;
    if (typeof age === 'number') return String(age);
    if (typeof age === 'object') {
      const v = age.value ?? '';
      const u = age.unit ?? '';
      return `${v}${u ? ' ' + u : ''}`.trim();
    }
    return String(age);
  };

  // helper: 取得申請的日期，優先使用 submittedAt, createdAt, agreementDate
  const getApplicationDateString = (app) => {
    if (!app) return '未知';
    const candidates = [app.submittedAt, app.createdAt, app.agreementDate, app.reviewDecision?.reviewDate];
    for (const c of candidates) {
      if (!c) continue;
      const d = new Date(c);
      if (!isNaN(d.getTime())) return d.toLocaleDateString('zh-TW');
    }
    return '未知';
  };

  // helper: 取得聯絡電話，優先採用申請表內的 emergencyContact / contactInfo / applicant.phone
  const getContactPhone = (app) => {
    if (!app) return null;
    // 依序檢查多個可能的欄位路徑，並保證回傳非空的 trim 後字串
    const candidates = [
      app.applicantDetails?.contact?.phone,
      app.applicantDetails?.contactPhone,
      app.personalInfo?.contact?.phone,
      app.personalInfo?.phone,
      app.contactInfo?.phone,
      app.applicant?.phone
    ];
    // 注意：不要把緊急聯絡電話當作申請人電話的 fallback，兩者分開處理
    // 若 canonical 欄位皆無，嘗試使用 rawSubmission（display-only）中的欄位
    // rawSubmission 來源為後端儲存的原始 payload（後端會在建立時儲存 rawSubmission）
    candidates.push(
      app.rawSubmission?.applicantDetails?.contact?.phone,
      app.rawSubmission?.applicantDetails?.contactPhone,
      app.rawSubmission?.contactInfo?.phone,
      app.rawSubmission?.contactPhone
    );
    for (const c of candidates) {
      if (typeof c === 'string') {
        const t = c.trim();
        if (t.length > 0) return t;
      }
      if (typeof c === 'number') return String(c);
    }
    return null;
  };

  // helper: 取得申請人年齡，支援多個可能存放位置
  const getApplicantAge = (app) => {
    if (!app) return null;
    return (
      app.applicantDetails?.age ??
      app.personalInfo?.age ??
      app.applicantDetails?.personalInfo?.age ??
      app.applicant?.personalInfo?.age ??
      app.age ??
      app.applicant?.age ??
      // rawSubmission fallback
      app.rawSubmission?.applicantDetails?.age ??
      app.rawSubmission?.age ??
      null
    );
  };

  // helper: 取得申請人職業
  const getApplicantOccupation = (app) => {
    if (!app) return null;
    return (
      app.applicantDetails?.occupation ??
      app.personalInfo?.occupation ??
      app.applicantDetails?.personalInfo?.occupation ??
      app.applicant?.personalInfo?.occupation ??
      app.occupation ??
      app.applicant?.occupation ??
      // rawSubmission fallback
      app.rawSubmission?.applicantDetails?.occupation ??
      app.rawSubmission?.occupation ??
      null
    );
  };

  // helper: 取得居住地址，支援多處欄位
  const getApplicantAddress = (app) => {
    if (!app) return null;
    return (
      app.applicantDetails?.address ||
      app.personalInfo?.address ||
      app.contactInfo?.address ||
      app.applicant?.address ||
      app.address ||
      null
    );
  };

  // helper: 取得照顧計畫欄位，優先讀取 application.carePlan，再讀 application.applicantDetails.carePlan，然後嘗試較舊欄位名稱
  const getCarePlanValue = (app, field) => {
    if (!app) return null;
    const tryPaths = [];
    if (app.carePlan) tryPaths.push(app.carePlan[field]);
    if (app.applicantDetails?.carePlan) tryPaths.push(app.applicantDetails.carePlan[field]);
    // support new backend names: map common display keys to stored keys
    if (field === 'dailyCareTime') {
      tryPaths.push(app.applicantDetails?.carePlan?.dailyAvailableHours, app.carePlan?.dailyAvailableHours, app.dailyAvailableHours);
    }
    if (field === 'exercisePlan') {
      tryPaths.push(app.applicantDetails?.carePlan?.exercisePlan, app.carePlan?.exercisePlan, app.exercisePlan);
    }
    if (field === 'veterinaryCare') {
      tryPaths.push(app.applicantDetails?.carePlan?.vetCarePlan, app.carePlan?.vetCarePlan, app.vetCarePlan, app.veterinaryCare, app.vetPlan);
    }
    if (field === 'financialCapability') {
      tryPaths.push(app.applicantDetails?.carePlan?.financialPlan, app.carePlan?.financialPlan, app.financialPlan, app.financialCapability, app.fundingPlan);
    }
    if (field === 'otherNotes') {
      tryPaths.push(app.applicantDetails?.carePlan?.otherNotes, app.carePlan?.otherNotes, app.otherNotes, app.additionalNotes);
    }
    // legacy/ad-hoc fallbacks
    if (field === 'adoptionReason') {
      tryPaths.push(app.adoptionReason, app.motivation?.reasons, app.motivation?.text);
    }

    // 新增欄位支援：認養期望、承諾聲明、緊急聯絡人、緊急聯絡電話
    if (field === 'adoptionExpectations') {
      tryPaths.push(app.carePlan?.adoptionExpectations, app.applicantDetails?.carePlan?.adoptionExpectations, app.motivation?.expectations);
    }
    if (field === 'commitmentStatement') {
      tryPaths.push(app.carePlan?.commitmentStatement, app.applicantDetails?.carePlan?.commitmentStatement, app.motivation?.commitment, app.commitmentStatement);
    }
    if (field === 'emergencyContactName') {
      // 僅從 carePlan 或 explicit emergencyContact 欄位讀取緊急聯絡人姓名，避免使用 applicantDetails 的備援值
      tryPaths.push(app.carePlan?.emergencyContactName, app.emergencyContact?.name, app.contactInfo?.emergencyContactName);
    }
    if (field === 'emergencyContactPhone') {
      // 僅從 carePlan 或 emergencyContact 專用欄位讀取緊急聯絡電話，不回退到申請人電話
      tryPaths.push(
        app.carePlan?.emergencyContactPhone,
        app.emergencyContact?.phone,
        app.emergencyContactPhone,
        app.contactInfo?.emergency?.phone
      );
    }

    // 若後端回傳了 rawSubmission（原始 payload），可作為 display-only 的最後 fallback
    if (app.rawSubmission) {
      // try direct matches
      tryPaths.push(
        app.rawSubmission?.carePlan?.[field],
        app.rawSubmission?.applicantDetails?.carePlan?.[field],
        app.rawSubmission?.[field],
        app.rawSubmission?.applicantDetails?.[field]
      );
      // try new backend names in rawSubmission
      if (field === 'dailyCareTime') tryPaths.push(app.rawSubmission?.applicantDetails?.carePlan?.dailyAvailableHours, app.rawSubmission?.carePlan?.dailyAvailableHours, app.rawSubmission?.dailyAvailableHours);
      if (field === 'veterinaryCare') tryPaths.push(app.rawSubmission?.applicantDetails?.carePlan?.vetCarePlan, app.rawSubmission?.carePlan?.vetCarePlan, app.rawSubmission?.vetCarePlan);
      if (field === 'financialCapability') tryPaths.push(app.rawSubmission?.applicantDetails?.carePlan?.financialPlan, app.rawSubmission?.carePlan?.financialPlan, app.rawSubmission?.financialPlan);
      if (field === 'otherNotes') tryPaths.push(app.rawSubmission?.applicantDetails?.carePlan?.otherNotes, app.rawSubmission?.carePlan?.otherNotes, app.rawSubmission?.otherNotes);
      if (field === 'exercisePlan') tryPaths.push(app.rawSubmission?.applicantDetails?.carePlan?.exercisePlan, app.rawSubmission?.carePlan?.exercisePlan);
    }

    for (const v of tryPaths) {
      if (v === undefined || v === null) continue;
      if (typeof v === 'string') {
        const t = v.trim();
        if (t !== '') return t;
        continue;
      }
      // arrays or numbers
      if (Array.isArray(v) && v.length > 0) return v;
      if (typeof v === 'number') return String(v);
    }
    return null;
  };

  const canAddNote = Boolean(
    user && (
      user.role === 'shelter' ||
      user.role === 'admin' ||
      (application && application.pet && (
        (application.pet.createdBy && ((application.pet.createdBy._id && application.pet.createdBy._id.toString()) || application.pet.createdBy.toString())) === String(user._id)
      ))
    )
  );
  
  // Normalize IDs more robustly
  const normalizeId = (v) => {
    if (!v) return null;
    if (typeof v === 'string') return v;
    if (typeof v === 'object') {
      if (v._id) return String(v._id);
      try {
        return String(v);
      } catch (e) {
        return null;
      }
    }
    return String(v);
  };

  const currentUserId = normalizeId(user && (user._id || user.id || user));
  const petOwnerId = normalizeId(application && application.pet && (application.pet.createdBy || application.pet.createdBy?._id));

  const canAddNoteRobust = Boolean(
    user && (
      user.role === 'shelter' ||
      user.role === 'admin' ||
      (petOwnerId && currentUserId && petOwnerId === currentUserId)
    )
  );

  if (!isOpen) return null;

  const TOP_Z = 2147483647;
  const modal = (
    <AnimatePresence>
      <div className="fixed inset-0 overflow-y-auto" style={{ zIndex: TOP_Z }}>
        <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
            onClick={onClose}
            style={{ zIndex: TOP_Z - 1, pointerEvents: 'auto' }}
          />

          {/* 模態框內容：外層固定置中容器（避免 framer-motion 覆蓋 transform） */}
          <div
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            style={{
              position: 'fixed',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: TOP_Z,
              pointerEvents: 'auto',
              width: '100%',
              maxWidth: 'min(90vw, 64rem)',
              padding: '0 1rem'
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all w-full"
              style={{ pointerEvents: 'auto' }}
            >
            {isLoading ? (
              <div className="p-8">
                <div className="animate-pulse space-y-4">
                  <div className="h-6 bg-gray-300 rounded w-1/3"></div>
                  <div className="h-4 bg-gray-300 rounded w-2/3"></div>
                  <div className="h-4 bg-gray-300 rounded w-1/2"></div>
                </div>
              </div>
            ) : application ? (
              <>
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <FileText className="w-6 h-6 text-white mr-3" />
                      <div>
                        <h3 className="text-xl font-bold text-white">
                          認養申請詳情
                        </h3>
                        <p className="text-blue-100 text-sm">
                          申請編號: {application.applicationId}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={onClose}
                      className="text-white hover:text-gray-200 transition-colors"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="px-6 py-4" style={{ maxHeight: '70vh', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  {process.env.NODE_ENV === 'development' && (
                    <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded">
                      <p className="text-xs text-yellow-800">DEBUG (dev only):</p>
                      <p className="text-xs text-gray-700">currentUser: {user ? `${user._id || user.id} (${user.role})` : 'null'}</p>
                      <p className="text-xs text-gray-700">application.status: {application?.status}</p>
                      <p className="text-xs text-gray-700">pet.createdBy: {application?.pet?.createdBy ? (application.pet.createdBy._id ? application.pet.createdBy._id : String(application.pet.createdBy)) : 'n/a'}</p>
                      <p className="text-xs text-gray-700">canAddNote: {String(Boolean(canAddNote))} (robust: {String(Boolean(canAddNoteRobust))})</p>
                    </div>
                  )}
                  {/* 狀態標籤 */}
                  <div className="mb-6">
                    <StatusBadge status={application.status} large />
                  </div>

                  {/* 申請人資訊 */}
                  <section className="mb-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                      <User className="w-5 h-5 mr-2 text-blue-600" />
                      申請人資訊
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">姓名</p>
                        <p className="text-gray-900 font-medium">{application.applicant?.username}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Email</p>
                        <p className="text-gray-900 font-medium">{application.applicant?.email}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">電話</p>
                        <p className="text-gray-900 font-medium">{getContactPhone(application) || '未提供'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">年齡</p>
                        <p className="text-gray-900 font-medium">{getApplicantAge(application) ?? '未提供'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">職業</p>
                        <p className="text-gray-900 font-medium">{getApplicantOccupation(application) || '未提供'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">申請日期</p>
                        <p className="text-gray-900 font-medium">{getApplicationDateString(application)}</p>
                      </div>
                    </div>
                  </section>

                  {/* 寵物資訊 */}
                  <section className="mb-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                      <Heart className="w-5 h-5 mr-2 text-red-600" />
                      申請認養的寵物
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-4 flex items-center">
                      <img
                        src={getPetPhotoUrl(application.pet)}
                        alt={application.pet?.name}
                        className="w-20 h-20 rounded-lg object-cover mr-4"
                      />
                      <div>
                        <p className="text-lg font-semibold text-gray-900">{application.pet?.name}</p>
                        <p className="text-sm text-gray-600">
                          {application.pet?.species === 'dog' ? '狗' : '貓'} {application.pet?.breed} {renderPetAge(application.pet)}
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* 居住環境 */}
                  <section className="mb-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                      <Home className="w-5 h-5 mr-2 text-green-600" />
                      居住環境
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">住宅類型</p>
                        <p className="text-gray-900 font-medium">
                          {application.applicantDetails?.housingType === 'apartment' ? '公寓' :
                           application.applicantDetails?.housingType === 'house' ? '透天厝' :
                           application.applicantDetails?.housingType === 'condo' ? '大廈' : '其他'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">是否有庭院</p>
                        <p className="text-gray-900 font-medium">
                          {application.applicantDetails?.hasYard ? '有' : '無'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">居住地址</p>
                        <p className="text-gray-900 font-medium">{getApplicantAddress(application) || '未提供'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">家庭成員數量</p>
                        <p className="text-gray-900 font-medium">
                          {application.applicantDetails?.householdMembers?.adults || 0} 人
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">兒童數量</p>
                        <p className="text-gray-900 font-medium">
                          {application.applicantDetails?.householdMembers?.children || 0} 人
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* 養寵經驗 */}
                  <section className="mb-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                      <FileText className="w-5 h-5 mr-2 text-indigo-600" />
                      養寵經驗
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      {(() => {
                        const pe = application.applicantDetails?.petExperience || {};
                        // 無養寵物經驗：直接顯示並返回
                        if (pe.noExperience) {
                          return (
                            <>
                              <p className="text-sm text-gray-600">是否有過養寵經驗</p>
                              <p className="text-gray-900 font-medium">無養寵物經驗</p>
                            </>
                          );
                        }

                        // 建立過去飼養描述字串
                        const prevList = (pe.previousPets || []).map(p => (p.whatHappened || '').trim()).filter(Boolean);
                        const prevText = prevList.length ? prevList.join('；') : null;

                        // 建立目前家中寵物字串（使用 species 或其他可讀欄位）
                        const curList = (pe.currentPets || []).map(p => {
                          const labelParts = [];
                          if (p.species) labelParts.push(p.species);
                          if (p.age) labelParts.push(`年齡: ${p.age}`);
                          return labelParts.join(' ');
                        }).filter(Boolean);
                        const curText = curList.length ? curList.join('；') : null;

                        // 組合顯示
                        return (
                          <>
                            <p className="text-sm text-gray-600">是否有過養寵經驗</p>
                            <p className="text-gray-900 font-medium">
                              {pe.hasPrevious && (`曾經飼養過${prevText ? '（' + prevText + '）' : ''}`)}
                              {pe.hasPrevious && curText ? '，' : ''}
                              {curText ? `目前家中有其他寵物${curText ? '（' + curText + '）' : ''}` : ''}
                            </p>
                          </>
                        );
                      })()}
                    </div>
                  </section>

                  {/* 照顧計畫 */}
                  <section className="mb-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                      <Heart className="w-5 h-5 mr-2 text-red-600" />
                      照顧計畫
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-4 grid gap-3">
                      <div>
                        <p className="text-sm text-gray-600">每日可陪伴時間</p>
                        <p className="text-gray-900 font-medium">{getCarePlanValue(application, 'dailyCareTime') || '未提供'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">運動/活動計畫</p>
                        <p className="text-gray-900 font-medium">{getCarePlanValue(application, 'exercisePlan') || '未提供'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">獸醫照護計畫</p>
                        <p className="text-gray-900 font-medium">{getCarePlanValue(application, 'veterinaryCare') || '未提供'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">財務規劃</p>
                        <p className="text-gray-900 font-medium">{getCarePlanValue(application, 'financialCapability') || '未提供'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">認養原因</p>
                        <p className="text-gray-900 font-medium">{(function(){
                          const v = getCarePlanValue(application, 'adoptionReason');
                          if (Array.isArray(v)) return v.join(', ');
                          return v || '未提供';
                        })()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">認養期望</p>
                        <p className="text-gray-900 font-medium">{getCarePlanValue(application, 'adoptionExpectations') || '未提供'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">承諾聲明</p>
                        <p className="text-gray-900 font-medium">{getCarePlanValue(application, 'commitmentStatement') || '未提供'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">緊急聯絡人</p>
                        <p className="text-gray-900 font-medium">{getCarePlanValue(application, 'emergencyContactName') || '未提供'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">緊急聯絡電話</p>
                        <p className="text-gray-900 font-medium">{getCarePlanValue(application, 'emergencyContactPhone') || '未提供'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">其他補充說明</p>
                        <p className="text-gray-900 font-medium">{getCarePlanValue(application, 'otherNotes') || '未提供'}</p>
                      </div>
                    </div>
                  </section>

                  {/* 審核備註 */}
                  <section className="mb-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                      <MessageSquare className="w-5 h-5 mr-2 text-purple-600" />
                      審核備註 ({application.reviewNotes?.length || 0})
                    </h4>
                    
                    {/* 備註列表 */}
                    <div className="space-y-3 mb-4">
                      {application.reviewNotes && application.reviewNotes.length > 0 ? (
                        application.reviewNotes.map((note, index) => (
                          <div key={index} className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center">
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-2">
                                  <User className="w-4 h-4 text-blue-600" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {note.reviewer?.username}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {new Date(note.createdAt).toLocaleString('zh-TW')}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <p className="text-gray-700 ml-10">{note.note}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 text-center py-4">尚無審核備註</p>
                      )}
                    </div>

                    {/* 新增備註 */}
                    {['pending', 'under-review'].includes(application.status) && canAddNoteRobust && (
                      <div className="bg-blue-50 rounded-lg p-4">
                        <textarea
                          value={newNote}
                          onChange={(e) => setNewNote(e.target.value)}
                          placeholder="輸入審核備註..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                          rows="3"
                        />
                        <button
                          onClick={handleAddNote}
                          disabled={!newNote.trim() || addNoteMutation.isLoading}
                          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                          {addNoteMutation.isLoading ? '新增中...' : '新增備註'}
                        </button>
                      </div>
                    )}
                  </section>

                  {/* 審核決定區域 */}
                  {['pending', 'under-review'].includes(application.status) && !reviewDecision && (
                    <section className="mb-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">審核決定</h4>
                      <div className="flex gap-4">
                        <button
                          onClick={() => setReviewDecision('approved')}
                          className="flex-1 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center"
                        >
                          <CheckCircle className="w-5 h-5 mr-2" />
                          核准申請
                        </button>
                        <button
                          onClick={() => setReviewDecision('rejected')}
                          className="flex-1 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center"
                        >
                          <XCircle className="w-5 h-5 mr-2" />
                          拒絕申請
                        </button>
                      </div>
                    </section>
                  )}

                  {/* 審核原因輸入 */}
                  {reviewDecision && (
                    <section className="mb-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">
                        {reviewDecision === 'approved' ? '核准原因 (可選)' : '拒絕原因'}
                      </h4>
                      <textarea
                        value={reviewReason}
                        onChange={(e) => setReviewReason(e.target.value)}
                        placeholder={reviewDecision === 'approved' ? '輸入核准原因...' : '請說明拒絕原因...'}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        rows="3"
                      />
                      <div className="mt-3 flex gap-3">
                        <button
                          onClick={handleReview}
                          disabled={reviewMutation.isLoading}
                          className={`px-6 py-2 rounded-lg text-white ${
                            reviewDecision === 'approved' 
                              ? 'bg-green-600 hover:bg-green-700' 
                              : 'bg-red-600 hover:bg-red-700'
                          } disabled:bg-gray-400`}
                        >
                          {reviewMutation.isLoading ? '處理中...' : '確認'}
                        </button>
                        <button
                          onClick={() => {
                            setReviewDecision(null);
                            setReviewReason('');
                          }}
                          className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                        >
                          取消
                        </button>
                      </div>
                    </section>
                  )}

                  {/* 已審核的決定 */}
                  {application.reviewDecision?.decision && (
                    <section className="mb-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                        <Clock className="w-5 h-5 mr-2 text-gray-600" />
                        審核結果
                      </h4>
                      <div className={`rounded-lg p-4 ${
                        application.reviewDecision.decision === 'approved' 
                          ? 'bg-green-50 border border-green-200' 
                          : 'bg-red-50 border border-red-200'
                      }`}>
                        <div className="flex items-center mb-2">
                          {application.reviewDecision.decision === 'approved' ? (
                            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600 mr-2" />
                          )}
                          <p className={`font-semibold ${
                            application.reviewDecision.decision === 'approved' 
                              ? 'text-green-900' 
                              : 'text-red-900'
                          }`}>
                            {application.reviewDecision.decision === 'approved' ? '已核准' : '已拒絕'}
                          </p>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">
                          審核人員: {application.reviewDecision.reviewer?.username}
                        </p>
                        <p className="text-sm text-gray-600 mb-2">
                          審核日期: {new Date(application.reviewDecision.reviewDate).toLocaleString('zh-TW')}
                        </p>
                        {application.reviewDecision.reason && (
                          <p className="text-gray-700">
                            原因: {application.reviewDecision.reason}
                          </p>
                        )}
                      </div>
                    </section>
                  )}
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4">
                  <button
                    onClick={onClose}
                    className="w-full py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    關閉
                  </button>
                </div>
              </>
            ) : (
              <div className="p-8 text-center text-gray-500">
                找不到申請資料
              </div>
            )}
          </motion.div>
          </div>
        </div>
      </div>
    </AnimatePresence>
  );

  return createPortal(modal, document.body);
};

const StatusBadge = ({ status, large = false }) => {
  const statusConfig = {
    pending: { label: '待審核', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    'under-review': { label: '審核中', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    approved: { label: '已核准', color: 'bg-green-100 text-green-800 border-green-200' },
    rejected: { label: '已拒絕', color: 'bg-red-100 text-red-800 border-red-200' },
    completed: { label: '已完成', color: 'bg-purple-100 text-purple-800 border-purple-200' },
    cancelled: { label: '已取消', color: 'bg-gray-100 text-gray-800 border-gray-200' }
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <span className={`
      inline-flex items-center border rounded-full font-semibold
      ${large ? 'px-4 py-2 text-base' : 'px-3 py-1 text-sm'}
      ${config.color}
    `}>
      {config.label}
    </span>
  );
};

export default ApplicationDetailModal;
