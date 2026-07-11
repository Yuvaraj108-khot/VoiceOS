const fs = require('fs');
const https = require('https');
const path = require('path');

const outputTxtPath = 'C:\\Users\\YUVARAJ KHOT\\.gemini\\antigravity-ide\\brain\\f9d66982-198b-4534-9188-a7fc4d3a0fbd\\.system_generated\\steps\\310\\output.txt';
const targetDir = 'C:\\Users\\YUVARAJ KHOT\\my files\\Desktop\\project\\VoiceOS\\voiceos-frontend\\stitch_designs';

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const data = JSON.parse(fs.readFileSync(outputTxtPath, 'utf8'));

data.screens.forEach((screen, index) => {
  const title = screen.title.replace(/[^a-zA-Z0-9]/g, '_');
  
  if (screen.htmlCode && screen.htmlCode.downloadUrl) {
    const htmlPath = path.join(targetDir, `${index}_${title}.html`);
    const file = fs.createWriteStream(htmlPath);
    https.get(screen.htmlCode.downloadUrl, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
      });
    }).on('error', (err) => {
      console.error('Error downloading HTML for', title, err.message);
    });
  }
  
  if (screen.screenshot && screen.screenshot.downloadUrl) {
    const imgPath = path.join(targetDir, `${index}_${title}.png`);
    const imgFile = fs.createWriteStream(imgPath);
    https.get(screen.screenshot.downloadUrl, (response) => {
      response.pipe(imgFile);
      imgFile.on('finish', () => {
        imgFile.close();
      });
    }).on('error', (err) => {
      console.error('Error downloading Screenshot for', title, err.message);
    });
  }
});
console.log('Downloading assets...');
