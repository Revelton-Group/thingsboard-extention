/*
 * Copyright © 2023 ThingsBoard, Inc.
 */
const fse = require('fs-extra');
const path = require('path');

let _projectRoot = null;

(async () => {
  // Copy the JavaScript file and its associated source map
  await copyFileWithSourceMap(sourcePackage(), targetPackage());
})();

// Function to copy the main package and its source map
async function copyFileWithSourceMap(sourceFilePath, targetFilePath) {
  try {
    // Copy the main JavaScript file
    await fse.copy(sourceFilePath, targetFilePath, { overwrite: true });

    // Check if a source map exists and copy it if found
    const sourceMapPath = `${sourceFilePath}.map`;
    const targetMapPath = `${targetFilePath}.map`;

    if (fse.pathExists(sourceMapPath)) {
      await fse.copy(sourceMapPath, targetMapPath, { overwrite: true });
    }
  } catch (err) {
    console.error(`Error copying files: ${err.message}`);
  }
}

function projectRoot() {
  if (!_projectRoot) {
    _projectRoot = __dirname;
  }
  return _projectRoot;
}

function sourcePackage() {
  return path.join(projectRoot(), 'dist', 'widget-extension', 'system', 'thingsboard-extension-widgets.js');
}

function targetPackage() {
  return path.join(projectRoot(), 'target', 'generated-resources', 'thingsboard-extension-widgets.js');
}
