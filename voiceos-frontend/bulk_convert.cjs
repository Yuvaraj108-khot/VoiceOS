const fs = require('fs');
const path = require('path');

const inDir = 'C:\\Users\\YUVARAJ KHOT\\my files\\Desktop\\project\\VoiceOS\\voiceos-frontend\\stitch_designs';
const outDir = 'C:\\Users\\YUVARAJ KHOT\\my files\\Desktop\\project\\VoiceOS\\voiceos-frontend\\src\\pages';

if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

const files = fs.readdirSync(inDir).filter(f => f.endsWith('.html'));

files.forEach(file => {
    let html = fs.readFileSync(path.join(inDir, file), 'utf8');
    
    const mainMatch = html.match(/<main[\s\S]*?>([\s\S]*?)<\/main>/);
    let content = '';
    
    if (mainMatch) {
        content = mainMatch[0];
    } else {
        const bodyMatch = html.match(/<body[\s\S]*?>([\s\S]*?)<\/body>/);
        if (bodyMatch) {
            content = bodyMatch[1];
        } else {
            console.log("No body/main tag found in " + file);
            return;
        }
    }
    
    // Remove headers and navs that are handled by MainLayout if they exist inside the body match
    // Note: some pages like LandingPage/SignIn might need their own headers, but we will rely on MainLayout for most.
    
    content = content.replace(/class=/g, 'className=');
    content = content.replace(/style="([^"]*)"/g, (match, styleString) => {
        const styleObj = {};
        styleString.split(';').forEach(rule => {
            if (!rule.trim()) return;
            const parts = rule.split(':');
            if (parts.length === 2) {
                const key = parts[0].trim().replace(/-([a-z])/g, g => g[1].toUpperCase());
                const value = parts[1].trim();
                styleObj[key] = value;
            }
        });
        return `style={${JSON.stringify(styleObj)}}`;
    });
    
    content = content.replace(/<img(.*?)>/g, (m, c) => (c.endsWith('/') ? m : `<img${c} />`));
    content = content.replace(/<input(.*?)>/g, (m, c) => (c.endsWith('/') ? m : `<input${c} />`));
    content = content.replace(/<hr(.*?)>/g, (m, c) => (c.endsWith('/') ? m : `<hr${c} />`));
    content = content.replace(/<!--([\s\S]*?)-->/g, '{/*$1*/}');
    
    // Clean up typical JSX syntax errors like unescaped { }
    // Just simple conversion for now, we'll fix complex ones if tsc complains
    
    // Create a generic component name based on filename (e.g., 5_Live_Call_Center.html -> LiveCallCenterPage)
    const baseName = file.replace(/^[0-9]+_/, '').replace('.html', '');
    const componentName = baseName.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('') + 'Page';
    
    const tsxContent = `import React from 'react';\n\nexport default function ${componentName}() {\n  return (\n    <>\n${content}\n    </>\n  );\n}\n`;
    
    fs.writeFileSync(path.join(outDir, `${componentName}.tsx`), tsxContent);
    console.log(`Converted ${file} to ${componentName}.tsx`);
});
