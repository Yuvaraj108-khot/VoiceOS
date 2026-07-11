const fs = require('fs');
const path = require('path');

const dir = 'C:\\Users\\YUVARAJ KHOT\\my files\\Desktop\\project\\VoiceOS\\voiceos-frontend\\src\\pages';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

files.forEach(file => {
    const p = path.join(dir, file);
    let content = fs.readFileSync(p, 'utf8');
    
    content = content.replace(/ for="/g, ' htmlFor="');
    content = content.replace(/ viewbox="/g, ' viewBox="');
    content = content.replace(/ preserveaspectratio="/g, ' preserveAspectRatio="');
    content = content.replace(/<lineargradient/g, '<linearGradient');
    content = content.replace(/<\/lineargradient>/g, '</linearGradient>');
    content = content.replace(/ onclick="/g, ' onClick="');
    content = content.replace(/ checked="checked"/g, ' defaultChecked');
    content = content.replace(/ rows="(\d+)"/g, ' rows={$1}');
    
    fs.writeFileSync(p, content);
    console.log(`Fixed JSX in ${file}`);
});
