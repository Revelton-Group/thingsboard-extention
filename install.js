/*
 * Copyright © 2023 ThingsBoard, Inc.
 */
const fse = require('fs-extra');
const path = require('path');

let _projectRoot = null;

const PACKAGES = {
  hotel: {
    dist: 'hotel-dashboard',
    file: 'hotel-dashboard-widgets.js',
  },
  utility: {
    dist: 'utility-dashboard',
    file: 'utility-dashboard-widgets.js',
  },
};

(async () => {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const targetArg = args.find((arg) => !arg.startsWith('--'));

  if (targetArg && targetArg !== 'all' && !PACKAGES[targetArg]) {
    console.error(`Unknown package "${targetArg}". Expected one of: ${Object.keys(PACKAGES).join(', ')}, all`);
    process.exit(1);
  }

  const keys = PACKAGES[targetArg] ? [targetArg] : Object.keys(PACKAGES);
  for (const key of keys) {
    await copyPackage(PACKAGES[key].dist, PACKAGES[key].file, force);
  }
})();

async function copyPackage(distDir, fileName, force) {
  const src = path.join(projectRoot(), 'dist', distDir, 'system', fileName);

  if (!(await fse.pathExists(src))) {
    console.warn(`Source not found, skipping: ${src}`);
    return;
  }

  const { version } = await fse.readJson(path.join(projectRoot(), 'src', distDir, 'package.json'));
  const versionedName = fileName.replace(/\.js$/, `-${version}.js`);
  const dest = path.join(projectRoot(), 'target', 'generated-resources', versionedName);

  const code = (await fse.readFile(src, 'utf8')).replace(
    /(\/\/# sourceMappingURL=)\S+\s*$/,
    `$1${versionedName}.map`
  );

  if (!force && (await fse.pathExists(dest)) && (await fse.readFile(dest, 'utf8')) !== code) {
    console.error(
      `✘ ${versionedName} already exists with different content. ` +
        `Bump "version" in src/${distDir}/package.json, or re-run with --force to overwrite.`
    );
    process.exitCode = 1;
    return;
  }

  await writeFileWithSourceMap(src, code, dest);
  console.log(`✔ ${fileName} -> target/generated-resources/${versionedName}`);
}

async function writeFileWithSourceMap(sourceFilePath, code, targetFilePath) {
  try {
    await fse.ensureDir(path.dirname(targetFilePath));
    await fse.writeFile(targetFilePath, code);

    const sourceMapPath = `${sourceFilePath}.map`;
    const targetMapPath = `${targetFilePath}.map`;

    if (await fse.pathExists(sourceMapPath)) {
      await fse.copy(sourceMapPath, targetMapPath, { overwrite: true });
    }
  } catch (err) {
    console.error(`Error copying files: ${err.message}`);
    process.exitCode = 1;
  }
}

function projectRoot() {
  if (!_projectRoot) {
    _projectRoot = __dirname;
  }
  return _projectRoot;
}
