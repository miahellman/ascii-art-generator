//ascii image generator
let img;
let asciiChars = [];
let drawIndex = 0;

//TWEAK: lower = more detail, higher = chunkier
//range: 3 (very detailed, slower) to 8 (chunky, fast)
let cellSize = 4;

let imageLoaded = false;

let input;
let uploadButton;
let newFileButton;
let saveButton;
let buttonsShown = false;

const BTN_W = 140;
const BTN_H = 36;
const MAX_ART_W = 800;
const TOP_PAD = 80;
const BOTTOM_PAD = 20;

//TWEAK: how many characters get revealed per frame
//bump this up if cellSize is small (lots of chars to draw)
//range: 200 (slow reveal) to 1000 (almost instant)
const REVEAL_SPEED = 500;

//TWEAK: contrast boost applied before sampling
//1.0 = no change, 1.4 = moderate punch, 1.8 = high contrast
const CONTRAST = 1.4;

//art bounds within the canvas
let artX = 0, artY = 0, artW = 0, artH = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  background(255);
  textFont('Helvetica');

  input = createFileInput(handleFile);
  input.hide();

  uploadButton = createButton('upload image');
  styleButton(uploadButton);
  uploadButton.mousePressed(() => input.elt.click());

  drawSplash();
}

//styles a button with hover swap
//uses setProperty with !important so font-family etc beat browser defaults
function styleButton(btn) {
  const base = {
    'background': '#000',
    'color': '#fff',
    'border': '2px solid #000',
    'border-radius': '0',
    'padding': '8px 16px',
    'width': BTN_W + 'px',
    'font-family': 'Helvetica, Arial, sans-serif',
    'font-size': '14px',
    'cursor': 'pointer',
    'box-sizing': 'border-box',
  };

  //helper applies all base styles plus any overrides
  function apply(overrides = {}) {
    for (let [k, v] of Object.entries({ ...base, ...overrides })) {
      btn.elt.style.setProperty(k, v, 'important');
    }
  }

  apply();
  btn.elt.addEventListener('mouseenter', () => apply({ background: '#fff', color: '#000' }));
  btn.elt.addEventListener('mouseleave', () => apply());
}

//splash: title, button, instruction below
function drawSplash() {
  background(255);
  fill(0);
  textAlign(CENTER, CENTER);

  textSize(24);
  text('mia hellman', width / 2, height / 2 - 40);

  uploadButton.show();
  uploadButton.position(width / 2 - BTN_W / 2, height / 2);

  textSize(12);
  text('^ just do it', width / 2, height / 2 + BTN_H + 25);
}

//re-render at new size when window resizes
function windowResized() {
  if (imageLoaded) {
    if (newFileButton) newFileButton.hide();
    if (saveButton) saveButton.hide();
    buttonsShown = false;
    processImage();
  } else {
    resizeCanvas(windowWidth, windowHeight);
    drawSplash();
  }
}

function handleFile(file) {
  if (file.type !== 'image') return;
  img = loadImage(file.data, processImage);
  uploadButton.hide();
  if (newFileButton) newFileButton.hide();
  if (saveButton) saveButton.hide();
  buttonsShown = false;
}

//converts image into ascii character grid
function processImage() {
  asciiChars = [];
  drawIndex = 0;

  //art width capped at MAX_ART_W, height follows aspect ratio
  let imgAspect = img.height / img.width;
  artW = floor(min(windowWidth, MAX_ART_W) / cellSize) * cellSize;
  artH = floor((artW * imgAspect) / cellSize) * cellSize;

  //canvas grows to fit everything
  let canvasH = max(windowHeight, TOP_PAD + artH + BOTTOM_PAD);
  resizeCanvas(windowWidth, canvasH);
  background(255);

  //horizontally centered, pinned to top
  artX = floor((width - artW) / 2);
  artY = TOP_PAD;

  //work on a copy so img stays pristine for resizes
  let work = img.get();
  work.resize(artW / cellSize, artH / cellSize);

  //apply contrast boost to make shading read more clearly
  work.loadPixels();
  for (let i = 0; i < work.pixels.length; i += 4) {
    for (let j = 0; j < 3; j++) {
      let v = work.pixels[i + j] / 255;
      //pushes values away from middle gray
      v = (v - 0.5) * CONTRAST + 0.5;
      work.pixels[i + j] = constrain(v * 255, 0, 255);
    }
  }
  work.updatePixels();

  for (let y = 0; y < work.height; y++) {
    for (let x = 0; x < work.width; x++) {
      let b = brightness(work.get(x, y));
      asciiChars.push({
        x: artX + x * cellSize,
        y: artY + y * cellSize,
        char: getAsciiChar(b)
      });
    }
  }

  imageLoaded = true;
  textAlign(LEFT, TOP);
  textSize(cellSize);
}

function draw() {
  if (!imageLoaded) return;

  //reveal characters per frame, controlled by REVEAL_SPEED constant up top
  for (let i = 0; i < REVEAL_SPEED && drawIndex < asciiChars.length; i++) {
    let a = asciiChars[drawIndex++];
    fill(0);
    text(a.char, a.x, a.y);
  }

  //show buttons the moment generation finishes
  if (drawIndex >= asciiChars.length && !buttonsShown) showButtons();
}

//save in top-left of art, upload-new in top-right
function showButtons() {
  buttonsShown = true;

  saveButton = createButton('save image');
  styleButton(saveButton);
  saveButton.position(artX, artY - BTN_H - 20);
  saveButton.mousePressed(() => saveCanvas('ascii-art', 'png'));

  newFileButton = createButton('upload new');
  styleButton(newFileButton);
  newFileButton.position(artX + artW - BTN_W, artY - BTN_H - 20);
  newFileButton.mousePressed(resetToSplash);
}

function resetToSplash() {
  imageLoaded = false;
  asciiChars = [];
  drawIndex = 0;
  buttonsShown = false;

  saveButton.hide();
  newFileButton.hide();
  input.elt.value = '';

  resizeCanvas(windowWidth, windowHeight);
  drawSplash();
}

//brightness (0-255) to ascii character
function getAsciiChar(brightness) {
  //TWEAK: character ramp from lightest (space) to darkest ($)
  //longer ramp = more shading levels = more detail
  //try shorter ramps for chunkier styles: " .:-=+*#%@"
  let chars = " .'`^\",:;Il!i><~+_-?][}{1)(|/\\tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";
  return chars[floor(map(brightness, 0, 255, 0, chars.length - 1))];
}
