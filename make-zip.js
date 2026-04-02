const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// If archiver is not available, use a manual approach with jszip or built-in
// Try using node's built-in zlib + tar approach, or use npm archiver

const root = path.join(__dirname, 'dist');
const zipPath = path.join(__dirname, 'deploy_fs.zip');

// Use the 'archiver' package if available, otherwise fall back to a manual buffer
try {
  const archiver = require('archiver');
  const output = fs.createWriteStream(zipPath);
  const archive = archiver('zip', { zlib: { level: 9 } });
  
  output.on('close', () => {
    console.log(`Created ${zipPath} (${archive.pointer()} bytes)`);
  });
  archive.on('error', (err) => { throw err; });
  
  archive.pipe(output);
  archive.directory(root, false);
  archive.finalize();
} catch(e) {
  // archiver not available, use JSZip or manual
  try {
    const JSZip = require('jszip');
    // manual...
  } catch(e2) {
    console.error('Neither archiver nor jszip available. Install with: npm install archiver');
    process.exit(1);
  }
}
