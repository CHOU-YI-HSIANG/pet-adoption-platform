const express = require('express');
const Adoption = require('../models/Adoption');
const Pet = require('../models/Pet');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Message = require('../models/Message');
const { validateBody, validateParams } = require('../middleware/validation');
const {
  adoptionCreateSchema,
  adoptionStatusUpdateSchema,
  idParamSchema
} = require('../utils/validators');
const router = express.Router();

// 中間件：驗證 JWT Token
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '需要提供存取權杖' });
  }

  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user || !user.isActive) {
      return res.status(401).json({ error: '無效的使用者帳號' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: '無效的存取權杖' });
  }
};

// 管理員權限檢查
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'volunteer') {
    return res.status(403).json({ error: '需要管理員權限' });
  }
  next();
};

// helper: 更友善的驗證錯誤回應，包含缺失欄位或衝突資訊
const respondValidationError = (res, message, details = {}) => {
  return res.status(400).json({ success: false, message, details });
};

// helper: 解析 daily hours（支援 "3-5", "3 ~ 5", 或單一數字字串），回傳 number 或 null
const parseDailyHoursValue = (v) => {
  if (v === undefined || v === null) return null;
  if (typeof v === 'number' && !isNaN(v)) return v;
  const s = String(v).trim();
  if (s === '') return null;
  const rangeMatch = s.match(/(\d+)\s*[-~\uFF5E]\s*(\d+)/);
  if (rangeMatch) {
    const a = parseInt(rangeMatch[1], 10);
    const b = parseInt(rangeMatch[2], 10);
    if (!isNaN(a) && !isNaN(b)) return Math.round((a + b) / 2);
  }
  const num = parseInt(s.replace(/[^0-9]/g, ''), 10);
  return isNaN(num) ? null : num;
};

// helper: 在伺服器端把 applicationData 裡可能的位置做 dailyAvailableHours 轉換
const normalizeApplicationDailyHours = (applicationData) => {
  try {
    if (!applicationData) return;
    // top-level carePlan
    if (applicationData.carePlan) {
      const topDaily = parseDailyHoursValue(applicationData.carePlan.dailyAvailableHours ?? applicationData.carePlan.dailyCareTime ?? applicationData.dailyCareTime);
      if (topDaily !== null) {
        applicationData.carePlan.dailyCareTime = topDaily;
        applicationData.carePlan.dailyAvailableHours = topDaily;
      }
    }

    // applicantDetails.carePlan
    if (applicationData.applicantDetails && applicationData.applicantDetails.carePlan) {
      const ad = parseDailyHoursValue(applicationData.applicantDetails.carePlan.dailyAvailableHours ?? applicationData.applicantDetails.carePlan.dailyCareTime);
      if (ad !== null) {
        applicationData.applicantDetails.carePlan.dailyAvailableHours = ad;
        applicationData.applicantDetails.carePlan.dailyCareTime = ad;
      }
    }

    // also try top-level fd dailyCareTime / dailyAvailableHours
    const fd = applicationData.dailyCareTime ?? applicationData.dailyAvailableHours;
    const fdn = parseDailyHoursValue(fd);
    if (fdn !== null) {
      applicationData.dailyCareTime = fdn;
      applicationData.dailyAvailableHours = fdn;
      // ensure nested also set
      applicationData.carePlan = applicationData.carePlan || {};
      applicationData.carePlan.dailyCareTime = applicationData.carePlan.dailyCareTime || fdn;
      applicationData.carePlan.dailyAvailableHours = applicationData.carePlan.dailyAvailableHours || fdn;
      applicationData.applicantDetails = applicationData.applicantDetails || {};
      applicationData.applicantDetails.carePlan = applicationData.applicantDetails.carePlan || {};
      applicationData.applicantDetails.carePlan.dailyAvailableHours = applicationData.applicantDetails.carePlan.dailyAvailableHours || fdn;
      applicationData.applicantDetails.carePlan.dailyCareTime = applicationData.applicantDetails.carePlan.dailyCareTime || fdn;
    }
  } catch (e) {
    // ignore normalization errors; validation will catch issues
    console.error('normalizeApplicationDailyHours error:', e && e.message);
  }
};

/**
 * @swagger
 * /api/adoptions:
 *   post:
 *     summary: 提交認養申請
 *     tags: [Adoptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - petId
 *               - contactInfo
 *               - housingInfo
 *               - motivation
 *             properties:
 *               petId:
 *                 type: string
 *                 description: 寵物 ID
 *               contactInfo:
 *                 type: object
 *                 properties:
 *                   phone:
 *                     type: string
 *                   address:
 *                     type: string
 *               housingInfo:
 *                 type: object
 *                 properties:
 *                   type:
 *                     type: string
 *                   owned:
 *                     type: boolean
 *                   hasYard:
 *                     type: boolean
 *               motivation:
 *                 type: object
 *                 properties:
 *                   reasons:
 *                     type: array
 *                     items:
 *                       type: string
 *                   expectations:
 *                     type: string
 *     responses:
 *       201:
 *         description: 申請提交成功
 *       400:
 *         description: 申請失敗 (寵物不可認養或已提交過申請)
 *       401:
 *         description: 未授權
 */
