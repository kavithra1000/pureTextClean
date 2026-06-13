const fs = require('fs');
const path = require('path');

// Ensure dist directory exists
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist', { recursive: true });
}

// Copy files
fs.copyFileSync('index.html', 'dist/index.html');
if (fs.existsSync('script.js')) {
  fs.copyFileSync('script.js', 'dist/script.js');
}
if (fs.existsSync('logo.png')) {
  fs.copyFileSync('logo.png', 'dist/logo.png');
}
if (fs.existsSync('og-image.png')) {
  fs.copyFileSync('og-image.png', 'dist/og-image.png');
}
console.log('Build completed successfully!');
