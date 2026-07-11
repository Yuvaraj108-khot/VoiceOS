const fs = require('fs');
const path = require('path');

const htmlFile = 'C:\\Users\\YUVARAJ KHOT\\my files\\Desktop\\project\\VoiceOS\\voiceos-frontend\\stitch_designs\\4_Dashboard.html';
const outFile = 'C:\\Users\\YUVARAJ KHOT\\my files\\Desktop\\project\\VoiceOS\\voiceos-frontend\\src\\pages\\DashboardPage.tsx';

let html = fs.readFileSync(htmlFile, 'utf8');

// Extract the contents of <main> tag
const mainMatch = html.match(/<main[\s\S]*?>([\s\S]*?)<\/main>/);
if (!mainMatch) {
    console.log("No main tag found");
    process.exit(1);
}

let content = mainMatch[0];

// Convert class to className
content = content.replace(/class=/g, 'className=');
// Convert inline styles
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
// Convert self closing tags like img, input, hr
content = content.replace(/<img(.*?)>/g, (m, c) => (c.endsWith('/') ? m : `<img${c} />`));
content = content.replace(/<input(.*?)>/g, (m, c) => (c.endsWith('/') ? m : `<input${c} />`));
content = content.replace(/<hr(.*?)>/g, (m, c) => (c.endsWith('/') ? m : `<hr${c} />`));

// Convert HTML comments to React comments
content = content.replace(/<!--([\s\S]*?)-->/g, '{/*$1*/}');

const tsxContent = `import React from 'react';\n\nexport default function DashboardPage() {\n  return (\n    <>\n${content}\n    </>\n  );\n}\n`;

fs.writeFileSync(outFile, tsxContent);
console.log('Successfully created DashboardPage.tsx');
