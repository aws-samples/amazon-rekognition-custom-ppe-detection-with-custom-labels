const AWS = require('aws-sdk');
const GLOB = require('glob');
const JIMP = require('jimp');
const CANVAS = require('canvas');
const PATH = require('path');
const FS = require('fs');

function usage(message) {
  if (message) {
    console.error(`ERROR: ${message}`);
  }

  console.log(`
Usage:
node custom-label.js train|run --arn <model-arn> --path <path> --profile <aws-profile> --region <aws-region>

where:
  train|run               [mandatory] operation, [train|run]
  --arn <model-arn>       [mandatory] custom label model arn
  --path <path>           [mandatory] if is directory, it runs analysis for all images
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
    if (key === 'run' || key === 'train') {
      options.operation = key;
    } else {
      options[key.slice(2)] = args.shift();
    }
  }
  if (!options.operation) {
    return usage('operation \'train\' or \'run\' must be specified. ')
  }
  if (!options.arn) {
    return usage('missing --arn');    
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

async function convertImage(file) {
  return new Promise((resolve) => {
    JIMP.read(file, (e, image) => {
      if (e) {
        return reject(e);
      }
      const scale = (image.bitmap.width > 1280)
        ? 1280 / image.bitmap.width
        : 1;
      return image.scale(scale).getBuffer(JIMP.MIME_PNG, (e, result) => {
        if (e) {
          return reject(e);
        }
        return resolve({
          data: result,
          mime: JIMP.MIME_PNG,
          width: image.bitmap.width,
          height: image.bitmap.height,
          file,
        })
      });
      // return resolve(image.scale(scale)/*.greyscale()*/.getBufferAsync(JIMP.MIME_PNG));
    });
  });
}

async function createBoundingBoxResult(file, result) {
  const data = result.FaceDetails;
  if (!data.length) {
    return console.log(`no custom label in '${PATH.parse(file).base}'`);
  }
  const image = await CANVAS.loadImage(file);
  let canvasW = image.width;
  let canvasH = image.height;
  const scale =  1; // 640 / canvasW;
  canvasW = Math.floor(canvasW * scale);
  canvasW -= canvasW % 2;
  canvasH = Math.floor(canvasH * scale);
  canvasH -= canvasH % 2;

  const canvas = CANVAS.createCanvas(canvasW, canvasH);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0, canvasW, canvasH);

  const fontSize = 14;
  const lineSpace = 0;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = `${fontSize}px sans-serif`;

  let w = 0, h = 0, x = 0, y = 0;
  while (data.length) {
    const item = data.shift();
    w = Math.floor(item.BoundingBox.Width * canvasW);
    h = Math.floor(item.BoundingBox.Height * canvasH);
    x = Math.floor(item.BoundingBox.Left * canvasW);
    y = Math.floor(item.BoundingBox.Top * canvasH);

    const [r, g, b] = (!item.FaceMask)
      ? [228, 228, 228]
      : (item.FaceMask.Value)
        ? [0, 228, 64]
        : [228, 64, 0];
    const text = (!item.FaceMask)
      ? ['nodata']
      : [
        item.FaceMask.Value ? 'mask' : 'nomask',
        `${Number.parseFloat(item.FaceMask.Confidence).toFixed(2)}%`,
      ];

    // draw boundingbox
    ctx.moveTo(0, 0);
    ctx.strokeStyle = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.2)`;
    ctx.fillRect(x, y, w, h);
    // draw text
    ctx.fillStyle = ctx.strokeStyle;
    let y0 = Math.max((y - (text.length * (fontSize + lineSpace))), 2);
    while (text.length) {
      ctx.fillText(text.shift(), x, y0);
      y0 += (fontSize + lineSpace);
    }
  }

  const buf = canvas.toBuffer();
  let out = PATH.parse(file);
  out = PATH.join(out.dir, 'results', out.base);
  FS.writeFileSync(out, buf, {
    encoding:'utf8',
    flag:'w',
  });
  return out;
}

function createOutDirectory(file) {
  const outdir = PATH.join(PATH.parse(file).dir, 'results');
  if (!FS.existsSync(outdir)) {
    FS.mkdirSync(outdir, {
      recursive: true,
    });  
  }
  return outdir;
}

