#  Google 快速登入 - 快速參考

## 立即開始

### 1 設置環境變數

**後端** (ackend/.env):
\\\env
GOOGLE_CLIENT_ID=你的-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=你的-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
\\\

**前端** (rontend/.env):
\\\env
REACT_APP_GOOGLE_CLIENT_ID=你的-client-id.apps.googleusercontent.com
\\\

### 2 取得 Google 憑證

1. 訪問 [Google Cloud Console](https://console.cloud.google.com/)
2. 建立 OAuth 2.0 用戶端 ID
3. 設定授權來源: http://localhost:3000
4. 設定重定向 URI: http://localhost:5000/api/auth/google/callback

### 3 測試

\\\ash
# 檢查配置
check-google-login.bat

# 啟動服務
npm start

# 訪問
http://localhost:3000/login
\\\

##  完整文件

- **設置指南**: GOOGLE_LOGIN_SETUP.md
- **實現摘要**: GOOGLE_LOGIN_IMPLEMENTATION.md
- **後端 API**: ackend/GOOGLE_AUTH_GUIDE.md

##  功能特色

-  Google One Tap 快速登入
-  自動帳號綁定
-  安全 Token 驗證
-  美觀的登入按鈕
-  無縫使用者體驗

##  使用方式

在任何地方使用 Google 登入按鈕：

\\\jsx
import GoogleLoginButton from '../components/GoogleLoginButton';

<GoogleLoginButton 
  onSuccess={(result) => console.log('成功!', result)}
  onError={(error) => console.error('失敗!', error)}
/>
\\\

##  需要幫助？

查看 GOOGLE_LOGIN_SETUP.md 中的常見問題章節。