// 提交認養申請
router.post('/', authenticateToken, validateBody(adoptionCreateSchema), async (req, res) => {
  try {
    const { petId, ...applicationData } = req.body;
    // normalize daily hours fields (support string ranges like "1-2")
    normalizeApplicationDailyHours(applicationData);

    // 檢查寵物是否存在且可認養
    const pet = await Pet.findById(petId);
    if (!pet || !pet.isActive || pet.adoptionStatus !== 'available') {
      return res.status(400).json({
        error: '此寵物目前無法申請認養'
      });
    }

    // 檢查使用者是否已經為此寵物提交過申請
    const existingApplication = await Adoption.findOne({
      pet: petId,
      applicant: req.user._id,
      status: { $nin: ['rejected', 'cancelled'] }
    });

    if (existingApplication) {
      return res.status(400).json({
        error: '您已經為此寵物提交過認養申請'
      });
    }

    // 建立認養申請 — 明確 mapping 申請欄位到 Adoption schema（避免直接 spread 且無一致欄位名稱）
    const adoption = new Adoption({
      pet: petId,
      applicant: req.user._id,
      // 儲存原始提交 payload（供後續 migration / 調查）
      rawSubmission: applicationData,
      rawSubmissionMeta: { source: 'web', createdAt: new Date() },
      applicantDetails: {
        housingType: applicationData.housingType || applicationData.applicantDetails?.housingType,
        hasYard: !!(applicationData.hasYard || applicationData.applicantDetails?.hasYard),
        isRented: (applicationData.housingOwnership === 'rented') || (applicationData.applicantDetails?.isRented),
        landlordApproval: applicationData.landlordApproval || applicationData.applicantDetails?.landlordApproval || false,
        householdMembers: applicationData.householdMembers || applicationData.applicantDetails?.householdMembers || {},
        allergies: applicationData.allergies || applicationData.applicantDetails?.allergies || { hasAllergies: false, allergyDetails: '' },
        petExperience: applicationData.petExperience || applicationData.applicantDetails?.petExperience || {},
        workSchedule: applicationData.workSchedule || applicationData.applicantDetails?.workSchedule || {},
        veterinarianInfo: applicationData.veterinarianInfo || applicationData.applicantDetails?.veterinarianInfo || {},
        address: applicationData.address || applicationData.applicantDetails?.address || '',
        // 申請者年齡與職業（若前端直接提供在 applicantDetails 層或 top-level）
        age: applicationData.applicantDetails?.age ?? applicationData.personalInfo?.age ?? (applicationData.age ? parseInt(applicationData.age, 10) : null),
        occupation: applicationData.applicantDetails?.occupation ?? applicationData.personalInfo?.occupation ?? applicationData.occupation ?? null,
        // 儲存申請表內可聯絡電話（若前端在 applicantDetails.layer 提供）
        contactPhone: applicationData.applicantDetails?.contact?.phone || applicationData.applicantDetails?.contactPhone || applicationData.contactInfo?.phone || applicationData.contactPhone || applicationData.phone || ''
      },
      motivation: applicationData.motivation || {
        reasons: applicationData.adoptionReason ? [applicationData.adoptionReason] : [],
        expectations: applicationData.motivation?.expectations || applicationData.adoptionReason || '',
        commitment: applicationData.motivation?.commitment || applicationData.additionalNotes || ''
      },
      emergencyContact: {
        name: applicationData.emergencyContact?.name || applicationData.emergencyContactName || applicationData.carePlan?.emergencyContactName || '',
        relationship: applicationData.emergencyContact?.relationship || '其他',
        // 嚴格只接受申請表內的緊急聯絡人欄位，不再回退到申請人聯絡電話
        phone: applicationData.emergencyContact?.phone || applicationData.emergencyContactPhone || '',
        email: applicationData.emergencyContact?.email || applicationData.email || ''
      },
      personalInfo: {
        age: applicationData.personalInfo?.age ?? (applicationData.age ? parseInt(applicationData.age, 10) : undefined) ?? null,
        occupation: applicationData.personalInfo?.occupation ?? applicationData.occupation ?? null
      },
      // carePlan 優先使用 applicationData.carePlan 或 applicationData.applicantDetails.carePlan，並支援多重 fallback
      carePlan: (applicationData.carePlan && Object.keys(applicationData.carePlan).length ? applicationData.carePlan : (applicationData.applicantDetails?.carePlan && Object.keys(applicationData.applicantDetails.carePlan).length ? applicationData.applicantDetails.carePlan : {
        veterinaryCare: applicationData.veterinaryCare || applicationData.carePlan?.veterinaryCare || applicationData.applicantDetails?.carePlan?.veterinaryCare || null,
        exercisePlan: applicationData.exercisePlan || applicationData.carePlan?.exercisePlan || applicationData.applicantDetails?.carePlan?.exercisePlan || null,
        dailyCareTime: applicationData.dailyCareTime || applicationData.carePlan?.dailyCareTime || applicationData.applicantDetails?.carePlan?.dailyCareTime || null,
        financialCapability: applicationData.financialCapability || applicationData.carePlan?.financialCapability || applicationData.applicantDetails?.carePlan?.financialCapability || null,
        adoptionReason: applicationData.adoptionReason || (applicationData.motivation?.reasons ? applicationData.motivation.reasons : null) || applicationData.carePlan?.adoptionReason || applicationData.applicantDetails?.carePlan?.adoptionReason || null,
        otherNotes: applicationData.otherNotes || applicationData.additionalNotes || applicationData.carePlan?.otherNotes || applicationData.applicantDetails?.carePlan?.otherNotes || null,
        adoptionExpectations: applicationData.carePlan?.adoptionExpectations || applicationData.adoptionExpectations || applicationData.motivation?.expectations || applicationData.applicantDetails?.carePlan?.adoptionExpectations || null,
        commitmentStatement: applicationData.carePlan?.commitmentStatement || applicationData.commitmentStatement || applicationData.motivation?.commitment || applicationData.applicantDetails?.carePlan?.commitmentStatement || null,
        emergencyContactName: applicationData.carePlan?.emergencyContactName || applicationData.emergencyContact?.name || applicationData.applicantDetails?.carePlan?.emergencyContactName || null,
        emergencyContactPhone: applicationData.carePlan?.emergencyContactPhone || applicationData.emergencyContact?.phone || applicationData.emergencyContactPhone || applicationData.applicantDetails?.carePlan?.emergencyContactPhone || null
      })),
      status: 'pending',
      submittedAt: new Date(),
      agreementAccepted: applicationData.agreementAccepted ?? true,
      agreementDate: applicationData.agreementDate ? new Date(applicationData.agreementDate) : new Date()
    });

    await adoption.save();

    // 更新寵物狀態為待審核
    pet.adoptionStatus = 'pending';
    await pet.save();

    // 發送通知給送養者（寵物創建者） -- 同步 apply/:petId 的行為
    try {
      const petOwner = await Pet.findById(petId).populate('createdBy', '_id username');
      if (petOwner && petOwner.createdBy) {
        await Notification.createNotification({
          recipient: petOwner.createdBy._id,
          type: 'adoption_received',
          title: '收到新的認養申請',
          content: `有人想認養您發布的 ${pet.name}！請前往查看申請詳情。`,
          link: `/my-pets-applications?applicationId=${adoption._id}`,
          relatedAdoption: adoption._id
        });

        try {
          const ownerUser = await User.findById(petOwner.createdBy._id).select('role');
          if (!ownerUser || ownerUser.role === 'admin') {
            const shelterUsers = await User.find({ role: 'shelter', isActive: true }).select('_id');
            for (const s of shelterUsers) {
              if (String(s._id) === String(petOwner.createdBy._id)) continue;
              await Notification.createNotification({
                recipient: s._id,
                type: 'adoption_received',
                title: '收到新的認養申請',
                content: `有人想認養 ${pet.name}（透過政府資料匯入的寵物），請前往查看申請詳情。`,
                link: `/my-pets-applications?applicationId=${adoption._id}`,
                relatedAdoption: adoption._id
              });
            }
          }
        } catch (e) {
          console.error('檢查/廣播給收容所使用者時發生錯誤:', e);
        }
      }
    } catch (notifError) {
      console.error('發送通知給送養者失敗:', notifError);
    }

    // 回傳完整的申請資訊
    const populatedAdoption = await Adoption.findById(adoption._id)
      .select('+rawSubmission +rawSubmissionMeta')
      .populate('pet', 'name species breed photos')
      .populate('applicant', 'firstName lastName email phone');

    res.status(201).json({
      message: '認養申請提交成功',
      adoption: populatedAdoption
    });

  } catch (error) {
    console.error('提交認養申請錯誤:', error);
    res.status(400).json({
      error: '提交認養申請失敗',
      details: error.message
    });
  }
});

