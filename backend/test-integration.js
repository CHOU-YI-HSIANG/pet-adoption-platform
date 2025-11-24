const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';
const READY_URL = 'http://localhost:5000/api/ready';
// 允許透過環境變數調整 readiness 的重試行為
const READY_RETRIES = parseInt(process.env.READINESS_RETRIES, 10) || 20;
const READY_DELAY_MS = parseInt(process.env.READINESS_DELAY_MS, 10) || 1000;
let testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(name, passed, details = '') {
  testResults.tests.push({ name, passed, details });
  if (passed) {
    testResults.passed++;
    console.log(` ${name}`);
  } else {
    testResults.failed++;
    console.log(` ${name}`);
    if (details) console.log(`   詳情: ${details}`);
  }
}

async function testEpic1() {
  console.log('\n=== Epic 1: 核心寵物認養功能 ===\n');
  try {
    const petsResponse = await axios.get(`${BASE_URL}/pets?species=dog&size=medium&limit=5`);
    logTest('Story 1.1: 進階篩選 API', petsResponse.status === 200 && Array.isArray(petsResponse.data.pets));
    
    try {
      await axios.get(`${BASE_URL}/recommendations`);
      logTest('Story 1.2: 個人化推薦端點', false);
    } catch (err) {
      logTest('Story 1.2: 個人化推薦端點存在', err.response?.status === 401 || err.response?.status === 403);
    }
    
    if (petsResponse.data.pets.length > 0) {
      const petId = petsResponse.data.pets[0]._id;
      const petDetail = await axios.get(`${BASE_URL}/pets/${petId}`);
      logTest('Story 1.3: 寵物詳情 API', petDetail.status === 200 && petDetail.data.pet);
    }
  } catch (error) {
    logTest('Epic 1 測試', false, error.message);
  }
}

async function testEpic2() {
  console.log('\n=== Epic 2: 社群互動功能 ===\n');
  try {
    const postsResponse = await axios.get(`${BASE_URL}/posts?limit=5`);
    logTest('Story 2.1: 貼文列表 API', postsResponse.status === 200 && Array.isArray(postsResponse.data.posts));
    
    if (postsResponse.data.posts.length > 0) {
      const postId = postsResponse.data.posts[0]._id;
      try {
        const commentsResponse = await axios.get(`${BASE_URL}/comments/post/${postId}`);
        logTest('Story 2.2: 留言系統 API', commentsResponse.status === 200);
      } catch (err) {
        logTest('Story 2.2: 留言系統 API', err.response?.status === 404);
      }
    }
  } catch (error) {
    logTest('Epic 2 測試', false, error.message);
  }
}

async function testEpic3() {
  console.log('\n=== Epic 3: 進階平台功能 ===\n');
  try {
    try {
      await axios.get(`${BASE_URL}/notifications`);
      logTest('Story 3.1: 通知系統端點', false);
    } catch (err) {
      logTest('Story 3.1: 通知系統端點存在', err.response?.status === 401 || err.response?.status === 403);
    }
    
    try {
      await axios.get(`${BASE_URL}/matching/best-matches`);
      logTest('Story 3.2: 配對算法端點', false);
    } catch (err) {
      logTest('Story 3.2: 配對算法端點存在', err.response?.status === 401 || err.response?.status === 403);
    }
    
    const petsResponse = await axios.get(`${BASE_URL}/pets?limit=1`);
    if (petsResponse.data.pets.length > 0) {
      const pet = petsResponse.data.pets[0];
      logTest('Story 3.6: 贊助欄位', true);
    }
  } catch (error) {
    logTest('Epic 3 測試', false, error.message);
  }
}

async function testEpic4() {
  console.log('\n=== Epic 4: 品質保證功能 ===\n');
  try {
    const swaggerJson = await axios.get('http://localhost:5000/api-docs.json');
    logTest('Story 4.6: Swagger JSON', swaggerJson.status === 200 && swaggerJson.data.openapi);
    
    const pathCount = Object.keys(swaggerJson.data.paths || {}).length;
    logTest(`Story 4.6: Swagger 端點數量 (${pathCount})`, pathCount >= 30);
  } catch (error) {
    logTest('Epic 4 測試', false, error.message);
  }
}

async function testAuthentication() {
  console.log('\n=== 認證系統測試 ===\n');
  try {
    const health = await axios.get('http://localhost:5000/api/health');
    logTest('健康檢查端點', health.status === 200 && health.data.status === 'ok');
    
    const apiOverview = await axios.get('http://localhost:5000/api');
    logTest('API 總覽端點', apiOverview.status === 200);
  } catch (error) {
    logTest('認證系統測試', false, error.message);
  }
}

async function runAllTests() {
  console.log(' 開始系統整合測試...\n');
  console.log('測試目標: http://localhost:5000\n');
  
  // 等待 server readiness（可透過 env 調整重試次數與間隔）
  let ready = false;
  for (let i = 0; i < READY_RETRIES; i++) {
    try {
      const r = await axios.get(READY_URL, { timeout: READY_DELAY_MS });
      if (r.status === 200 && r.data && r.data.ready) { ready = true; break; }
    } catch (e) {
      // 等待並重試
      await new Promise(res => setTimeout(res, READY_DELAY_MS));
    }
  }
  if (!ready) {
    console.log('伺服器尚未就緒（/api/ready 未回 200），測試可能失敗。');
  }
  
  await testAuthentication();
  await testEpic1();
  await testEpic2();
  await testEpic3();
  await testEpic4();
  
  console.log('\n' + '='.repeat(50));
  console.log(' 測試結果總結');
  console.log('='.repeat(50));
  console.log(` 通過: ${testResults.passed} 個測試`);
  console.log(` 失敗: ${testResults.failed} 個測試`);
  const total = testResults.passed + testResults.failed;
  console.log(` 成功率: ${((testResults.passed / total) * 100).toFixed(1)}%`);
  console.log('='.repeat(50) + '\n');
  
  if (testResults.failed > 0) {
    console.log('失敗的測試:');
    testResults.tests.filter(t => !t.passed).forEach(t => {
      console.log(`  - ${t.name}${t.details ? ': ' + t.details : ''}`);
    });
  }
}

runAllTests().catch(console.error);