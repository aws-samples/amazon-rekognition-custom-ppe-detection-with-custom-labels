const AWS = require('aws-sdk');
const GLOB = require('glob');
const JIMP = require('jimp');
const PATH = require('path');
const FS = require('fs');

function usage(message) {
  if (message) {
    console.error(`ERROR: ${message}`);
  }

  console.log(`
Usage:
node ${process.argv[1]} --path <file|directory> --profile <aws-profile> --region <aws-region>

where:
  --path <file|directory> [mandatory] if is directory, it runs for all images
  --profile <aws-profile> [optional]  your aws profile name, default to 'default'
  --region <aws-region>   [optional]  AWS region, default to 'us-east-1' region
  `);
  process.exit(1);
}

function parseCmdline() {
  const options = {};
  const args = process.argv.slice(2);
  while (args.length) {
    const key = args.shift();
    options[key.slice(2)] = args.shift();
  }
  if (!options.path) {
    return usage('missing --path');
  }
  options.profile = options.profile || 'default';
  options.region = options.region || 'eu-west-1';
  return options;
}

function loadAWSProfile(profile, region) {
  AWS.config.region = region;
  AWS.config.credentials = new AWS.SharedIniFileCredentials({
    profile,
  });
}

async function getFiles(dirOrFile) {
  const path = PATH.resolve(dirOrFile);
  return PATH.parse(path).ext
    ? [dirOrFile]
    : new Promise((resolve, reject) =>
      GLOB(PATH.join(path, '**/*.+(jpg|jpeg|png)'), (e, files) => (
        (e) ? reject(e) : resolve(files))));
}

function createOutDirectory(path) {
  let outdir = PATH.parse(path);
  outdir = (outdir.ext) ? PATH.join(outdir, 'unlabeled') : path;
  outdir = PATH.resolve(outdir);
  if (!FS.existsSync(outdir)) {
    FS.mkdirSync(outdir, {
      recursive: true,
    });
  }
  return outdir;
}

async function detectPerson(image) {
  const scaleW = (image.bitmap.width > 1920)
    ? 1920 / image.bitmap.width
    : 1;
  const scaleH = (image.bitmap.height > 1080)
    ? 1080 / image.bitmap.height
    : 1;
  const scale = Math.min(scaleW, scaleH);
  const downscaled = await image.clone().scale(scale).getBufferAsync(JIMP.MIME_PNG);

  const rekog = new AWS.Rekognition({
    apiVersion: '2016-06-27',
  });
  return rekog.detectLabels({
    Image: {
      Bytes: downscaled,
    },
    MaxLabels: 100,
    MinConfidence: 70,
  }).promise();
}

async function detectFaces(image) {
  const scaleW = (image.bitmap.width > 1920)
    ? 1920 / image.bitmap.width
    : 1;
  const scaleH = (image.bitmap.height > 1080)
    ? 1080 / image.bitmap.height
    : 1;
  const scale = Math.min(scaleW, scaleH);
  const downscaled = await image.clone().scale(scale).getBufferAsync(JIMP.MIME_PNG);

  const rekog = new AWS.Rekognition({
    apiVersion: '2016-06-27',
  });
  return rekog.detectFaces({
    Image: {
      Bytes: downscaled,
    },
    Attributes: [
      'DEFAULT',
    ],
  }).promise();
}

async function prepareTrainingData(file, outdir) {
  const image = await new Promise((resolve, reject) =>
    JIMP.read(file, (e, img) =>
      ((e) ? reject(e) : resolve(img))));

  const basename = PATH.parse(file).name;
  let w = 0, h = 0, x = 0, y = 0;

  const response = await detectPerson(image);
  const persons = response.Labels.filter(label =>
    label.Name === 'Person');
  while (persons.length) {
    const person = persons.shift();
    for (let i = 0; i < person.Instances.length; i++) {
      const item = person.Instances[i];
      item.BoundingBox.Left = item.BoundingBox.Left < 0 ? 0 : item.BoundingBox.Left;
      item.BoundingBox.Top = item.BoundingBox.Top < 0 ? 0 : item.BoundingBox.Top;
      w = Math.floor(item.BoundingBox.Width * image.bitmap.width);
      h = Math.floor(item.BoundingBox.Height * image.bitmap.height);
      x = Math.floor(item.BoundingBox.Left * image.bitmap.width);
      y = Math.floor(item.BoundingBox.Top * image.bitmap.height);
      // checking out of bound
      if ((w + x) > image.bitmap.width) {
        w = image.bitmap.width - x;
      }
      if ((h + y) > image.bitmap.height) {
        h = image.bitmap.height - y;
      }
      const name = [
        Number.parseFloat(w).toFixed(2),
        Number.parseFloat(h).toFixed(2),
        Number.parseFloat(x).toFixed(2),
        Number.parseFloat(y).toFixed(2),
      ].join(',');
      const path = PATH.join(outdir, `${basename}-${name}.png`);
      console.log(`${image.bitmap.width} x ${image.bitmap.height} = ${w},${h},${x},${y}`);

      const scaleW = (w < 64) ? (64 / w + 0.01) : 1;
      const scaleH = (h < 64) ? (64 / h + 0.01) : 1;
      const cropped = image.clone()
        .crop(x, y, w, h)
        .scale(Math.max(scaleW, scaleH));
      await cropped.writeAsync(path);
      item.path = path;
    }
  }

  /*
  const response = await detectFaces(image);
  for (let i = 0; i < response.FaceDetails.length; i++) {
    const item = response.FaceDetails[i];
    item.BoundingBox.Left = item.BoundingBox.Left < 0 ? 0 : item.BoundingBox.Left;
    item.BoundingBox.Top = item.BoundingBox.Top < 0 ? 0 : item.BoundingBox.Top;
    w = Math.floor(item.BoundingBox.Width * image.bitmap.width);
    h = Math.floor(item.BoundingBox.Height * image.bitmap.height);
    x = Math.floor(item.BoundingBox.Left * image.bitmap.width);
    y = Math.floor(item.BoundingBox.Top * image.bitmap.height);
    // checking out of bound
    if ((w + x) > image.bitmap.width) {
      w = image.bitmap.width - x;
    }
    if ((h + y) > image.bitmap.height) {
      h = image.bitmap.height - y;
    }
    const name = [
      Number.parseFloat(w).toFixed(2),
      Number.parseFloat(h).toFixed(2),
      Number.parseFloat(x).toFixed(2),
      Number.parseFloat(y).toFixed(2),
    ].join(',');
    const path = PATH.join(outdir, `${basename}-${name}.png`);
    console.log(`${image.bitmap.width} x ${image.bitmap.height} = ${w},${h},${x},${y}`);

    const scaleW = (w < 64) ? (64 / w + 0.01) : 1;
    const scaleH = (h < 64) ? (64 / h + 0.01) : 1;
    const cropped = image.clone()
      .crop(x, y, w, h)
      .scale(Math.max(scaleW, scaleH));
    await cropped.writeAsync(path);
    item.path = path;
  }
  */
  return response;
}

(async () => {
  const options = parseCmdline();
  loadAWSProfile(options.profile, options.region);

  const files = await getFiles(options.path);
  console.log(JSON.stringify(files, null, 2));
  if (!files.length) {
    usage(`no image is found under '${options.path}'`);
    return;
  }

  const outdir = createOutDirectory('./dataset/unlabeled');

  while (files.length) {
    const slices = files.splice(0, 4);
    await Promise.all(slices.map(file =>
      prepareTrainingData(file, outdir)));
  }
})();