// 新增：專門的申請路由（支援 URL 參數）
router.post('/apply/:petId', authenticateToken, async (req, res) => {
  try {
    const { petId } = req.params;
    const applicationData = req.body;
    // normalize daily hours fields before validation / creation
    normalizeApplicationDailyHours(applicationData);

    // 檢查寵物是否存在且可認養
    const pet = await Pet.findById(petId);
    if (!pet || !pet.isActive) {
      return res.status(400).json({
        success: false,
        message: '此寵物不存在或已下架'
      });
    }

    if (pet.adoptionStatus !== 'available') {
      return res.status(400).json({
        success: false,
        message: '此寵物目前無法申請認養'
      });
    }

    // 檢查使用者是否已經為此寵物提交過申請
    const existingApplication = await Adoption.findOne({
      pet: petId,
      applicant: req.user._id,
      status: { $nin: ['rejected', 'cancelled'] }
    });

    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message: '您已經為此寵物提交過認養申請，請勿重複申請'
      });
    }

    // Server-side validation of required fields per new rules
    // 1) 必須提供年齡與職業
    const missingPersonal = [];
    if (!applicationData.age && applicationData.age !== 0) missingPersonal.push('age');
    if (!applicationData.occupation) missingPersonal.push('occupation');
    if (missingPersonal.length) {
      return respondValidationError(res, '個人資訊缺少必填欄位', { missing: missingPersonal });
    }

    // 2) 養寵經驗 - 必須至少勾選「曾經飼養過寵物」或「目前家中有其他寵物」或「無養寵物經驗」之一
    const hasPrevious = !!applicationData.previousPetExperience;
    const noExperience = !!applicationData.noPetExperience;
    const hasCurrentPets = !!applicationData.currentPets;
    if (!hasPrevious && !noExperience && !hasCurrentPets) {
      return respondValidationError(res, '養寵經驗欄位缺失', { requiredOneOf: ['previousPetExperience', 'noPetExperience', 'currentPets'] });
    }
    // 若選擇「無養寵物經驗」，則不允許同時標示曾飼養或目前家中有其他寵物
    if (noExperience && (hasPrevious || hasCurrentPets)) {
      return respondValidationError(res, '養寵經驗欄位衝突', { conflict: ['noPetExperience', hasPrevious ? 'previousPetExperience' : null, hasCurrentPets ? 'currentPets' : null].filter(Boolean) });
    }

    // 3) 居住環境：housingType, housingOwnership, address, householdMembers 必填
    const missingHousing = [];
    if (!applicationData.housingType) missingHousing.push('housingType');
    if (!applicationData.housingOwnership) missingHousing.push('housingOwnership');
    if (!applicationData.address) missingHousing.push('address');
    if (applicationData.householdMembers === undefined || applicationData.householdMembers === null) missingHousing.push('householdMembers');
    if (missingHousing.length) {
      return respondValidationError(res, '居住環境欄位缺失', { missing: missingHousing });
    }

    // 4) 照顧計畫與認養原因必填
    const missingCare = [];
    if (!applicationData.veterinaryCare && !applicationData.carePlan?.veterinaryCare) missingCare.push('veterinaryCare');
    if (!applicationData.adoptionReason && !(applicationData.motivation && applicationData.motivation.reasons && applicationData.motivation.reasons.length)) missingCare.push('adoptionReason');
    if (missingCare.length) {
      return respondValidationError(res, '照顧計畫或認養原因缺失', { missing: missingCare });
    }

    const adoption = new Adoption({
      pet: petId,
      applicant: req.user._id,
      // 儲存原始提交 payload 以便 audit / future migration
      rawSubmission: applicationData,
      rawSubmissionMeta: { source: 'web', createdAt: new Date() },
      applicantDetails: {
        housingType: applicationData.housingType,
        hasYard: !!applicationData.hasYard,
        isRented: applicationData.housingOwnership === 'rented',
        landlordApproval: applicationData.housingOwnership === 'rented' ? !!applicationData.landlordApproval : false,
        householdMembers: {
          adults: applicationData.householdMembers || 1,
          children: applicationData.hasChildren ? (applicationData.childrenAges ? applicationData.childrenAges.split(',').length : 0) : 0,
          childrenAges: applicationData.hasChildren && applicationData.childrenAges 
            ? applicationData.childrenAges.split(',').map(age => parseInt(age.trim())).filter(age => !isNaN(age))
            : []
        },
        allergies: {
          hasAllergies: !!applicationData.hasAllergies,
          allergyDetails: applicationData.allergyDetails || ''
        },
        petExperience: {
          noExperience: noExperience,
          hasPrevious: hasPrevious,
          previousPets: hasPrevious && applicationData.previousPetDetails ? [{
            species: '未指定',
            yearsOwned: 0,
            whatHappened: applicationData.previousPetDetails
          }] : [],
          currentPets: (function(){
            try {
              if (!applicationData.currentPets) return [];
              const details = applicationData.currentPetsDetails || applicationData.applicantDetails?.petExperience?.currentPetsDetails || '';
              if (!details || String(details).trim() === '') return [];
              // split by newline, semicolon, or comma
              const parts = String(details).split(/\r?\n|;|，|,|；/).map(s=>s.trim()).filter(Boolean);
              if (parts.length === 0) return [];
              return parts.map(p => ({
                species: p || '未指定',
                age: null,
                vaccinated: false,
                spayed: false
              }));
            } catch (e) {
              return [];
            }
          })()
        },
        workSchedule: {
          employmentStatus: applicationData.employmentStatus || 'employed',
          hoursAway: applicationData.hoursAway || 8,
          whoWillCare: applicationData.whoWillCare || '本人'
        },
        veterinarianInfo: {
          hasVet: !!applicationData.hasVet,
          vetName: applicationData.vetName || '',
          vetPhone: applicationData.vetPhone || '',
          vetAddress: applicationData.vetAddress || ''
        }
        ,
        // 申請者年齡與職業（canonical fields）
        age: applicationData.applicantDetails?.age ?? applicationData.personalInfo?.age ?? (applicationData.age ? parseInt(applicationData.age, 10) : null),
        occupation: applicationData.applicantDetails?.occupation ?? applicationData.personalInfo?.occupation ?? applicationData.occupation ?? null,
        // applicantDetails.carePlan 支援新欄位名稱
        carePlan: {
          dailyAvailableHours: applicationData.carePlan?.dailyAvailableHours || applicationData.dailyCareTime || applicationData.applicantDetails?.carePlan?.dailyAvailableHours || null,
          exercisePlan: applicationData.carePlan?.exercisePlan || applicationData.exercisePlan || applicationData.applicantDetails?.carePlan?.exercisePlan || null,
          vetCarePlan: applicationData.carePlan?.vetCarePlan || applicationData.veterinaryCare || applicationData.applicantDetails?.carePlan?.vetCarePlan || null,
          financialPlan: applicationData.carePlan?.financialPlan || applicationData.financialCapability || applicationData.applicantDetails?.carePlan?.financialPlan || null,
          otherNotes: applicationData.carePlan?.otherNotes || applicationData.otherNotes || applicationData.applicantDetails?.carePlan?.otherNotes || null
        },
        address: applicationData.address || '',
        contactPhone: applicationData.applicantDetails?.contact?.phone || applicationData.applicantDetails?.contactPhone || applicationData.contactInfo?.phone || applicationData.contactPhone || applicationData.phone || ''
      },
      motivation: {
        reasons: applicationData.motivation?.reasons || (applicationData.adoptionReason ? [applicationData.adoptionReason] : []),
        expectations: applicationData.motivation?.expectations || applicationData.adoptionReason || '',
        commitment: applicationData.motivation?.commitment || applicationData.additionalNotes || ''
      },
      emergencyContact: {
        name: applicationData.emergencyContact?.name || applicationData.emergencyContactName || applicationData.carePlan?.emergencyContactName || '',
        relationship: applicationData.emergencyContact?.relationship || '其他',
        // 只使用緊急聯絡人的欄位或專門的 emergencyContactPhone，不再把申請人電話寫入此欄位
        phone: applicationData.emergencyContact?.phone || applicationData.emergencyContactPhone || '',
        email: applicationData.emergencyContact?.email || applicationData.email || ''
      },
      personalInfo: {
        age: parseInt(applicationData.age, 10),
        occupation: applicationData.occupation
      ,
        // 申請者年齡與職業（canonical fields）
        age: applicationData.applicantDetails?.age ?? (applicationData.age ? parseInt(applicationData.age, 10) : undefined) ?? null,
        occupation: applicationData.applicantDetails?.occupation ?? applicationData.personalInfo?.occupation ?? applicationData.occupation ?? null,
        // applicantDetails.carePlan 支援新欄位名稱
        carePlan: {
          dailyAvailableHours: applicationData.carePlan?.dailyAvailableHours ?? applicationData.dailyCareTime ?? applicationData.applicantDetails?.carePlan?.dailyAvailableHours ?? null,
          exercisePlan: applicationData.carePlan?.exercisePlan ?? applicationData.exercisePlan ?? applicationData.applicantDetails?.carePlan?.exercisePlan ?? null,
          vetCarePlan: applicationData.carePlan?.vetCarePlan ?? applicationData.veterinaryCare ?? applicationData.applicantDetails?.carePlan?.vetCarePlan ?? null,
          financialPlan: applicationData.carePlan?.financialPlan ?? applicationData.financialCapability ?? applicationData.applicantDetails?.carePlan?.financialPlan ?? null,
          otherNotes: applicationData.carePlan?.otherNotes ?? applicationData.otherNotes ?? applicationData.applicantDetails?.carePlan?.otherNotes ?? null
        },
      },
      // 同步 top-level carePlan（保留現有結構，同時 applicantDetails.carePlan 也會被填充）
      carePlan: (applicationData.carePlan && Object.keys(applicationData.carePlan).length ? applicationData.carePlan : (applicationData.applicantDetails?.carePlan && Object.keys(applicationData.applicantDetails.carePlan).length ? applicationData.applicantDetails.carePlan : {
        veterinaryCare: applicationData.veterinaryCare || applicationData.carePlan?.veterinaryCare || applicationData.applicantDetails?.carePlan?.vetCarePlan || applicationData.carePlan?.vetCarePlan || '',
        exercisePlan: applicationData.exercisePlan || applicationData.carePlan?.exercisePlan || applicationData.applicantDetails?.carePlan?.exercisePlan || '',
        dailyCareTime: applicationData.dailyCareTime || applicationData.carePlan?.dailyCareTime || applicationData.applicantDetails?.carePlan?.dailyAvailableHours || '',
        financialCapability: applicationData.financialCapability || applicationData.carePlan?.financialCapability || applicationData.applicantDetails?.carePlan?.financialPlan || '',
        adoptionReason: applicationData.adoptionReason || (applicationData.motivation?.reasons ? applicationData.motivation.reasons : '') || applicationData.carePlan?.adoptionReason || applicationData.applicantDetails?.carePlan?.adoptionReason || '',
        otherNotes: applicationData.otherNotes || applicationData.additionalNotes || applicationData.carePlan?.otherNotes || applicationData.applicantDetails?.carePlan?.otherNotes || '',
        adoptionExpectations: applicationData.carePlan?.adoptionExpectations || applicationData.adoptionExpectations || applicationData.motivation?.expectations || applicationData.applicantDetails?.carePlan?.adoptionExpectations || '',
        commitmentStatement: applicationData.carePlan?.commitmentStatement || applicationData.commitmentStatement || applicationData.motivation?.commitment || applicationData.applicantDetails?.carePlan?.commitmentStatement || '',
        emergencyContactName: applicationData.carePlan?.emergencyContactName || applicationData.emergencyContact?.name || applicationData.applicantDetails?.carePlan?.emergencyContactName || '',
        emergencyContactPhone: applicationData.carePlan?.emergencyContactPhone || applicationData.emergencyContact?.phone || applicationData.emergencyContactPhone || applicationData.applicantDetails?.carePlan?.emergencyContactPhone || ''
      })),
      status: 'pending',
      submittedAt: new Date(),
      agreementAccepted: true,
      agreementDate: new Date()
    });

    await adoption.save();

    // 更新寵物狀態為待審核
    pet.adoptionStatus = 'pending';
    await pet.save();

    // 🔔 發送通知給送養者（寵物創建者）
    try {
      const petOwner = await Pet.findById(petId).populate('createdBy', '_id username');
      if (petOwner && petOwner.createdBy) {
        // 使用 createNotification 靜態方法以便同時建立通知與 Socket.IO 推送
        await Notification.createNotification({
          recipient: petOwner.createdBy._id,
          type: 'adoption_received',
          title: '收到新的認養申請',
          content: `有人想認養您發布的 ${pet.name}！請前往查看申請詳情。`,
          link: `/my-pets-applications?applicationId=${adoption._id}`,
          relatedAdoption: adoption._id
        });
        // 如果該 createdBy 是管理員帳號（表示此寵物可能是透過匯入建立），
        // 我們同時將通知發給所有收容所帳號，確保負責人會看到該申請
        try {
          const ownerUser = await User.findById(petOwner.createdBy._id).select('role');
          if (!ownerUser || ownerUser.role === 'admin') {
            const shelterUsers = await User.find({ role: 'shelter', isActive: true }).select('_id');
            for (const s of shelterUsers) {
              // 不要重複發給已經的 recipient
              if (String(s._id) === String(petOwner.createdBy._id)) continue;
              await Notification.createNotification({
                recipient: s._id,
                type: 'adoption_received',
                title: '收到新的認養申請',
                content: `有人想認養 ${pet.name}（透過政府資料匯入的寵物），請前往查看申請詳情。`,
                link: `/my-pets-applications?applicationId=${adoption._id}`,
                relatedAdoption: adoption._id
              });
            }
          }
        } catch (e) {
          console.error('檢查/廣播給收容所使用者時發生錯誤:', e);
        }
      }
    } catch (notifError) {
      console.error('發送通知給送養者失敗:', notifError);
    }

    // 回傳完整的申請資訊
    const populatedAdoption = await Adoption.findById(adoption._id)
      .select('+rawSubmission +rawSubmissionMeta')
      .populate('pet', 'name species breed photos shelterInfo')
      .populate('applicant', 'firstName lastName email username');

    res.status(201).json({
      success: true,
      message: '認養申請提交成功！我們會儘快審核並與您聯繫。',
      data: {
        adoption: populatedAdoption
      }
    });

  } catch (error) {
    console.error('提交認養申請錯誤:', error);
    res.status(500).json({
      success: false,
      message: '提交認養申請失敗',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/adoptions/my-applications:
 *   get:
 *     summary: 取得我的認養申請列表
 *     tags: [Adoptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected, cancelled]
 *     responses:
 *       200:
 *         description: 成功取得申請列表
 *       401:
 *         description: 未授權
 */
// 取得使用者的認養申請
router.get('/my-applications', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    console.log('📋 我的認養申請請求:', {
      userId: req.user._id,
      page,
      limit,
      status
    });

    // 建立查詢條件
    const query = { applicant: req.user._id };
    if (status) query.status = status;

    // 計算分頁
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // 執行查詢
    // 不回傳 reviewNotes 給申請人（這些備註屬於送養者內部標記）
    const applications = await Adoption.find(query)
      .select('-reviewNotes')
      .populate('pet', 'name species breed photos adoptionStatus')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    console.log('✅ 找到申請數量:', applications.length);

    // 計算總數
    const total = await Adoption.countDocuments(query);
    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      applications,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: total,
        itemsPerPage: parseInt(limit),
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('取得認養申請錯誤:', error);
    res.status(500).json({
      error: '無法取得認養申請',
      details: error.message
    });
  }
});

// 🆕 取得送養者收到的認養申請 (我發布的寵物收到的申請)
router.get('/my-pets-applications', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    // 找到使用者發布的所有寵物
    const userPets = await Pet.find({ createdBy: req.user._id }).select('_id');
    const petIds = userPets.map(pet => pet._id);

    // 建立查詢條件 - 查詢這些寵物的申請
    const query = { pet: { $in: petIds } };
    if (status) query.status = status;

    // 計算分頁
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // 執行查詢
    const applications = await Adoption.find(query)
      .populate('pet', 'name species breed photos adoptionStatus createdBy')
      .populate('applicant', 'username email firstName lastName phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // 計算總數
    const total = await Adoption.countDocuments(query);
    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      success: true,
      data: {
        applications,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: total,
          itemsPerPage: parseInt(limit),
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    console.error('取得送養申請錯誤:', error);
    res.status(500).json({
      success: false,
      error: '無法取得送養申請',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/adoptions/admin/all:
 *   get:
 *     summary: 管理員查看所有認養申請
 *     tags: [Adoptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected, cancelled]
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: 搜尋使用者名稱或Email
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: 成功取得申請列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 adoptions:
 *                   type: array
 *                 pagination:
 *                   type: object
 *       401:
 *         description: 未授權
 *       403:
 *         description: 需要管理員權限
 */
// 取得所有認養申請（管理員）
router.get('/admin/all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      priority,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // 建立查詢條件
    const query = {};
    if (status) query.status = status;
    if (priority) query.priority = priority;

    // 搜尋功能
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      const users = await User.find({
        $or: [
          { firstName: searchRegex },
          { lastName: searchRegex },
          { email: searchRegex }
        ]
      }).select('_id');
      
      const pets = await Pet.find({
        $or: [
          { name: searchRegex },
          { breed: searchRegex }
        ]
      }).select('_id');

      query.$or = [
        { applicationId: searchRegex },
        { applicant: { $in: users.map(u => u._id) } },
        { pet: { $in: pets.map(p => p._id) } }
      ];
    }

    // 只包含管理者帳號所建立的寵物相關申請（避免一般使用者發佈的寵物出現在管理員列表）
    try {
      const adminUsers = await User.find({ role: 'admin' }).select('_id');
      const adminUserIds = adminUsers.map(u => u._id);
      const adminPets = await Pet.find({ createdBy: { $in: adminUserIds } }).select('_id');
      const adminPetIds = adminPets.map(p => p._id);

      if (query.$or) {
        // 確保原本的 $or 條件仍保留，但整體需同時滿足為 admin 發布之 pet
        query.$and = [ { $or: query.$or }, { pet: { $in: adminPetIds } } ];
        delete query.$or;
      } else {
        query.pet = { $in: adminPetIds };
      }
    } catch (e) {
      console.error('取得 adminPets 時發生錯誤:', e && e.message);
    }

    // 排序設定
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // 計算分頁
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // 執行查詢
    const applications = await Adoption.find(query)
      .populate('pet', 'name species breed photos adoptionStatus')
      .populate('applicant', 'firstName lastName email phone')
      .populate('reviewDecision.reviewer', 'firstName lastName')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    // 計算總數
    const total = await Adoption.countDocuments(query);
    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      applications,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: total,
        itemsPerPage: parseInt(limit),
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('取得所有認養申請錯誤:', error);
    res.status(500).json({
      error: '無法取得認養申請',
      details: error.message
    });
  }
});

// 取得單一認養申請詳情
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const adoption = await Adoption.findById(req.params.id)
      .select('+rawSubmission +rawSubmissionMeta')
      .populate('pet')
      .populate('applicant', '-password')
      .populate('reviewNotes.reviewer', 'firstName lastName')
      .populate('reviewDecision.reviewer', 'firstName lastName')
      .populate('completionInfo.completedBy', 'firstName lastName');

    if (!adoption) {
      return res.status(404).json({
        error: '找不到此認養申請'
      });
    }

    // 檢查權限：申請人本人或管理員才能查看
    if (adoption.applicant._id.toString() !== req.user._id.toString() && 
        req.user.role !== 'admin' && req.user.role !== 'volunteer') {
      return res.status(403).json({
        error: '沒有權限查看此申請'
      });
    }

    res.json(adoption);

  } catch (error) {
    console.error('取得認養申請詳情錯誤:', error);
    res.status(500).json({
      error: '無法取得認養申請詳情',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/adoptions/{id}/status:
 *   put:
 *     summary: 更新認養申請狀態 (需管理員權限)
 *     tags: [Adoptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, approved, rejected]
 *               reason:
 *                 type: string
 *                 description: 審核理由
 *     responses:
 *       200:
 *         description: 狀態更新成功
 *       401:
 *         description: 未授權
 *       403:
 *         description: 需要管理員權限
 *       404:
 *         description: 申請不存在
 */
// 更新認養申請狀態（管理員）
router.put('/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status, reason } = req.body;

    const adoption = await Adoption.findById(req.params.id)
      .populate('pet');

    if (!adoption) {
      return res.status(404).json({
        error: '找不到此認養申請'
      });
    }

    // 更新申請狀態
    await adoption.updateStatus(status, req.user._id, reason);

    // 根據狀態更新寵物狀態
    if (status === 'approved') {
      adoption.pet.adoptionStatus = 'pending';
    } else if (status === 'rejected' || status === 'cancelled') {
      adoption.pet.adoptionStatus = 'available';
    } else if (status === 'completed') {
      adoption.pet.adoptionStatus = 'adopted';
    }

    await adoption.pet.save();

    // 發送通知給申請人
    try {
      let notifType = 'adoption_received';
      let notifTitle = '認養申請更新';
      let notifContent = '';
      let notifPriority = 'high';

      if (status === 'approved') {
        notifType = 'adoption_approved';
        notifTitle = '認養申請已核准';
        notifContent = `您對 ${adoption.pet.name} 的認養申請已被核准！`;
      } else if (status === 'rejected') {
        notifType = 'adoption_rejected';
        notifTitle = '認養申請未通過';
        notifContent = `很抱歉，您對 ${adoption.pet.name} 的認養申請未能通過審核`;
      } else if (status === 'completed') {
        notifType = 'adoption_completed';
        notifTitle = '認養完成';
        notifContent = `恭喜完成 ${adoption.pet.name} 的認養程序！`;
        notifPriority = 'urgent';
      }

      await Notification.createNotification({
        recipient: adoption.applicant,
        type: notifType,
        title: notifTitle,
        content: notifContent,
        relatedAdoption: adoption._id,
        relatedPet: adoption.pet._id,
        link: `/my-applications?applicationId=${adoption._id}`,
        priority: notifPriority
      });
    } catch (notifError) {
      console.error('發送認養通知失敗:', notifError);
      // 不影響主流程
    }

    // 回傳更新後的申請
    const updatedAdoption = await Adoption.findById(adoption._id)
      .populate('pet', 'name species breed photos adoptionStatus')
      .populate('applicant', 'firstName lastName email phone')
      .populate('reviewDecision.reviewer', 'firstName lastName');

    res.json({
      message: '申請狀態更新成功',
      adoption: updatedAdoption
    });

  } catch (error) {
    console.error('更新認養申請狀態錯誤:', error);
    res.status(400).json({
      error: '更新申請狀態失敗',
      details: error.message
    });
  }
});

// (保留的：較通用的新增備註路由在下方，允許收容所或管理員新增備註)

// 完成認養流程（管理員）
router.post('/:id/complete', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { 
      adoptionDate, 
      fee, 
      microchipTransferred, 
      documentsProvided 
    } = req.body;

    const adoption = await Adoption.findById(req.params.id)
      .populate('pet');

    if (!adoption) {
      return res.status(404).json({
        error: '找不到此認養申請'
      });
    }

    if (adoption.status !== 'approved') {
      return res.status(400).json({
        error: '只有已核准的申請才能完成認養流程'
      });
    }

    // 更新完成資訊
    adoption.completionInfo = {
      adoptionDate: adoptionDate || new Date(),
      fee: fee || adoption.pet.adoptionFee || 0,
      microchipTransferred: microchipTransferred || false,
      documentsProvided: documentsProvided || [],
      completedBy: req.user._id
    };

    adoption.status = 'completed';
    await adoption.save();

    // 更新寵物狀態
    adoption.pet.adoptionStatus = 'adopted';
    await adoption.pet.save();

    // 更新使用者的認養歷史
    await User.findByIdAndUpdate(
      adoption.applicant,
      { $push: { adoptionHistory: adoption._id } }
    );

    res.json({
      message: '認養流程完成',
      adoption: adoption
    });

  } catch (error) {
    console.error('完成認養流程錯誤:', error);
    res.status(400).json({
      error: '完成認養流程失敗',
      details: error.message
    });
  }
});

// 取消認養申請（申請人）
router.put('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const adoption = await Adoption.findById(req.params.id)
      .populate('pet')
      .populate('applicant', 'firstName lastName username');

    if (!adoption) {
      return res.status(404).json({
        error: '找不到此認養申請'
      });
    }

    // 檢查權限：支援 populated 或未 populated 的 applicant 欄位
    const applicantId = adoption.applicant && (adoption.applicant._id ? adoption.applicant._id.toString() : adoption.applicant.toString());
    if (!applicantId || applicantId !== req.user._id.toString()) {
      return res.status(403).json({
        error: '沒有權限取消此申請'
      });
    }

    // 檢查狀態
    if (['completed', 'cancelled'].includes(adoption.status)) {
      return res.status(400).json({
        error: '此申請無法取消'
      });
    }

    // 更新狀態
    adoption.status = 'cancelled';
    await adoption.save();

    // 如果寵物狀態是 pending，改回 available
    if (adoption.pet.adoptionStatus === 'pending') {
      adoption.pet.adoptionStatus = 'available';
      await adoption.pet.save();
    }

    // 發送通知給送養者，告知申請人已取消申請
    try {
      const petOwner = await Pet.findById(adoption.pet._id).populate('createdBy', '_id username role');
      if (petOwner && petOwner.createdBy) {
        const applicantName = (adoption.applicant && (adoption.applicant.firstName || adoption.applicant.username))
          ? (adoption.applicant.firstName || adoption.applicant.username)
          : '申請人';

        await Notification.createNotification({
          recipient: petOwner.createdBy._id,
          type: 'adoption_cancelled',
          title: '認養申請已取消',
          content: `${applicantName} 已取消對 ${adoption.pet.name} 的認養申請。`,
          link: `/my-pets-applications?applicationId=${adoption._id}`,
          relatedAdoption: adoption._id,
          relatedPet: adoption.pet._id
        });

        try {
          const ownerUser = await User.findById(petOwner.createdBy._id).select('role');
          if (!ownerUser || ownerUser.role === 'admin') {
            const shelterUsers = await User.find({ role: 'shelter', isActive: true }).select('_id');
            for (const s of shelterUsers) {
              if (String(s._id) === String(petOwner.createdBy._id)) continue;
              await Notification.createNotification({
                recipient: s._id,
                type: 'adoption_cancelled',
                title: '認養申請已取消',
                content: `${applicantName} 已取消對 ${adoption.pet.name} 的認養申請。`,
                link: `/my-pets-applications?applicationId=${adoption._id}`,
                relatedAdoption: adoption._id,
                relatedPet: adoption.pet._id
              });
            }
          }
        } catch (e) {
          console.error('廣播給收容所使用者時發生錯誤:', e);
        }
      }
    } catch (notifError) {
      console.error('取消申請時發送通知失敗:', notifError);
    }

    res.json({
      message: '認養申請已取消',
      adoption: adoption
    });

  } catch (error) {
    console.error('取消認養申請錯誤:', error);
    res.status(400).json({
      error: '取消認養申請失敗',
      details: error.message
    });
  }
});

