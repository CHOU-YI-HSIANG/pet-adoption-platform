const http = require('http');

function getJson(path) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'localhost',
      port: 5000,
      path,
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    };

    const req = http.request(opts, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ statusCode: res.statusCode, body: parsed });
        } catch (err) {
          reject(new Error('Invalid JSON response: ' + err.message + '\nBody:\n' + body));
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.end();
  });
}

(async function main(){
  try {
    console.log('Fetching /api/pets...');
    const list = await getJson('/api/pets');
    if (!list.body || !Array.isArray(list.body.pets) || list.body.pets.length === 0) {
      console.log('NO_PETS');
      return;
    }

    const ids = list.body.pets.slice(0, 20).map(p => p._id);
    console.log('Found', ids.length, 'pets, testing details for each:');

    for (const id of ids) {
      try {
        const r = await getJson(`/api/pets/${id}`);
        if (r.statusCode >= 200 && r.statusCode < 300) {
          console.log(`OK ${id} (200)`);
        } else {
          console.log(`ERR ${id} (status ${r.statusCode}) - ${JSON.stringify(r.body)}`);
        }
      } catch (err) {
        console.log(`ERR ${id} - ${err.message}`);
      }
    }

  } catch (err) {
    console.error('LIST_ERR -', err.message);
    process.exitCode = 2;
  }
})();
