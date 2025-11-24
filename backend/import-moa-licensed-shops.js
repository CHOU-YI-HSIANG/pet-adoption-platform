require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');

// 簡單 schema 用於匯入/儲存政府「合法特定寵物業名單」(臨時檔案)
const { Schema } = mongoose;
const LicensedShopSchema = new Schema({
  govId: { type: String, required: true, unique: true },
  legalType: String,
  name: { type: String, required: true },
  address: String,
  businessItem: String,
  animalType: String,
  validNumber: String,
  validDate: Date,
  ownerName: String,
  bossName: String,
  rankYear: String,
  rankCode: String,
  rankFlags: [String],
  rankText: String,
  stateFlag: String,
  originalData: Schema.Types.Mixed,
  importedAt: { type: Date, default: Date.now }
});

const LicensedShop = mongoose.model('LicensedShop', LicensedShopSchema);

function parseDate(raw) {
  if (!raw) return null;
  // 嘗試簡單解析，移除中文 AM/PM 標記
  try {
    let s = raw.replace(/上午|下午/g, '').trim();
    // 有時包含多餘字元，直接嘗試 new Date
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) return d;
    return null;
  } catch (e) {
    return null;
  }
}

function mapRecord(rec) {
  return {
    govId: (rec.ID || rec.id || '').toString(),
    legalType: rec.legaltype || null,
    name: rec.legalname || rec.legal_name || null,
    address: rec.legaladdress || null,
    businessItem: rec.busitem || null,
    animalType: rec.animaltype || null,
    validNumber: rec.validnum || null,
    validDate: parseDate(rec.validdate),
    ownerName: rec.own_name || null,
    bossName: rec.bos_name || null,
    rankYear: rec.rank_year || null,
    rankCode: rec.rank_code || null,
    rankFlags: [rec.rank_flag_1 || '', rec.rank_flag_2 || ''].filter(Boolean),
    rankText: rec.rank_text || null,
    stateFlag: rec.state_flag || null,
    originalData: rec
  };
}

async function run() {
  const args = process.argv.slice(2);
  const doRun = args.includes('--run'); // 必須帶 --run 才會寫入 DB
  const top = args.includes('--top') ? parseInt(args[args.indexOf('--top') + 1], 10) || null : null;
  const sample = args.includes('--sample') ? parseInt(args[args.indexOf('--sample') + 1], 10) || null : null;

  console.log('匯入腳本: MOA 合法特定寵物業名單');
  console.log('執行模式:', doRun ? '寫入 (慎重)' : 'dry-run (預設，不寫入)');

  await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('已連線到資料庫');

  try {
    console.log('取得政府資料...');
    const url = 'https://data.moa.gov.tw/Service/OpenData/TransService.aspx';
    const params = { UnitId: 'fNT9RMo8PQRO' };
    if (top) params['$top'] = top;
    const resp = await axios.get(url, { params, timeout: 60000 });
    const rows = resp.data || [];
    console.log('取得筆數:', rows.length);

    let mapped = rows.map(mapRecord);

    // 若有 --sample N，對 mapped 做隨機抽樣（Fisher-Yates shuffle）
    if (sample && Number.isInteger(sample) && sample > 0) {
      if (sample < mapped.length) {
        const shuffled = mapped.slice();
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          const tmp = shuffled[i];
          shuffled[i] = shuffled[j];
          shuffled[j] = tmp;
        }
        mapped = shuffled.slice(0, sample);
      }
      console.log('隨機抽樣筆數:', mapped.length);
    }

    // dry-run: 驗證格式、顯示 sample
    if (!doRun) {
      const missing = mapped.filter(r => !r.govId || !r.name);
      console.log('缺少必要欄位的筆數:', missing.length);
      console.log('\n範例前 10 筆:');
      console.log(JSON.stringify(mapped.slice(0, 10), null, 2));
      console.log('\n提示: 若要真的寫入資料庫，請重新執行此指令並加上 `--run` 參數。');
      await mongoose.connection.close();
      process.exit(0);
    }

    // 真正寫入 DB，使用 upsert 避免重複
    let upserted = 0;
    for (let i = 0; i < mapped.length; i++) {
      const item = mapped[i];
      try {
        await LicensedShop.updateOne({ govId: item.govId }, { $set: item }, { upsert: true });
        upserted++;
        if (upserted % 50 === 0) console.log('已處理', upserted, '筆');
      } catch (err) {
        console.error('寫入失敗 govId=', item.govId, err.message);
      }
    }

    console.log('\n寫入完成，總筆數:', mapped.length, 'upserted:', upserted);
    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('發生錯誤:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

run();
