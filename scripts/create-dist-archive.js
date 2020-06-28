#!/usr/bin/env node

const fs = require('fs');
const { pipeline } = require('stream');
const JSZip = require('jszip');
const { name: MODLOADER_NAME, version: MODLOADER_VERSION } = require('../tool.config.json');

const MODLOADER_DIR_NAME = MODLOADER_NAME;
const MODLOADER_PACKAGE_FILES = [
  // <an empty comment to force multiline formatting>
  'LICENSE',
  'main.html',
  'tool.config.json',
  'runtime/ccmod.json',
];
const MODLOADER_PACKAGE_DIRS = [
  'dist/',
  'deobf-tables/',
  'common/dist/',
  'common/vendor-libs/',
  'runtime/dist/',
  'runtime/media/',
];

const PACKAGE_JSON_DATA = {
  name: 'CrossCode',
  version: '1.0.0',
  main: `${MODLOADER_DIR_NAME}/main.html`,
  'chromium-args': [
    '--ignore-gpu-blacklist',
    '--disable-direct-composition',
    '--disable-background-networking',
    '--in-process-gpu',
    '--password-store=basic',
  ].join(' '),
  window: {
    toolbar: false,
    icon: 'favicon.png',
    width: 1136,
    height: 640,
    fullscreen: false,
  },
};

async function main() {
  {
    let zip = new JSZip();

    zip.file('package.json', `${JSON.stringify(PACKAGE_JSON_DATA, null, 2)}\n`);
    zip.file('assets/mods/', null, { dir: true });

    addModloaderFilesToZip(zip.folder(MODLOADER_DIR_NAME));

    await writeZipToFile(zip, `${MODLOADER_NAME}_${MODLOADER_VERSION}_quick-install.zip`);
  }

  {
    let zip = new JSZip();
    addModloaderFilesToZip(zip);
    await writeZipToFile(zip, `${MODLOADER_NAME}_${MODLOADER_VERSION}_package.zip`);
  }

  console.log('done');
}

/**
 * @param {JSZip} zip
 */
function addModloaderFilesToZip(zip) {
  for (let path of MODLOADER_PACKAGE_FILES) addFile(path);
  for (let path of MODLOADER_PACKAGE_DIRS) addDir(path);

  /**
   * @param {string} path
   */
  function addFile(path) {
    zip.file(path, fs.createReadStream(path).on('error', console.error));
  }

  /**
   * @param {string} path
   */
  function addDir(path) {
    if (!path.endsWith('/')) path += '/';
    for (let dirent of fs.readdirSync(path, { withFileTypes: true })) {
      if (dirent.isFile()) {
        addFile(`${path}${dirent.name}`);
      } else if (dirent.isDirectory()) {
        addDir(`${path}${dirent.name}/`);
      }
    }
  }
}

/**
 * @param {JSZip} zip
 * @param {string} path
 * @returns {Promise<void>}
 */
function writeZipToFile(zip, path) {
  console.log('writing zip', path);
  let { stdout } = process;
  let { isTTY } = stdout;

  function clearLine() {
    stdout.clearLine(0);
    stdout.cursorTo(0, null);
  }

  return new Promise((resolve, reject) => {
    pipeline(
      zip.generateNodeStream(
        { type: 'nodebuffer', streamFiles: true },
        ({ percent, currentFile }) => {
          let message = `writing zip ${percent.toFixed(2)}%`;
          if (currentFile != null) message += ` :: ${currentFile}`;

          if (isTTY) clearLine();
          else message += '\n';
          stdout.write(message);
        },
      ),
      fs.createWriteStream(path),

      (err) => {
        clearLine();

        if (err != null) reject(err);
        else resolve(err);
      },
    );
  });
}

main().catch(console.error);
