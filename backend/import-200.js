require("dotenv").config();
const mongoose = require("mongoose");
const axios = require("axios");
const Pet = require("./models/Pet");

const GOV_API_BASE = "https://data.moa.gov.tw/Service/OpenData/TransService.aspx";

function mapSpecies(kind) {
  if (!kind) return "other";
  const lowerKind = kind.toLowerCase();
  if (lowerKind.includes("狗") || lowerKind.includes("犬")) return "dog";
  if (lowerKind.includes("貓")) return "cat";
  return "other";
}

function mapGender(sex) {
  if (!sex) return "unknown";
  if (sex === "M" || sex.includes("公") || sex.includes("雄")) return "male";
  if (sex === "F" || sex.includes("母") || sex.includes("雌")) return "female";
  return "unknown";
}

function mapSize(bodytype) {
  if (!bodytype) return "medium";
  if (bodytype.includes("大")) return "large";
  if (bodytype.includes("小")) return "small";
  return "medium";
}

function parseAge(ageStr) {
  if (!ageStr) return { value: 0, unit: "years" };
  const match = ageStr.match(/(\d+)/);
  if (!match) return { value: 0, unit: "years" };
  const value = parseInt(match[1]);
  if (ageStr.includes("月")) return { value, unit: "months" };
  return { value, unit: "years" };
}

function mapStatus(status) {
  if (status && (status.includes("開放") || status.includes("等待"))) return "available";
  if (status && status.includes("送養中")) return "pending";
  return "available";
}

async function importAnimals() {
  try {
    console.log("連接資料庫...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("已連接到 MongoDB");

    const existingIds = await Pet.find({ "govData.animalId": { "$exists": true } }).select("govData.animalId").lean();
    const existingIdSet = new Set(existingIds.map(p => p.govData && p.govData.animalId));
    console.log("資料庫已有 " + existingIdSet.size + " 筆政府資料");

    let imported = 0;
    let skipped = 0;
    let failed = 0;
    const targetCount = 200;
    let currentSkip = 100;
    const batchSize = 50;

    console.log("開始匯入,目標: " + targetCount + " 筆新資料");

    while (imported < targetCount) {
      console.log("批次處理: skip=" + currentSkip);
      
      const response = await axios.get(GOV_API_BASE, {
        params: {
          UnitId: "QcbUEzN6E6DL",
          "$top": batchSize,
          "$skip": currentSkip
        },
        timeout: 30000
      });

      const animals = Array.isArray(response.data) ? response.data : [];
      console.log("獲取到 " + animals.length + " 筆資料");

      if (animals.length === 0) break;

      for (const animal of animals) {
        if (imported >= targetCount) break;

        const animalId = animal.animal_subid || (animal.animal_id && animal.animal_id.toString());
        
        if (!animalId || existingIdSet.has(animalId)) {
          skipped++;
          continue;
        }

        try {
          const petData = {
            name: animal.animal_subid || "待命名",
            species: mapSpecies(animal.animal_kind),
            breed: animal.animal_kind || "混種",
            age: parseAge(animal.animal_age),
            ageDescription: animal.animal_age || "年齡未知",
            gender: mapGender(animal.animal_sex),
            size: mapSize(animal.animal_bodytype),
            color: animal.animal_colour || "未知",
            description: "收容編號: " + animal.animal_subid + "\n收容所: " + animal.shelter_name + "\n年齡: " + animal.animal_age + "\n毛色: " + animal.animal_colour,
            location: { city: animal.animal_place || "台灣", district: "", address: animal.shelter_address || "" },
            status: mapStatus(animal.animal_status),
            photos: animal.album_file ? [{ url: animal.album_file }] : [],
            healthStatus: {
              vaccinated: false,
              spayed: animal.animal_sterilization === "T",
              microchipped: false
            },
            shelterInfo: {
              intakeDate: new Date(),
              source: "stray",
              location: animal.shelter_name || "公立收容所",
              name: animal.shelter_name || "公立收容所"
            },
            govData: { animalId: animalId, shelterName: animal.shelter_name },
            externalLink: "https://asms.coa.gov.tw/Amlapp/App/Ann.aspx?Id=" + animalId,
            isActive: true
          };

          await Pet.create(petData);
          existingIdSet.add(animalId);
          imported++;
          console.log("[" + imported + "/" + targetCount + "] 已匯入: " + petData.name);

        } catch (error) {
          failed++;
        }
      }

      currentSkip += batchSize;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log("\n匯入完成: 成功 " + imported + ", 跳過 " + skipped + ", 失敗 " + failed);

  } catch (error) {
    console.error("錯誤:", error.message);
  } finally {
    await mongoose.connection.close();
  }
}

importAnimals();