// 取得認養統計資訊（管理員）
router.get('/admin/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // 只統計屬於管理者帳號所發佈的寵物的申請
    const stats = await Promise.all([
      // 各狀態申請數量（只含 pet.createdBy.role === 'admin'）
      Adoption.aggregate([
        // join pets
        { $lookup: { from: 'pets', localField: 'pet', foreignField: '_id', as: 'pet' } },
        { $unwind: '$pet' },
        // join users (pet creator)
        { $lookup: { from: 'users', localField: 'pet.createdBy', foreignField: '_id', as: 'owner' } },
        { $unwind: '$owner' },
        { $match: { 'owner.role': 'admin' } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),

      // 每月認養完成數量（只含 pet.createdBy.role === 'admin'）
      Adoption.aggregate([
        // join pets + owners
        { $lookup: { from: 'pets', localField: 'pet', foreignField: '_id', as: 'pet' } },
        { $unwind: '$pet' },
        { $lookup: { from: 'users', localField: 'pet.createdBy', foreignField: '_id', as: 'owner' } },
        { $unwind: '$owner' },
        { $match: { status: 'completed', 'owner.role': 'admin' } },
        {
          $group: {
            _id: {
              year: { $year: '$completionInfo.adoptionDate' },
              month: { $month: '$completionInfo.adoptionDate' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': -1, '_id.month': -1 } },
        { $limit: 12 }
      ]),

      // 平均處理時間（只含 pet.createdBy.role === 'admin'）
      Adoption.aggregate([
        { $lookup: { from: 'pets', localField: 'pet', foreignField: '_id', as: 'pet' } },
        { $unwind: '$pet' },
        { $lookup: { from: 'users', localField: 'pet.createdBy', foreignField: '_id', as: 'owner' } },
        { $unwind: '$owner' },
        { $match: { status: { $in: ['approved', 'rejected', 'completed'] }, 'owner.role': 'admin' } },
        {
          $project: {
            processingTime: {
              $divide: [
                { $subtract: ['$reviewDecision.reviewDate', '$createdAt'] },
                1000 * 60 * 60 * 24 // 轉換為天數
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            averageProcessingTime: { $avg: '$processingTime' }
          }
        }
      ])
    ]);

    res.json({
      statusCounts: stats[0],
      monthlyCompletions: stats[1],
      averageProcessingTime: stats[2][0]?.averageProcessingTime || 0
    });

  } catch (error) {
    console.error('取得認養統計錯誤:', error);
    res.status(500).json({
      error: '無法取得認養統計',
      details: error.message
    });
  }
});

// Story 3.5: 新增審核備註
router.post('/:id/notes', authenticateToken, async (req, res) => {
  try {
    const { note } = req.body;

    if (!note || note.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: '備註內容不能為空'
      });
    }

    const adoption = await Adoption.findById(req.params.id)
      .populate('pet')
      .populate('applicant', 'username email');

    if (!adoption) {
      return res.status(404).json({
        success: false,
        error: '找不到此認養申請'
      });
    }

    // 權限檢查：允許收容所、管理員，或該寵物的發布者(pet.createdBy)
    let isPetPublisher = false;
    if (adoption.pet) {
      const pb = adoption.pet.createdBy;
      const pbId = pb && (pb._id ? pb._id.toString() : pb.toString());
      if (pbId && pbId === req.user._id.toString()) isPetPublisher = true;
    }

    if (!(req.user.role === 'shelter' || req.user.role === 'admin' || isPetPublisher)) {
      return res.status(403).json({
        success: false,
        error: '僅收容所人員、管理員或該寵物的發布者可新增審核備註'
      });
    }

    // 若是收容所身分，檢查該收容所是否為該寵物所屬
    if (req.user.role === 'shelter' && adoption.pet.shelter && adoption.pet.shelter.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: '您只能為自己收容所的申請新增備註'
      });
    }

    // 新增備註
    adoption.reviewNotes.push({
      reviewer: req.user._id,
      note: note.trim(),
      createdAt: new Date()
    });

    await adoption.save();

    // 重新 populate 以返回完整資訊
    await adoption.populate('reviewNotes.reviewer', 'username role');

    res.json({
      success: true,
      message: '審核備註已新增',
      reviewNotes: adoption.reviewNotes
    });

  } catch (error) {
    console.error('新增審核備註錯誤:', error);
    res.status(500).json({
      success: false,
      error: '新增審核備註失敗',
      details: error.message
    });
  }
});

// Story 3.5: 審核申請 (核准/拒絕) - 支持送養者、收容所和管理員
router.post('/:id/review', authenticateToken, async (req, res) => {
  try {
    const { decision, reason } = req.body;

    if (!decision || !['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({
        success: false,
        error: '請提供有效的審核決定 (approved 或 rejected)'
      });
    }

    const adoption = await Adoption.findById(req.params.id)
      .populate('pet')
      .populate('applicant', 'username email');

    if (!adoption) {
      return res.status(404).json({
        success: false,
        error: '找不到此認養申請'
      });
    }

    // 🔑 權限檢查:送養者本人、收容所人員或管理員
    const isPetOwner = adoption.pet.createdBy.toString() === req.user._id.toString();
    const isShelter = req.user.role === 'shelter' && adoption.pet.shelter && adoption.pet.shelter.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isPetOwner && !isShelter && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: '您沒有權限審核此申請'
      });
    }

    // 檢查申請狀態
    if (!['pending', 'under-review'].includes(adoption.status)) {
      return res.status(400).json({
        success: false,
        error: '此申請已被審核過'
      });
    }

    // 更新審核決定
    adoption.reviewDecision = {
      decision,
      reviewer: req.user._id,
      reason: reason || '',
      reviewDate: new Date()
    };

    adoption.status = decision;
    await adoption.save();

    // 更新寵物狀態
    if (decision === 'approved') {
      adoption.pet.adoptionStatus = 'pending'; // 等待完成認養流程
      await adoption.pet.save();
    }

    // 發送通知給申請人
    try {
      const notifType = decision === 'approved' ? 'adoption_approved' : 'adoption_rejected';
      // 若被拒絕，確保該寵物回歸可認養清單
      if (decision === 'rejected') {
        try {
          adoption.pet.adoptionStatus = 'available';
          await adoption.pet.save();
        } catch (e) {
          console.error('設定寵物為 available 失敗:', e && e.message);
        }
      }

      await Notification.createNotification({
        recipient: adoption.applicant._id,
        type: notifType,
        title: decision === 'approved' ? '認養申請已核准' : '認養申請未通過',
        content: decision === 'approved'
          ? `您對 ${adoption.pet.name} 的認養申請已被核准！`
          : `很抱歉，您對 ${adoption.pet.name} 的認養申請未通過。${reason ? `原因：${reason}` : ''}`,
        relatedAdoption: adoption._id,
        relatedPet: adoption.pet._id,
        link: `/my-applications?applicationId=${adoption._id}`
      });
    } catch (notifError) {
      console.error('發送通知失敗:', notifError);
    }

    // 當管理者帳號同意認養申請時，同步在聊天室發送系統/通知訊息給申請人
    try {
      if (decision === 'approved' && req.user && req.user.role === 'admin') {
        const msgContent = '您的申請已被同意，請撥空與欲領養動物所在的機構聯絡，進行後續領養所需的步驟。';
        // 建立訊息紀錄（type 使用 'adoption-update'，並關聯 adoption 與 pet）
        await Message.create({
          content: msgContent,
          type: 'adoption-update',
          sender: req.user._id,
          receiver: adoption.applicant._id,
          relatedPet: adoption.pet._id,
          relatedAdoption: adoption._id,
          systemData: {
            eventType: 'adoption-approved',
            metadata: { by: req.user._id }
          }
        });
      }
    } catch (msgError) {
      console.error('建立聊天室訊息失敗:', msgError && msgError.message);
    }

    res.json({
      success: true,
      message: `申請已${decision === 'approved' ? '核准' : '拒絕'}`,
      adoption: {
        _id: adoption._id,
        status: adoption.status,
        reviewDecision: adoption.reviewDecision
      }
    });

  } catch (error) {
    console.error('審核申請錯誤:', error);
    res.status(500).json({
      success: false,
      error: '審核申請失敗',
      details: error.message
    });
  }
});

