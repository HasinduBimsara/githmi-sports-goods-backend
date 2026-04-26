const fs = require('fs');
const dotenv = require('dotenv');
const { spawnSync } = require('child_process');

// Parse .env
const envConfig = dotenv.parse(fs.readFileSync('.env'));

function addEnv(key, value) {
  console.log(`Adding ${key}...`);
  // Overwrite if exists
  spawnSync('npx', ['vercel', 'env', 'rm', key, 'production,preview,development', '-y'], { encoding: 'utf-8', shell: true });
  
  const result = spawnSync('npx', ['vercel', 'env', 'add', key, 'production,preview,development'], {
    input: value,
    encoding: 'utf-8',
    shell: true
  });
  
  if (result.error) {
    console.error(`Error adding ${key}:`, result.error);
  } else {
    console.log(result.stdout);
    if(result.stderr) console.error(result.stderr);
  }
}

for (const [key, value] of Object.entries(envConfig)) {
  addEnv(key, value);
}

// Add FIREBASE_SERVICE_ACCOUNT
if (fs.existsSync('service-account.json')) {
    const serviceAccount = fs.readFileSync('service-account.json', 'utf-8');
    const compactServiceAccount = JSON.stringify(JSON.parse(serviceAccount));
    addEnv('FIREBASE_SERVICE_ACCOUNT', compactServiceAccount);
} else {
    console.log('service-account.json not found!');
}

console.log("Done adding env variables!");
