# UI 元件庫

這是寵物認養平台的可重用 UI 元件庫，包含 20 個精心設計的元件。

## 📦 安裝與使用

```javascript
// 從 ui 資料夾匯入元件
import { Button, Input, Card } from './components/ui';

// 或單獨匯入
import Button from './components/ui/Button';
```

## 🎨 基礎元件 (14 個)

### Button - 按鈕

多種樣式和尺寸的按鈕元件。

```javascript
<Button variant="primary" size="md" onClick={handleClick}>
  點擊我
</Button>
```

**Props:**
- `variant`: 'primary' | 'secondary' | 'outline' | 'danger' | 'success' | 'ghost'
- `size`: 'sm' | 'md' | 'lg'
- `loading`: boolean - 顯示載入狀態
- `fullWidth`: boolean - 全寬按鈕
- `disabled`: boolean

### Input - 輸入框

支援標籤、錯誤訊息和輔助文字的輸入框。

```javascript
<Input
  label="使用者名稱"
  error="此欄位必填"
  helperText="請輸入您的使用者名稱"
  fullWidth
/>
```

**Props:**
- `label`: string - 標籤文字
- `error`: string - 錯誤訊息
- `helperText`: string - 輔助文字
- `fullWidth`: boolean

### Textarea - 文字區域

多行文字輸入框。

```javascript
<Textarea
  label="描述"
  rows={4}
  fullWidth
/>
```

**Props:**
- `label`: string
- `error`: string
- `helperText`: string
- `rows`: number - 預設 4
- `fullWidth`: boolean

### Select - 下拉選單

支援選項列表的下拉選單。

```javascript
<Select
  label="選擇品種"
  options={[
    { value: 'dog', label: '狗' },
    { value: 'cat', label: '貓' }
  ]}
  fullWidth
/>
```

**Props:**
- `options`: Array<{value: string, label: string}>
- `label`: string
- `error`: string
- `fullWidth`: boolean

### Checkbox - 核取方塊

```javascript
<Checkbox label="我同意服務條款" />
```

**Props:**
- `label`: string
- `error`: string
- `helperText`: string

### Radio - 單選按鈕

```javascript
<Radio label="選項一" name="group" value="1" />
```

**Props:**
- `label`: string
- `error`: string
- `helperText`: string

### DatePicker - 日期選擇器

```javascript
<DatePicker label="選擇日期" fullWidth />
```

**Props:**
- `label`: string
- `error`: string
- `fullWidth`: boolean

### FileUpload - 檔案上傳

視覺化的檔案上傳元件。

```javascript
<FileUpload
  label="上傳照片"
  accept="image/*"
  multiple
  onChange={handleFileChange}
/>
```

**Props:**
- `label`: string
- `accept`: string - 接受的檔案類型
- `multiple`: boolean - 是否允許多檔案
- `onChange`: function

### Card - 卡片

容器元件，支援標題和頁尾。

```javascript
<Card
  title="卡片標題"
  footer={<Button>動作</Button>}
  shadow="md"
  padding="md"
>
  卡片內容
</Card>
```

**Props:**
- `title`: string
- `footer`: ReactNode
- `shadow`: 'none' | 'sm' | 'md' | 'lg' | 'xl'
- `padding`: 'none' | 'sm' | 'md' | 'lg'

### Modal - 彈出視窗

可控制顯示/隱藏的彈出視窗。

```javascript
<Modal
  isOpen={isOpen}
  onClose={handleClose}
  title="標題"
  size="md"
  footer={<Button>確認</Button>}
>
  內容
</Modal>
```

**Props:**
- `isOpen`: boolean (必填)
- `onClose`: function (必填)
- `title`: string
- `size`: 'sm' | 'md' | 'lg' | 'xl'
- `footer`: ReactNode

### Toast - 通知訊息

自動消失的通知訊息元件。

```javascript
<Toast
  message="操作成功！"
  type="success"
  duration={3000}
  onClose={handleClose}
/>
```

**Props:**
- `message`: string (必填)
- `type`: 'success' | 'error' | 'warning' | 'info'
- `duration`: number - 毫秒，0 表示不自動關閉
- `onClose`: function

### Tabs - 分頁標籤

標籤式內容切換元件。

```javascript
<Tabs
  tabs={[
    { label: '標籤一', content: <div>內容一</div> },
    { label: '標籤二', content: <div>內容二</div> }
  ]}
  defaultTab={0}
  onChange={handleTabChange}
/>
```

**Props:**
- `tabs`: Array<{label: string, content: ReactNode}> (必填)
- `defaultTab`: number - 預設選中的標籤索引
- `onChange`: function

### Pagination - 分頁

分頁導航元件。

```javascript
<Pagination
  currentPage={1}
  totalPages={10}
  onPageChange={handlePageChange}
/>
```

