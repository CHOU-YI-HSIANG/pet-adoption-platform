require('dotenv').config();
const mongoose = require('mongoose');
(async ()=>{
  try{
    await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser:true, useUnifiedTopology:true });
    const docs = await mongoose.connection.db.collection('licensedshops').find({}).limit(20).toArray();
    function pad(n){ return n.toString().padStart(2,'0'); }
    function extractDatePart(raw){
      if(raw === undefined || raw === null) return '';
      try{
        if(raw instanceof Date) return raw.toISOString().split('T')[0];
        if(typeof raw === 'number'){ const d=new Date(raw); return isNaN(d.getTime())?'':d.toISOString().split('T')[0]; }
        if(typeof raw === 'string'){
          const s = raw.trim();
          const d1 = new Date(s);
          if(!isNaN(d1.getTime())) return d1.toISOString().split('T')[0];
          let m = s.match(/(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
          if(m) return m[1]+'-'+pad(m[2])+'-'+pad(m[3]);
          m = s.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
          if(m) return m[3]+'-'+pad(m[1])+'-'+pad(m[2]);
          m = s.match(/(\d{4})(\d{2})(\d{2})/);
          if(m) return m[1]+'-'+m[2]+'-'+m[3];
          return '';
        }
      }catch(e){ return ''; }
      return '';
    }
    const mapped = docs.map(s=>({
      govId: s.govId,
      name: s.name,
      validNumber: s.validNumber,
      original_validdate: s.originalData && s.originalData.validdate,
      parsed: extractDatePart(s.originalData && s.originalData.validdate) || extractDatePart(s.validDate) || extractDatePart(s.importedAt)
    }));
    console.log(JSON.stringify(mapped, null, 2));
    await mongoose.disconnect();
  }catch(e){
    console.error('err', e && e.message);
    process.exit(1);
  }
})();
