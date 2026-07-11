const fs = require('fs');
const path = require('path');

const dir = 'C:\\Users\\YUVARAJ KHOT\\my files\\Desktop\\project\\VoiceOS\\voiceos-frontend\\src\\pages';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

files.forEach(file => {
    // Skip Landing and SignIn as they have distinct headers/no layout
    if (file === 'LandingPage.tsx' || file === 'LandingPagePage.tsx' || file === 'SignInPage.tsx') return;
    
    const p = path.join(dir, file);
    let content = fs.readFileSync(p, 'utf8');
    
    // Remove <header>...</header> (non-greedy)
    content = content.replace(/<header[\s\S]*?<\/header>/g, '');
    
    // Remove sidebars or mobile navs (<nav>...</nav>)
    content = content.replace(/<nav[\s\S]*?<\/nav>/g, '');
    
    // Remove "<!-- TopAppBar -->" and similar comments
    content = content.replace(/\{\/\* TopAppBar \*\/\}/g, '');
    content = content.replace(/\{\/\* Bottom Mobile Nav \*\/\}/g, '');
    
    fs.writeFileSync(p, content);
    console.log(`Stripped headers from ${file}`);
});