**Props:**
- `currentPage`: number (必填)
- `totalPages`: number (必填)
- `onPageChange`: function (必填)

### Badge - 徽章

小型標籤元件。

```javascript
<Badge variant="success" size="md">已完成</Badge>
```

**Props:**
- `variant`: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'
- `size`: 'sm' | 'md' | 'lg'

### LoadingSpinner - 載入動畫

旋轉載入指示器。

```javascript
<LoadingSpinner size="md" color="orange" />
```

**Props:**
- `size`: 'sm' | 'md' | 'lg' | 'xl'
- `color`: 'orange' | 'gray' | 'white' | 'blue'

### Skeleton - 骨架屏

載入佔位元件。

```javascript
<Skeleton variant="text" width="100%" height="1rem" />
<Skeleton variant="circle" width="40px" height="40px" />
<Skeleton variant="rect" width="100%" height="200px" />
```

**Props:**
- `variant`: 'text' | 'circle' | 'rect'
- `width`: string
- `height`: string

## 🏢 業務元件 (6 個)

### PetCard - 寵物卡片

顯示寵物資訊的卡片元件。

```javascript
<PetCard
  pet={{
    _id: '123',
    name: '小白',
    breed: '柴犬',
    age: '2歲',
    gender: 'male',
    status: 'available',
    images: ['/path/to/image.jpg'],
    description: '可愛的小狗'
  }}
/>
```

**Props:**
- `pet`: object (必填) - 寵物資料物件
- `className`: string

### PostCard - 貼文卡片

顯示社群貼文的卡片元件。

```javascript
<PostCard
  post={{
    _id: '123',
    title: '貼文標題',
    content: '貼文內容...',
    author: { username: 'user1', avatar: '/avatar.jpg' },
    images: ['/image1.jpg'],
    likes: [],
    comments: [],
    createdAt: '2024-01-01'
  }}
/>
```

**Props:**
- `post`: object (必填) - 貼文資料物件
- `className`: string

### CommentItem - 留言項目

單一留言顯示元件。

```javascript
<CommentItem
  comment={{
    _id: '123',
    content: '留言內容',
    author: { _id: 'user1', username: 'User', avatar: '/avatar.jpg' },
    createdAt: '2024-01-01'
  }}
  currentUserId="user1"
  onDelete={handleDelete}
/>
```

**Props:**
- `comment`: object (必填) - 留言資料物件
- `currentUserId`: string - 當前使用者 ID
- `onDelete`: function - 刪除留言的回調

### UserAvatar - 使用者頭像

顯示使用者頭像或首字母的元件。

```javascript
<UserAvatar
  user={{ username: 'John', avatar: '/avatar.jpg' }}
  size="md"
/>
```

**Props:**
- `user`: object - 使用者資料 (username, avatar)
- `size`: 'sm' | 'md' | 'lg' | 'xl'

## 🎯 設計原則

1. **一致性**: 所有元件使用 Tailwind CSS，保持視覺風格統一
2. **可重用性**: 透過 props 提供靈活的配置選項
3. **類型安全**: 所有元件都有完整的 PropTypes 定義
4. **響應式**: 元件支援不同螢幕尺寸
5. **可訪問性**: 考慮鍵盤導航和螢幕閱讀器

## 📝 開發指南

### 新增元件

1. 在 `components/ui/` 資料夾建立新元件檔案
2. 使用 Tailwind CSS 進行樣式設計
3. 添加完整的 PropTypes 定義
4. 在 `index.js` 中匯出元件
5. 更新此 README.md

### 樣式規範

- 使用 Tailwind CSS utility classes
- 主色調: orange-500
- 統一使用 transition-colors 或 transition-all
- Focus 狀態: focus:ring-2 focus:ring-orange-500
- Hover 效果: hover:opacity-75 或 hover:bg-xxx

### PropTypes 範例

```javascript
import PropTypes from 'prop-types';

ComponentName.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  variant: PropTypes.oneOf(['option1', 'option2']),
  onClick: PropTypes.func,
};
```

## 🔧 維護

- 定期檢查元件的可用性和一致性
- 確保所有元件都有適當的錯誤處理
- 保持文件更新
- 考慮添加單元測試

## 📊 元件清單

### 已完成 (20/20) ✅

**基礎元件 (14):**
- [x] Button
- [x] Input
- [x] Textarea
- [x] Select
- [x] Checkbox
- [x] Radio
- [x] DatePicker
- [x] FileUpload
- [x] Card
- [x] Modal
- [x] Toast
- [x] Tabs
- [x] Pagination
- [x] Badge

**工具元件 (2):**
- [x] LoadingSpinner
- [x] Skeleton

**業務元件 (4):**
- [x] PetCard
- [x] PostCard
- [x] CommentItem
- [x] UserAvatar

---

**最後更新**: 2024-01-09  
**版本**: 1.0.0
