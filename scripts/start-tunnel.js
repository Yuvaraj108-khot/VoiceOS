const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const twilio = require('twilio');

dotenv.config();

let currentSshProcess = null;
let currentTunnelUrl = '';
let isRestarting = false;

async function updateTwilioAndEnv(url) {
  currentTunnelUrl = url;
  console.log(`\n🎉 Active Public Tunnel URL: ${currentTunnelUrl}`);

  // 1. Update .env file
  try {
    const envPath = path.join(__dirname, '..', '.env');
    let envContent = fs.readFileSync(envPath, 'utf8');
    if (envContent.includes('TWILIO_WEBHOOK_BASE_URL=')) {
      envContent = envContent.replace(/TWILIO_WEBHOOK_BASE_URL=[^\r\n]*/, `TWILIO_WEBHOOK_BASE_URL=${currentTunnelUrl}`);
    } else {
      envContent += `\nTWILIO_WEBHOOK_BASE_URL=${currentTunnelUrl}\n`;
    }
    fs.writeFileSync(envPath, envContent);
    process.env.TWILIO_WEBHOOK_BASE_URL = currentTunnelUrl;
    console.log(`✅ Updated .env with TWILIO_WEBHOOK_BASE_URL=${currentTunnelUrl}`);
  } catch (err) {
    console.error('⚠️ Failed to update .env:', err.message);
  }

  // 2. Update Twilio Phone Number Webhook
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken) {
    console.warn('⚠️ Missing Twilio credentials, skipping Twilio phone webhook update.');
    return;
  }

  try {
    const client = twilio(accountSid, authToken);
    const numbers = await client.incomingPhoneNumbers.list();
    const target = numbers.find(n => n.phoneNumber === phoneNumber) || numbers[0];
    if (!target) {
      console.warn(`⚠️ No Twilio phone number found for ${phoneNumber}`);
      return;
    }

    const voiceUrl = `${currentTunnelUrl}/webhooks/twilio/voice`;
    const statusCallback = `${currentTunnelUrl}/webhooks/twilio/status`;

    const updated = await client.incomingPhoneNumbers(target.sid).update({
      voiceUrl,
      voiceMethod: 'POST',
      statusCallback,
      statusCallbackMethod: 'POST',
    });

    console.log(`✅ Successfully updated Twilio phone number ${updated.phoneNumber} (${updated.sid}):`);
    console.log(`   Voice URL: ${updated.voiceUrl}`);
    console.log(`   Status Callback: ${updated.statusCallback}`);
    console.log('\n🟢 CALLS WILL NOW SUCCESSFULLY CONNECT TO YOUR AI ASSISTANT!');
  } catch (err) {
    console.error('❌ Failed to update Twilio webhook:', err.message);
  }
}

function startTunnel() {
  isRestarting = false;
  currentTunnelUrl = '';
  const port = parseInt(process.env.PORT || '4009', 10);
  console.log(`🚀 Starting persistent Serveo SSH tunnel for port ${port}...`);

  const ssh = spawn('ssh', [
    '-o', 'StrictHostKeyChecking=no',
    '-o', 'ServerAliveInterval=20',
    '-o', 'ServerAliveCountMax=5',
    '-R', `80:localhost:${port}`,
    'serveo.net'
  ], {
    stdio: ['ignore', 'pipe', 'pipe']
  });

  currentSshProcess = ssh;

  function handleData(data) {
    const str = data.toString();
    process.stdout.write(str);

    if (!currentTunnelUrl) {
      const match = str.match(/https:\/\/[a-zA-Z0-9-]+\.(?:serveousercontent\.com|serveo\.net)/);
      if (match) {
        updateTwilioAndEnv(match[0]);
      }
    }
  }

  ssh.stdout.on('data', handleData);
  ssh.stderr.on('data', handleData);

  ssh.on('close', code => {
    console.warn(`⚠️ Serveo tunnel closed (code ${code}). Reconnecting in 3s...`);
    if (!isRestarting) {
      isRestarting = true;
      setTimeout(startTunnel, 3000);
    }
  });

  ssh.on('error', err => {
    console.error('❌ SSH process error:', err.message);
    if (!isRestarting) {
      isRestarting = true;
      setTimeout(startTunnel, 3000);
    }
  });
}

process.on('SIGINT', () => {
  if (currentSshProcess) try { currentSshProcess.kill(); } catch {}
  process.exit(0);
});

process.on('SIGTERM', () => {
  if (currentSshProcess) try { currentSshProcess.kill(); } catch {}
  process.exit(0);
});

startTunnel();
