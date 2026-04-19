/**
 * Test utilities for reading frontend files in SolidJS + TypeScript architecture
 */
const fs = require('fs');
const path = require('path');

/**
 * Read all frontend content (HTML + TS/TSX files combined)
 */
function readFrontendContent() {
  const frontendDir = path.join(__dirname, '../../frontend/src');
  const rootDir = path.join(__dirname, '../../frontend');

  // Read index.html from frontend root
  const htmlContent = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');

  // Read all TS/TSX files from src directories
  let tsContent = '';
  const tsDirs = [
    path.join(frontendDir, 'core'),
    path.join(frontendDir, 'features'),
    path.join(frontendDir, 'components'),
  ];

  tsDirs.forEach((dir) => {
    if (fs.existsSync(dir)) {
      fs.readdirSync(dir).forEach((file) => {
        if (file.endsWith('.tsx') || file.endsWith('.ts')) {
          tsContent += fs.readFileSync(path.join(dir, file), 'utf8') + '\n';
        }
      });
    }
  });

  return {
    htmlContent,
    tsContent,
    combinedContent: htmlContent + tsContent,
  };
}

/**
 * Find a component by name in the combined frontend content
 */
function findComponent(name, content) {
  // Look for the component in TSX/TS files
  const tsPattern = new RegExp(`${name}\\b[^<]*{`, 's');
  const match = content.match(tsPattern);
  return match ? match[0] : null;
}

/**
 * Find a specific export in a file
 */
function findExport(componentName, content) {
  const pattern = new RegExp(`export\\s+(default\\s+)?function\\s+${componentName}\\b`, 's');
  return pattern.test(content);
}

module.exports = { readFrontendContent, fs, path, findComponent, findExport };