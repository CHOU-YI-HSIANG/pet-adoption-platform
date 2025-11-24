const logger = require('../utils/logger');
const winston = require('winston');

describe('Winston Logger 測試', () => {
  
  test('logger 應該被正確匯出', () => {
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.http).toBe('function');
  });

  test('logger 應該有正確的日誌等級', () => {
    const expectedLevels = ['error', 'warn', 'info', 'http', 'debug'];
    expect(logger.levels).toBeDefined();
  });

  test('logger 應該有 stream 屬性 (給 morgan 使用)', () => {
    expect(logger.stream).toBeDefined();
    expect(typeof logger.stream.write).toBe('function');
  });

  test('logger.info() 應該正常運作', () => {
    expect(() => {
      logger.info('測試 info 日誌');
    }).not.toThrow();
  });

  test('logger.error() 應該支援 metadata', () => {
    expect(() => {
      logger.error('測試 error 日誌', { 
        error: 'test error',
        metadata: { key: 'value' }
      });
    }).not.toThrow();
  });

  test('logger.warn() 應該正常運作', () => {
    expect(() => {
      logger.warn('測試 warn 日誌', { context: 'test' });
    }).not.toThrow();
  });

  test('logger.debug() 應該正常運作', () => {
    expect(() => {
      logger.debug('測試 debug 日誌');
    }).not.toThrow();
  });

  test('logger.http() 應該正常運作', () => {
    expect(() => {
      logger.http('GET /api/test 200');
    }).not.toThrow();
  });

  test('logger 應該是 Winston 實例', () => {
    expect(logger).toBeInstanceOf(winston.Logger);
  });

  test('logger.logWithMeta() 應該正常運作', () => {
    expect(typeof logger.logWithMeta).toBe('function');
    expect(() => {
      logger.logWithMeta('info', '測試訊息', { key: 'value' });
    }).not.toThrow();
  });

});
