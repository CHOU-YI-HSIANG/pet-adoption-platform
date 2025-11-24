/**
 * 驗證 Middleware
 * 使用 Joi 進行統一的輸入驗證
 */

const Joi = require('joi');

/**
 * 通用驗證 middleware 工廠函數
 * @param {Object} schema - Joi 驗證 schema
 * @param {string} property - 要驗證的請求屬性 ('body', 'query', 'params')
 * @returns {Function} Express middleware
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false, // 回傳所有錯誤,不只第一個
      stripUnknown: true, // 移除未定義的欄位
      convert: true // 自動型別轉換
    });

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '輸入驗證失敗',
          details
        }
      });
    }

    // 使用驗證後的值替換原始值 (包含型別轉換和預設值)
    req[property] = value;
    next();
  };
};

/**
 * 驗證請求 body
 */
const validateBody = (schema) => validate(schema, 'body');

/**
 * 驗證請求 query
 */
const validateQuery = (schema) => validate(schema, 'query');

/**
 * 驗證請求 params
 */
const validateParams = (schema) => validate(schema, 'params');

module.exports = {
  validate,
  validateBody,
  validateQuery,
  validateParams
};