// Story 3.5: 取得申請詳情 (含所有備註)
router.get('/:id/details', authenticateToken, async (req, res) => {
  try {
    const adoption = await Adoption.findById(req.params.id)
      .select('+rawSubmission +rawSubmissionMeta')
      .populate('pet')
      .populate('applicant', 'username email phone')
      .populate('reviewNotes.reviewer', 'username role')
      .populate('reviewDecision.reviewer', 'username role');

    if (!adoption) {
      return res.status(404).json({
        success: false,
        error: '找不到此認養申請'
      });
    }

    // 權限檢查：申請人本人、該寵物的發布者（pet.createdBy）或管理員
    const isApplicant = adoption.applicant && adoption.applicant._id && adoption.applicant._id.toString() === req.user._id.toString();
    // 支援不同資料結構：部分專案可能使用 pet.createdBy
    let petOwnerId = null;
    if (adoption.pet) {
      if (adoption.pet.createdBy) petOwnerId = adoption.pet.createdBy.toString();
      else if (adoption.pet.createdBy && adoption.pet.createdBy._id) petOwnerId = adoption.pet.createdBy._id.toString();
    }
    const isPetOwner = petOwnerId && petOwnerId === req.user._id.toString();
    const isAdmin = req.user.role === 'admin' || req.user.role === 'volunteer';

    if (!isApplicant && !isPetOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: '您沒有權限查看此申請（需為申請人、該寵物的發布者或管理員）'
      });
    }

    // 如果呼叫者是申請人，隱藏送養者專用的審核備註(reviewNotes)
    let result = adoption;
    if (isApplicant) {
      // 轉成純物件以便安全移除欄位
      result = adoption.toObject ? adoption.toObject() : JSON.parse(JSON.stringify(adoption));
      delete result.reviewNotes;
    }

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('取得申請詳情錯誤:', error);
    res.status(500).json({
      success: false,
      error: '取得申請詳情失敗',
      details: error.message
    });
  }
});

module.exports = router;