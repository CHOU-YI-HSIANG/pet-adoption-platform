# Google OAuth 登入整合指南

## 📋 後端已實作功能

### 1. Google OAuth 2.0 Flow (Redirect 方式)

**啟動登入:**
```
GET /api/auth/google
```
- 重定向使用者到 Google 登入頁面
- 使用者授權後會回到 callback URL

**處理回呼:**
```
GET /api/auth/google/callback
```
- 接收 Google 的授權碼
- 自動建立或綁定使用者帳號
- 重定向到前端並帶上 JWT token

### 2. Google One Tap / Sign-In with Google (推薦)

**驗證 Google Token:**
```
POST /api/auth/google/verify
Content-Type: application/json

{
  "token": "google_id_token_here"
}
```

**成功回應:**
```json
{
  "message": "Google 登入成功",
  "token": "jwt_token_here",
  "user": {
    "_id": "...",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "avatar_url": "https://...",
    "role": "user"
  }
}
```

**錯誤回應:**
```json
{
  "error": "Google 驗證失敗",
  "details": "error message"
}
```

## 🔧 環境設定

### 1. 取得 Google OAuth 憑證

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 建立新專案或選擇現有專案
3. 啟用 **Google+ API**
4. 前往「憑證」頁面
5. 建立「OAuth 2.0 用戶端 ID」
6. 設定授權的重定向 URI:
   - 開發環境: `http://localhost:5000/api/auth/google/callback`
   - 生產環境: `https://yourdomain.com/api/auth/google/callback`

### 2. 設定環境變數 (.env)

```env
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# JWT & Session
JWT_SECRET=your-jwt-secret-key
SESSION_SECRET=your-session-secret-key

# Frontend
FRONTEND_URL=http://localhost:3000
```

## 💻 前端整合

### 方法 1: Google One Tap (推薦)

**安裝 Google Identity Services:**
```html
<!-- 在 public/index.html 添加 -->
<script src="https://accounts.google.com/gsi/client" async defer></script>
```

**React 元件範例:**
```jsx
import { useEffect } from 'react';
import axios from 'axios';

function GoogleLogin() {
  useEffect(() => {
    // 初始化 Google One Tap
    window.google.accounts.id.initialize({
      client_id: 'YOUR_GOOGLE_CLIENT_ID',
      callback: handleCredentialResponse
    });

    // 顯示 One Tap 提示
    window.google.accounts.id.prompt();

    // 或顯示按鈕
    window.google.accounts.id.renderButton(
      document.getElementById('google-signin-button'),
      {
        theme: 'outline',
        size: 'large',
        text: '使用 Google 登入',
        locale: 'zh_TW'
      }
    );
  }, []);

  const handleCredentialResponse = async (response) => {
    try {
      const res = await axios.post('http://localhost:5000/api/auth/google/verify', {
        token: response.credential
      });

      // 儲存 JWT token
      localStorage.setItem('token', res.data.token);
      
      // 儲存使用者資訊
      localStorage.setItem('user', JSON.stringify(res.data.user));
      
      // 重定向到首頁
      window.location.href = '/';
      
    } catch (error) {
      console.error('Google 登入失敗:', error);
      alert('Google 登入失敗,請稍後再試');
    }
  };

  return (
    <div>
      <h2>登入</h2>
      <div id="google-signin-button"></div>
    </div>
  );
}

export default GoogleLogin;
```

### 方法 2: 傳統 OAuth Flow

**React 元件範例:**
```jsx
function GoogleLogin() {
  const handleGoogleLogin = () => {
    // 重定向到後端的 Google OAuth 端點
    window.location.href = 'http://localhost:5000/api/auth/google';
  };

  return (
    <button onClick={handleGoogleLogin}>
      使用 Google 登入
    </button>
  );
}

// 在 /auth/callback 路由處理 token
function AuthCallback() {
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token) {
      localStorage.setItem('token', token);
      // 取得使用者資訊
      fetchUserInfo(token);
    }
  }, []);

  return <div>處理登入中...</div>;
}
```

## 🔒 安全性說明

1. **Token 驗證**: 所有 Google token 都會在後端使用 `google-auth-library` 驗證
2. **自動帳號綁定**: 如果 email 已存在,會自動綁定 Google 帳號
3. **JWT Token**: 登入成功後返回 JWT token,有效期 7 天
4. **Session**: 使用 express-session 管理 OAuth flow
5. **HTTPS**: 生產環境必須使用 HTTPS

## 🧪 測試

執行 Google OAuth 驗證測試:
```bash
npm test -- google-auth.test.js
```

## 📝 API 端點總覽

| 方法 | 端點 | 說明 |
|------|------|------|
| GET | `/api/auth/google` | 啟動 Google OAuth 登入 |
| GET | `/api/auth/google/callback` | OAuth 回呼端點 |
| POST | `/api/auth/google/verify` | 驗證 Google One Tap token |

## ⚠️ 常見問題

### 1. "redirect_uri_mismatch" 錯誤
- 確認 Google Console 中的重定向 URI 與 `.env` 中的 `GOOGLE_CALLBACK_URL` 一致

### 2. "invalid_client" 錯誤
- 檢查 `GOOGLE_CLIENT_ID` 和 `GOOGLE_CLIENT_SECRET` 是否正確

### 3. 使用者資料不完整
- 確認在 Google Console 中請求了 `profile` 和 `email` 權限

### 4. 前端無法接收 token
- 檢查 CORS 設定
- 確認 `FRONTEND_URL` 環境變數正確

## 🎯 下一步

- [ ] 添加更多 OAuth 提供者 (Facebook, LINE 等)
- [ ] 實作帳號解除綁定功能
- [ ] 添加 Google 登入的 E2E 測試
- [ ] 實作 Remember Me 功能
