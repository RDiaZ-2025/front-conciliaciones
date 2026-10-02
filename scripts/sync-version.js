const fs = require('fs');
const path = require('path');

const rootPkgPath = path.resolve(__dirname, '../package.json');
const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));

const { version, versionDate } = rootPkg;

if (!version) {
  console.error('[sync-version] Error: No se encontró "version" en el package.json raíz.');
  process.exit(1);
}

const targets = [
  path.resolve(__dirname, '../backend/package.json'),
  path.resolve(__dirname, '../frontend/package.json')
];

let updatedCount = 0;

for (const targetPath of targets) {
  if (fs.existsSync(targetPath)) {
    const pkg = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
    let changed = false;

    if (pkg.version !== version) {
      pkg.version = version;
      changed = true;
    }

    if (versionDate && pkg.versionDate !== versionDate) {
      pkg.versionDate = versionDate;
      changed = true;
    }

    if (changed) {
      fs.writeFileSync(targetPath, JSON.stringify(pkg, null, 2) + '\n');
      updatedCount++;
    }
  }
}

console.log(`[sync-version] Versión ${version} (${versionDate || 'sin fecha'}) sincronizada en los paquetes.`);
