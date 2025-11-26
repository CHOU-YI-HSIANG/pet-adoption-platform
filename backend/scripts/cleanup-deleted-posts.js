/**
 * 定期清理已軟刪除的貼文腳本
 * 
 * 功能：
 * - 永久刪除超過指定天數的軟刪除貼文
 * - 同時刪除相關留言
 * - 可手動執行或設定為定期任務
 * 
 * 使用方式：
 * node scripts/cleanup-deleted-posts.js [--days=90] [--dry-run]
 * 
 * 參數：
 * --days=N    清理 N 天前刪除的貼文（預設 90 天）
 * --dry-run   模擬執行，不實際刪除（用於測試）
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Post = require('../models/Post');
const Comment = require('../models/Comment');

// 解析命令列參數
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    days: 90,
    dryRun: false
  };

  args.forEach(arg => {
    if (arg.startsWith('--days=')) {
      config.days = parseInt(arg.split('=')[1]) || 90;
    }
    if (arg === '--dry-run') {
      config.dryRun = true;
    }
  });

  return config;
}

async function cleanupDeletedPosts() {
  try {
    console.log('🧹 ===== 開始清理已刪除的貼文 =====\n');

    const config = parseArgs();
    console.log(`⚙️  設定：`);
    console.log(`   - 清理天數：${config.days} 天前`);
    console.log(`   - 模擬執行：${config.dryRun ? '是（不會實際刪除）' : '否'}`);
    console.log();

    // 連接資料庫
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ 已連接到資料庫\n');

    // 計算截止日期
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - config.days);
    console.log(`📅 清理截止日期：${cutoffDate.toISOString().split('T')[0]}\n`);

    // 查詢要刪除的貼文
    const postsToDelete = await Post.find({
      status: 'deleted',
      deletedAt: { $lt: cutoffDate, $ne: null }
    }).select('_id title author deletedAt');

    console.log(`📊 找到 ${postsToDelete.length} 篇符合條件的貼文\n`);

    if (postsToDelete.length === 0) {
      console.log('✨ 沒有需要清理的貼文');
      await mongoose.connection.close();
      return;
    }

    // 顯示前 10 篇要刪除的貼文
    console.log('📋 即將刪除的貼文（前 10 篇）：');
    postsToDelete.slice(0, 10).forEach((post, index) => {
      const deleteDate = post.deletedAt.toISOString().split('T')[0];
      const title = post.title.substring(0, 50);
      console.log(`   ${index + 1}. [${deleteDate}] ${title}`);
    });
    if (postsToDelete.length > 10) {
      console.log(`   ... 還有 ${postsToDelete.length - 10} 篇\n`);
    } else {
      console.log();
    }

    if (config.dryRun) {
      console.log('🔍 模擬執行模式，不會實際刪除資料');
      await mongoose.connection.close();
      return;
    }

    // 確認執行
    console.log('⚠️  即將永久刪除這些貼文及相關留言！');
    console.log('   此操作無法復原！');
    console.log();

    // 取得貼文 ID
    const postIds = postsToDelete.map(p => p._id);

    // 刪除相關留言
    console.log('🗑️  正在刪除相關留言...');
    const commentsResult = await Comment.deleteMany({
      post: { $in: postIds }
    });
    console.log(`✅ 已刪除 ${commentsResult.deletedCount} 則留言\n`);

    // 刪除貼文
    console.log('🗑️  正在永久刪除貼文...');
    const postsResult = await Post.deleteMany({
      _id: { $in: postIds }
    });
    console.log(`✅ 已永久刪除 ${postsResult.deletedCount} 篇貼文\n`);

    // 顯示統計
    console.log('📈 清理統計：');
    console.log(`   - 貼文：${postsResult.deletedCount} 篇`);
    console.log(`   - 留言：${commentsResult.deletedCount} 則`);
    console.log(`   - 清理天數：${config.days} 天前`);
    console.log();

    console.log('✅ ===== 清理完成 =====');

  } catch (error) {
    console.error('❌ 清理過程發生錯誤：', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 資料庫連接已關閉');
  }
}

// 執行清理
cleanupDeletedPosts();
