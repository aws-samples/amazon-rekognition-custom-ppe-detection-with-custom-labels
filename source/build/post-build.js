// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const FS = require('fs');
const PATH = require('path');
const CRYPTO = require('crypto');
const GLOB = require('glob');
const Terser = require('terser');

const COMMAND = {
  MINIFY: 'minify',
  INJECTSRI: 'inject-sri',
};

function usage(message) {
  if (message) {
    console.error(`ERROR: ${message}`);
  }
  const script = PATH.parse(process.argv[1]).base;
  console.log(`
Usage:
node ${script} <command> <options>

where:
  <command>              specify ${Object.values(COMMAND).join(', ')}

  ${COMMAND.MINIFY} <options>
    --dir <APP_DIR>      [mandatory] the top-level app name; ie., src/lib/js/

  ${COMMAND.INJECTSRI} <options>
    --html <INDEX_HTML>  [mandatory] inject SRI code

  `);
  process.exit(1);
}

function parseCmdline() {
  const options = {};
  const args = process.argv.slice(2);
  const command = args.shift();
  while (args.length) {
    options[args.shift().slice(2)] = args.shift();
  }
  if (command === COMMAND.MINIFY) {
    if (!options.dir) {
      return usage('\'--dir\' must be specified');
    }
  } else if (command === COMMAND.INJECTSRI) {
    if (!options.html) {
      return usage('\'--html\' must be specified');
    }
  } else {
    return usage(`command \'${command}\' not supported`);
  }
  options.command = command;
  return options;
}

async function injectSRICommand(options) {
  const original = PATH.resolve(options.html);
  const buffer = createBackupCopy(original);
  const output = [];
  const rootDir = PATH.parse(original).dir;
  const lines = buffer.toString().split('\n');
  while(lines.length) {
    const line = lines.shift();
    if (line.indexOf('%SRI%') < 0) {
      output.push(line);
      continue;
    }
    if (line.indexOf('<script') >= 0) {
      output.push(insertSRI(line, rootDir, /src=\"([^"]+)\"/));
    } else if (line.indexOf('<link') >= 0) {
      output.push(insertSRI(line, rootDir, /href=\"([^"]+)\"/));
    } else {
      throw new Error('only support <script> and <link> tags');
    }
  }
  // overwrite original file
  FS.writeFileSync(original, output.join('\n'));
}

async function minifyJSCommand(options) {
  let parsed = PATH.parse(PATH.resolve(options.dir));
  if (parsed.ext.length > 0) {
    parsed = parsed.dir
  } else {
    parsed = PATH.join(parsed.dir, parsed.base);
  }

  const files = await new Promise((resolve, reject) =>
    GLOB(PATH.join(parsed, '**/*.js'), (e, data) =>
      (e) ? reject(e) : resolve(data)));

  files.forEach((file) => {
    console.log(`>>> processing ${file}...`);
    const result = Terser.minify(FS.readFileSync(file, 'utf8'), {
      ecma: 6,
      // keep_classnames: true,
      // warnings: 'verbose',
    });
    if (result.error) {
      throw result.error;
    }
    FS.writeFileSync(file, result.code);
  });
}

function computeFileSHA384(path) {
  const buf = FS.readFileSync(path);
  const digest = CRYPTO.createHash('sha384').update(buf, 'utf-8').digest('hex');
  return Buffer.from(digest, 'hex').toString('base64');
}

function insertSRI(line, rootDir, regex) {
  const found = line.match(regex);
  if (!found) {
    throw new Error(`failed to find tag: ${line}`);
  }
  const idx = line.indexOf('>');
  if (idx < 0) {
    throw new Error('failed to find \'>\' enclose tag: ${line}');
  }

  const path = PATH.resolve(PATH.join(rootDir, found[1]));
  const integrity = computeFileSHA384(path);
  return [
    line.substring(0, idx),
    ` integrity=\"sha384-${integrity}\"`,
    line.substring(idx),
  ].join('');
}

function createBackupCopy(path) {
  const buffer = FS.readFileSync(path);
  // FS.writeFileSync(`${path}.bak`, buffer);
  return buffer;
}

(async () => {
  const options = parseCmdline();
  if (options.command === COMMAND.MINIFY) {
    return minifyJSCommand(options);
  }
  if (options.command === COMMAND.INJECTSRI) {
    return injectSRICommand(options);
  }

  return usage(`command '${options.command}' not supported`);
})();
