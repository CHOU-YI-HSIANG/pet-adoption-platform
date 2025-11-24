/**
 * Google OAuth 驗證測試
 */

const { validateBody } = require('../middleware/validation');
const { googleAuthSchema } = require('../utils/validators');

describe('Google OAuth Validation', () => {
  let req, res, next;

  beforeEach(() => {
    req = { body: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  describe('Google Token Validation', () => {
    test('應該通過有效的 Google token', () => {
      req.body = {
        token: 'valid-google-token-string'
      };

      const middleware = validateBody(googleAuthSchema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('應該拒絕缺少 token', () => {
      req.body = {};

      const middleware = validateBody(googleAuthSchema);
      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            details: expect.arrayContaining([
              expect.objectContaining({
                field: 'token',
                message: expect.stringContaining('必填')
              })
            ])
          })
        })
      );
    });

    test('應該接受可選的 email, firstName, lastName', () => {
      req.body = {
        token: 'valid-google-token',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe'
      };

      const middleware = validateBody(googleAuthSchema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('應該拒絕無效的 email 格式', () => {
      req.body = {
        token: 'valid-google-token',
        email: 'invalid-email'
      };

      const middleware = validateBody(googleAuthSchema);
      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('應該接受有效的 avatar URI', () => {
      req.body = {
        token: 'valid-google-token',
        avatar: 'https://example.com/avatar.jpg'
      };

      const middleware = validateBody(googleAuthSchema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('應該拒絕無效的 avatar URI', () => {
      req.body = {
        token: 'valid-google-token',
        avatar: 'not-a-valid-uri'
      };

      const middleware = validateBody(googleAuthSchema);
      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