function randomNum(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
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

async function detectCustomLabels(image, arn) {
  console.log(`detectCustomLabels: ${image.bitmap.width} x ${image.bitmap.height}`);

  const scaleW = (image.bitmap.width < 64)
    ? 64 / image.bitmap.width
    : 1;
  const scaleH = (image.bitmap.height < 64)
    ? 64 / image.bitmap.height
    : 1;
  const scale = Math.max(scaleW, scaleH);

  const buffer = await image.scale(scale).getBufferAsync(JIMP.MIME_JPEG);
  const rekog = new AWS.Rekognition({
    apiVersion: '2016-06-27',
  });
  return rekog.detectCustomLabels({
    Image: {
      Bytes: buffer,
    },
    ProjectVersionArn: arn,  
  }).promise().catch((e) => {
    console.error(e);
    throw e;
  });
}

async function prepareTrainingData(file) {
  const image = await new Promise((resolve, reject) =>
    JIMP.read(file, (e, img) => (e) ? reject(e) : resolve(img)));

  const response = await detectFaces(image);

  const outdir = PATH.join(PATH.parse(file).dir, 'results');
  const basename = PATH.parse(file).name;
  let w = 0, h = 0, x = 0, y = 0;
  debugger;
  for (let i = 0; i < response.FaceDetails.length; i++) {
    const item = response.FaceDetails[i];
    item.BoundingBox.Left = item.BoundingBox.Left < 0 ? 0 : item.BoundingBox.Left;
    item.BoundingBox.Top = item.BoundingBox.Top < 0 ? 0 : item.BoundingBox.Top;
    w = Math.floor(item.BoundingBox.Width * image.bitmap.width);
    h = Math.floor(item.BoundingBox.Height * image.bitmap.height);
    x = Math.floor(item.BoundingBox.Left * image.bitmap.width);
    y = Math.floor(item.BoundingBox.Top * image.bitmap.height);
    // min. requirement for custom label
    if (w < 64 || h < 64) {
      console.log(`skipping face: ${w}x${h}`);
      continue;
    }
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

    await image.clone().crop(x, y, w, h).writeAsync(path);
    item.path = path;
  }
  return response;
}


async function runModel(file, arn) {
  const image = await new Promise((resolve, reject) =>
    JIMP.read(file, (e, img) => (e) ? reject(e) : resolve(img)));

  const response = await detectFaces(image);
debugger;
  let w = 0, h = 0, x = 0, y = 0;
  for (let i = 0; i < response.FaceDetails.length; i++) {
    const item = response.FaceDetails[i];
    item.BoundingBox.Left = item.BoundingBox.Left < 0 ? 0 : item.BoundingBox.Left;
    item.BoundingBox.Top = item.BoundingBox.Top < 0 ? 0 : item.BoundingBox.Top;
    w = Math.floor(item.BoundingBox.Width * image.bitmap.width);
    h = Math.floor(item.BoundingBox.Height * image.bitmap.height);
    x = Math.floor(item.BoundingBox.Left * image.bitmap.width);
    y = Math.floor(item.BoundingBox.Top * image.bitmap.height);

    // min. requirement for custom label
    /*
    if (w < 64 || h < 64) {
      console.log(`skipping face: ${w}x${h}`);
      continue;
    }
    */
    // checking out of bound
    if ((w + x) > image.bitmap.width) {
      w = image.bitmap.width - x;
    }
    if ((h + y) > image.bitmap.height) {
      h = image.bitmap.height - y;
    }
    console.log(`${image.bitmap.width} x ${image.bitmap.height} = ${w},${h},${x},${y}`);

    const cropped = image.clone().crop(x, y, w, h);
    const result = await detectCustomLabels(cropped, arn);
    // merge result to the response
    const customLabel = result.CustomLabels.shift();
    if (customLabel) {
      item.FaceMask = {
        Value: customLabel.Name === 'mask',
        Confidence: customLabel.Confidence,
      };  
    }
  }
  return response;
}

async function cropFacesOld(buffer, faceDetails) {
  const image = await new Promise((resolve, reject) => {
    const img = new CANVAS.Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = buffer;
  });

  let canvasW = image.width;
  let canvasH = image.height;
  const scale = 1;
  canvasW = Math.floor(canvasW * scale);
  canvasW -= canvasW % 2;
  canvasH = Math.floor(canvasH * scale);
  canvasH -= canvasH % 2;

  const canvas = CANVAS.createCanvas(canvasW, canvasH);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0, canvasW, canvasH);

  let w = 0, h = 0, x = 0, y = 0;
  while (faceDetails.length) {
    const item = faceDetails.shift();
    w = Math.floor(item.BoundingBox.Width * canvasW);
    h = Math.floor(item.BoundingBox.Height * canvasH);
    x = Math.floor(item.BoundingBox.Left * canvasW);
    y = Math.floor(item.BoundingBox.Top * canvasH);

    const r = randomNum(0, 255);
    const g = randomNum(0, 255);
    const b = randomNum(0, 255);
    ctx.strokeStyle = `#${r.toString(16)}${g.toString(16)}${b.toString(16)}`;
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.2)`;
    ctx.moveTo(0, 0);
    ctx.strokeRect(x, y, w, h);
    ctx.fillRect(x, y, w, h);
  }
  return canvas.toBuffer();
}

(async () => {
  const options = parseCmdline();
  loadAWSProfile(options.profile, options.region);

  const files = await getFiles(options.path);
  console.log(JSON.stringify(files, null, 2));
  if (!files.length) {
    return usage(`no image is found under \'${options.path}\'`);
  }

  createOutDirectory(files[0]);

  let response;
  while (files.length) {
    const file = files.shift();
    console.log(`processing '${file}'...`);
    if (options.operation === 'train') {
      const image = await prepareTrainingData(file);
    } else if (options.operation === 'run') {
      const result = await runModel(file, options.arn);
      console.log(JSON.stringify(result, null, 2));
      await createBoundingBoxResult(file, result);
    }

    // const response = await prepareTrainingData(image, response.FaceDetails);
    // console.log(JSON.stringify(response, null, 2));
    /*
    let out = PATH.parse(file);
    out = PATH.join(out.dir, 'results', out.base);
    FS.writeFileSync(out, faces, {
      encoding:'utf8',
      flag:'w',
    });
    */
    /*
    response = await rekog.detectCustomLabels({
      Image: {
        Bytes: buffer,
      },
      ProjectVersionArn: options.arn,
    }).promise();
    await createBoundingBoxResult(file, response.CustomLabels);
    console.log(JSON.stringify(response, null, 2));
    */
  }
})();
