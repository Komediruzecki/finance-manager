/**
 * Test utilities for reading frontend files in SolidJS + TypeScript architecture
 */
const fs = require('fs');
const path = require('path');

/**
 * Read all frontend content (HTML + TS/TSX files combined)
 * Reads from the built dist output
 */
function readFrontendContent() {
  const frontendDir = path.join(__dirname, '../../frontend');
  const distDir = path.join(frontendDir, 'dist/assets/templates');

  // Read index.html from frontend root
  let htmlContent = '';
  try {
    htmlContent = fs.readFileSync(path.join(frontendDir, 'index.html'), 'utf8');
  } catch (err) {
    // Fallback to reading from built templates
    htmlContent = readTemplates(distDir);
  }

  // Read all TS/TSX files from src directories
  let tsContent = '';
  const srcDir = path.join(frontendDir, 'src');
  if (fs.existsSync(srcDir)) {
    const tsDirs = [
      path.join(srcDir, 'core'),
      path.join(srcDir, 'features'),
      path.join(srcDir, 'components'),
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
  }

  return {
    htmlContent,
    tsContent,
    jsContent: tsContent,
    combinedContent: htmlContent + tsContent,
  };
}

/**
 * Read built HTML templates from dist directory
 */
function readTemplates(distDir) {
  if (!fs.existsSync(distDir)) {
    return '';
  }
  const files = fs.readdirSync(distDir);
  let html = '';
  files.forEach((file) => {
    try {
      html += fs.readFileSync(path.join(distDir, file), 'utf8') + '\n';
    } catch (err) {
      // Skip files that can't be read
    }
  });
  return html;
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