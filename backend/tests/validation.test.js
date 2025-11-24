/**
 * 驗證 Middleware 測試
 * 測試 Joi 驗證是否正確運作
 */

const { validateBody } = require('../middleware/validation');
const {
  userRegisterSchema,
  userLoginSchema,
  petCreateSchema,
  adoptionCreateSchema
} = require('../utils/validators');

describe('Validation Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = { body: {}, query: {}, params: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  describe('User Registration Validation', () => {
    test('應該通過有效的註冊資料', () => {
      req.body = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'Test123',
        firstName: '測試',
        lastName: '使用者'
      };

      const middleware = validateBody(userRegisterSchema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('應該拒絕無效的 email', () => {
      req.body = {
        username: 'testuser',
        email: 'invalid-email',
        password: 'Test123',
        firstName: '測試',
        lastName: '使用者'
      };

      const middleware = validateBody(userRegisterSchema);
      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: '輸入驗證失敗'
          })
        })
      );
    });

    test('應該拒絕過短的密碼', () => {
      req.body = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'weak',
        firstName: '測試',
        lastName: '使用者'
      };

      const middleware = validateBody(userRegisterSchema);
      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('應該拒絕缺少必填欄位', () => {
      req.body = {
        username: 'testuser',
        email: 'test@example.com'
        // 缺少 password, firstName, lastName
      };

      const middleware = validateBody(userRegisterSchema);
      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('User Login Validation', () => {
    test('應該通過有效的登入資料', () => {
      req.body = {
        email: 'test@example.com',
        password: 'Test123'
      };

      const middleware = validateBody(userLoginSchema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('應該拒絕無效的 email', () => {
      req.body = {
        email: 'not-an-email',
        password: 'Test123'
      };

      const middleware = validateBody(userLoginSchema);
      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('Pet Creation Validation', () => {
    test('應該通過有效的寵物資料', () => {
      req.body = {
        name: 'Buddy',
        species: 'dog',
        breed: '黃金獵犬',
        age: { years: 2, months: 6 },
        gender: 'male',
        size: 'large',
        location: {
          shelter: '愛心收容所',
          city: '台北市'
        },
        images: ['https://example.com/pet1.jpg']
      };

      const middleware = validateBody(petCreateSchema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('應該拒絕無效的物種', () => {
      req.body = {
        name: 'Buddy',
        species: 'dragon', // 無效物種
        age: { years: 2 },
        gender: 'male',
        size: 'large',
        location: {
          shelter: '愛心收容所',
          city: '台北市'
        },
        images: ['https://example.com/pet1.jpg']
      };

      const middleware = validateBody(petCreateSchema);
      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('應該拒絕缺少圖片', () => {
      req.body = {
        name: 'Buddy',
        species: 'dog',
        age: { years: 2 },
        gender: 'male',
        size: 'large',
        location: {
          shelter: '愛心收容所',
          city: '台北市'
        },
        images: [] // 空陣列
      };

      const middleware = validateBody(petCreateSchema);
      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('Adoption Application Validation', () => {
    test('應該通過有效的領養申請資料', () => {
      req.body = {
        petId: '507f1f77bcf86cd799439011',
        reason: '我非常喜歡動物，有足夠的時間和空間照顧寵物。我家有院子，可以讓寵物自由活動。我會定期帶寵物去看獸醫，確保牠們的健康。',
        livingEnvironment: {
          type: 'house',
          hasYard: true,
          otherPets: [],
          familyMembers: 4
        },
        contactInfo: {
          phone: '0912345678',
          lineId: 'mylineid'
        }
      };

      const middleware = validateBody(adoptionCreateSchema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('應該拒絕太短的領養原因', () => {
      req.body = {
        petId: '507f1f77bcf86cd799439011',
        reason: '我想領養', // 太短
        livingEnvironment: {
          type: 'house',
          hasYard: true,
          familyMembers: 4
        },
        contactInfo: {
          phone: '0912345678'
        }
      };

      const middleware = validateBody(adoptionCreateSchema);
      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('應該拒絕無效的手機號碼', () => {
      req.body = {
        petId: '507f1f77bcf86cd799439011',
        reason: '我非常喜歡動物，有足夠的時間和空間照顧寵物。我家有院子，可以讓寵物自由活動。',
        livingEnvironment: {
          type: 'house',
          hasYard: true,
          familyMembers: 4
        },
        contactInfo: {
          phone: '123456' // 無效格式
        }
      };

      const middleware = validateBody(adoptionCreateSchema);
      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('Error Response Format', () => {
    test('應該回傳統一的錯誤格式', () => {
      req.body = {
        email: 'invalid',
        password: '123'
      };

      const middleware = validateBody(userLoginSchema);
      middleware(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: '輸入驗證失敗',
            details: expect.arrayContaining([
              expect.objectContaining({
                field: expect.any(String),
                message: expect.any(String)
              })
            ])
          })
        })
      );
    });
  });
});
