// 模擬資料 API 包裝器 - 當後端無法連接時使用
import { mockPets, mockShelterAccount } from './mockData';

// 開發模式標記 - 設為 true 使用模擬資料
const USE_MOCK_DATA = process.env.REACT_APP_USE_MOCK === 'true';

// 模擬延遲 (讓體驗更真實)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 模擬 API 回應
export const mockAPI = {
  // 寵物 API
  pets: {
    getAll: async (filters = {}) => {
      await delay(300);
      let pets = [...mockPets];
      
      // 簡單的篩選邏輯
      if (filters.species) {
        pets = pets.filter(p => p.species === filters.species);
      }
      if (filters.location) {
        pets = pets.filter(p => p.location.includes(filters.location));
      }
      if (filters.size) {
        pets = pets.filter(p => p.size === filters.size);
      }
      
      return { data: { pets, total: pets.length } };
    },
    
    getById: async (id) => {
      await delay(200);
      const pet = mockPets.find(p => p._id === id);
      if (!pet) throw new Error('找不到寵物');
      return { data: pet };
    },
  },
  
  // 認證 API
  auth: {
    login: async (credentials) => {
      await delay(500);
      // 模擬登入驗證
      if (
        credentials.email === mockShelterAccount.email &&
        credentials.password === mockShelterAccount.password
      ) {
        return {
          data: {
            token: 'mock-jwt-token-123456',
            user: {
              _id: 'shelter1',
              email: mockShelterAccount.email,
              name: mockShelterAccount.name,
              role: 'shelter',
              shelterInfo: {
                shelterName: mockShelterAccount.name,
                phone: '02-12345678'
              }
            }
          }
        };
      }
      throw new Error('帳號或密碼錯誤');
    },
    
    register: async (userData) => {
      await delay(500);
      return {
        data: {
          token: 'mock-jwt-token-new-user',
          user: {
            _id: 'user-' + Date.now(),
            ...userData,
            role: userData.role || 'user'
          }
        }
      };
    },
  },
};

// 檢查是否應該使用模擬資料
export const shouldUseMockData = () => {
  return USE_MOCK_DATA || window.localStorage.getItem('useMockData') === 'true';
};

// 切換模擬資料模式 (開發用)
export const toggleMockData = () => {
  const current = shouldUseMockData();
  window.localStorage.setItem('useMockData', (!current).toString());
  window.location.reload();
};
