const fs = require('fs');
const path = require('path');

const backendDir = path.join(__dirname, 'backend');
const routesDir = path.join(backendDir, 'routes');

// 1. Update backend/index.js to pass requireAuth to all routes
const indexPath = path.join(backendDir, 'index.js');
let indexContent = fs.readFileSync(indexPath, 'utf8');

const routeMatches = Array.from(indexContent.matchAll(/app\.use\(require\('\.\/routes\/([a-zA-Z0-9_]+)'\)\(\{([^}]+)\}\)\);/g));
for (const match of routeMatches) {
  const fullMatch = match[0];
  const routeName = match[1];
  let params = match[2];
  
  if (!params.includes('requireAuth')) {
    params += ', requireAuth';
    const newUse = `app.use(require('./routes/${routeName}')({${params}}));`;
    indexContent = indexContent.replace(fullMatch, newUse);
  }
}

// Special cases that span multiple lines
indexContent = indexContent.replace(/app\.use\(\s*require\('\.\/routes\/importRoutes'\)\(\{\s*apiRateLimiter,\s*logError,\s*uploadImport,\s*spreadsheetService,?\s*\}\)\s*\);/g, `app.use(
  require('./routes/importRoutes')({
    apiRateLimiter,
    logError,
    uploadImport,
    spreadsheetService,
    requireAuth,
  })
);`);

fs.writeFileSync(indexPath, indexContent);

// 2. Update route files
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));

for (const file of files) {
  const filePath = path.join(routesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Update export signature
  const exportMatch = content.match(/module\.exports\s*=\s*function\s*\(\{\s*([^}]+)\s*\}\)\s*\{/);
  if (exportMatch) {
    const params = exportMatch[1];
    if (!params.includes('requireAuth')) {
      const newParams = params + ', requireAuth';
      content = content.replace(exportMatch[0], `module.exports = function ({ ${newParams} }) {`);
    }
  } else {
    const exportMatchMultiline = content.match(/module\.exports\s*=\s*function\s*\(\{\s*([^}]*)\s*\}\)\s*\{/s);
    if (exportMatchMultiline) {
       const params = exportMatchMultiline[1];
       if (!params.includes('requireAuth')) {
         const newParams = params.trim() + ',\n    requireAuth';
         content = content.replace(exportMatchMultiline[0], `module.exports = function ({\n    ${newParams}\n  }) {`);
       }
    }
  }

  // Update router.get(
  // Regex matches: router.get('/path', apiRateLimiter, asyncHandler((req, res) => {
  // We want to insert requireAuth, after apiRateLimiter, if it's not already there
  const getMatches = Array.from(content.matchAll(/router\.get\('([^']+)',\s*(?:apiRateLimiter\s*,)?\s*(asyncHandler\(|async \(|\(req)/g));
  
  let modified = false;
  for (const match of getMatches) {
    // Look at the full line or slice
    const index = match.index;
    const slice = content.substring(index, index + 200);
    const lineEnd = slice.indexOf('\n');
    const line = slice.substring(0, lineEnd);
    
    if (line && !line.includes('requireAuth')) {
      // Replace it
      const replacedLine = line.replace(/router\.get\('([^']+)',\s*(apiRateLimiter\s*,)?\s*(asyncHandler\(|async \(|\(req)/, (m, path, apiRt, handlerStart) => {
         const rt = apiRt ? 'apiRateLimiter, ' : '';
         return `router.get('${path}', ${rt}requireAuth, ${handlerStart}`;
      });
      content = content.replace(line, replacedLine);
      modified = true;
    }
  }

  if (modified || exportMatch) {
    fs.writeFileSync(filePath, content);
  }
}

console.log("Refactoring complete");
