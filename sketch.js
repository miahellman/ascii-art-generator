//ascii image generator
let img;
let asciiChars = [];
let drawIndex = 0;

//TWEAK: lower = more detail, higher = chunkier
let cellSize = 4;

let imageLoaded = false;

let input;
let uploadButton;
let newFileButton;
let saveButton;
let buttonsShown = false;
let hasGeneratedOnce = false;

let controlsDiv;
let cellSizeSlider;
let contrastSlider;
let regenTimer = null;

const BTN_W = 140;
const BTN_H = 36;

//TWEAK: max width AND height the art can be
const MAX_ART_SIZE = 550;

const PANEL_W = 200;
const PANEL_MARGIN = 20;

const TOP_PAD = 80;
const BOTTOM_PAD = 60;

const REVEAL_SPEED = 500;

//TWEAK: starting contrast
let contrast = 1.4;

//TWEAK: ramp styles — feel free to add your own, key shows in the dropdown
//ramps go from lightest (left, sparse) to darkest (right, dense)
const RAMPS = {
  'classic':  "     .'`^\",:;Il!i><~+_-?][}{1)(|/\\tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
  'minimal':  "     .:-=+*#%@",
  'letters':  "     .lcvonxserwmkhpdbqgKZSXAVUOQNHMW@",
  'symbols':  '     .,:;!?"\'`-_=+~*<>()[]{}|/\\&#%@$',
  'blocks':   "     ░▒▓█",
  'dots':     "     ··••●⬤",
  'numbers':  "     1234567890",
  'binary':   "     .01",
};

//TWEAK: starting ramp style
let rampStyle = 'classic';

//TWEAK: random splash subtitle messages
const SPLASH_MESSAGES = [
  '^ just do it',
  '^ you aren\'t curious to see what will happen?',
  '^ i know you want to',
  '^ DO IT!!!!',
  '^ press the button',
  '^ trust me, i won\'t steal your data',
  '^ please?',
  '^ it will bring you joy',
];

let currentSplashMessage = '';

let artX = 0, artY = 0, artW = 0, artH = 0;

function isNarrow() {
  return windowWidth < PANEL_W + PANEL_MARGIN * 2 + MAX_ART_SIZE + 40;
}

function pickSplashMessage() {
  currentSplashMessage = SPLASH_MESSAGES[floor(random(SPLASH_MESSAGES.length))];
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  background(255);
  textFont('Helvetica');

  //inject slider + dropdown styles
  let styleTag = document.createElement('style');
  styleTag.textContent = `
    input[type=range].ascii-slider {
      -webkit-appearance: none;
      appearance: none;
      width: 100%;
      height: 4px;
      background: #fff;
      outline: none;
      margin: 4px 0;
      cursor: pointer;
    }
    input[type=range].ascii-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 14px;
      height: 14px;
      background: #fff;
      border: 2px solid #fff;
      border-radius: 0;
      cursor: pointer;
    }
    input[type=range].ascii-slider::-moz-range-thumb {
      width: 14px;
      height: 14px;
      background: #fff;
      border: 2px solid #fff;
      border-radius: 0;
      cursor: pointer;
    }
    select.ascii-select {
      width: 100%;
      background: #fff;
      color: #000;
      border: 2px solid #fff;
      border-radius: 0;
      padding: 6px 8px;
      font-family: Helvetica, Arial, sans-serif;
      font-size: 12px;
      cursor: pointer;
      outline: none;
      box-sizing: border-box;
      -webkit-appearance: none;
      appearance: none;
    }
    select.ascii-select:hover {
      background: #000;
      color: #fff;
    }
  `;
  document.head.appendChild(styleTag);

  input = createFileInput(handleFile);
  input.hide();

  uploadButton = createButton('upload image');
  styleButton(uploadButton);
  uploadButton.mousePressed(() => input.elt.click());

  pickSplashMessage();
  drawSplash();
}

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

  function apply(overrides = {}) {
    for (let [k, v] of Object.entries({ ...base, ...overrides })) {
      btn.elt.style.setProperty(k, v, 'important');
    }
  }

  apply();
  btn.elt.addEventListener('mouseenter', () => apply({ background: '#fff', color: '#000' }));
  btn.elt.addEventListener('mouseleave', () => apply());
}

function drawSplash() {
  background(255);
  fill(0);
  textAlign(CENTER, CENTER);

  let title = hasGeneratedOnce ? 'ascii art generator' : 'mia hellman';
  textSize(24);
  text(title, width / 2, height / 2 - 40);

  uploadButton.show();
  uploadButton.position(width / 2 - BTN_W / 2, height / 2);

  textSize(12);
  text(currentSplashMessage, width / 2, height / 2 + BTN_H + 25);
}

function windowResized() {
  if (imageLoaded) {
    if (newFileButton) newFileButton.hide();
    if (saveButton) saveButton.hide();
    if (controlsDiv) controlsDiv.hide();
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
  if (controlsDiv) controlsDiv.hide();
  buttonsShown = false;
}

function processImage() {
  asciiChars = [];
  drawIndex = 0;

  let imgAspect = img.height / img.width;
  let targetW, targetH;
  if (imgAspect > 1) {
    targetH = MAX_ART_SIZE;
    targetW = MAX_ART_SIZE / imgAspect;
  } else {
    targetW = MAX_ART_SIZE;
    targetH = MAX_ART_SIZE * imgAspect;
  }
  artW = floor(targetW / cellSize) * cellSize;
  artH = floor(targetH / cellSize) * cellSize;

  let canvasH = max(windowHeight, TOP_PAD + BTN_H + 20 + artH + BOTTOM_PAD);
  if (isNarrow()) canvasH += 320;

  resizeCanvas(windowWidth, canvasH);
  background(255);

  if (isNarrow()) {
    artX = floor((width - artW) / 2);
  } else {
    let rightAreaStart = PANEL_W + PANEL_MARGIN * 2;
    artX = rightAreaStart + floor((width - rightAreaStart - artW) / 2);
  }
  artY = TOP_PAD + BTN_H + 20;

  let work = img.get();
  work.resize(artW / cellSize, artH / cellSize);

  work.loadPixels();
  for (let i = 0; i < work.pixels.length; i += 4) {
    for (let j = 0; j < 3; j++) {
      let v = work.pixels[i + j] / 255;
      v = (v - 0.5) * contrast + 0.5;
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
  hasGeneratedOnce = true;
  textAlign(LEFT, TOP);
  textSize(cellSize);

  if (controlsDiv) positionControls();
}

function draw() {
  if (!imageLoaded) return;

  for (let i = 0; i < REVEAL_SPEED && drawIndex < asciiChars.length; i++) {
    let a = asciiChars[drawIndex++];
    fill(0);
    text(a.char, a.x, a.y);
  }

  if (drawIndex >= asciiChars.length && !buttonsShown) showButtons();
}

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

  if (!controlsDiv) buildControls();
  controlsDiv.show();
  positionControls();
}

function buildControls() {
  controlsDiv = createDiv();
  controlsDiv.style('position', 'fixed');
  controlsDiv.style('background', '#000');
  controlsDiv.style('color', '#fff');
  controlsDiv.style('padding', '16px');
  controlsDiv.style('font-family', 'Helvetica, Arial, sans-serif');
  controlsDiv.style('font-size', '12px');
  controlsDiv.style('width', PANEL_W - 32 + 'px');
  controlsDiv.style('border', '2px solid #000');
  controlsDiv.style('box-sizing', 'content-box');
  controlsDiv.style('z-index', '1000');

  //heading at the top of the panel
  let heading = createDiv('image settings');
  heading.parent(controlsDiv);
  heading.style('font-size', '14px');
  heading.style('font-weight', 'bold');
  heading.style('text-transform', 'uppercase');
  heading.style('letter-spacing', '1px');
  heading.style('margin-bottom', '12px');
  heading.style('padding-bottom', '8px');
  heading.style('border-bottom', '1px solid #fff');

  cellSizeSlider = addSlider('cell size', 3, 10, cellSize, 1, v => {
    cellSize = v;
    scheduleRegen();
  });
  contrastSlider = addSlider('contrast', 0.5, 2.5, contrast, 0.1, v => {
    contrast = v;
    scheduleRegen();
  });
  //style picker — built with direct DOM for reliability
  addDropdown('style', Object.keys(RAMPS), rampStyle, v => {
    rampStyle = v;
    scheduleRegen();
  });
}

function addSlider(labelText, min, max, val, step, onChange) {
  let label = createDiv(labelText);
  label.parent(controlsDiv);
  label.style('margin-top', '8px');
  label.style('margin-bottom', '4px');

  let slider = createSlider(min, max, val, step);
  slider.parent(controlsDiv);
  slider.addClass('ascii-slider');
  slider.input(() => onChange(slider.value()));
  return slider;
}

//creates a labeled dropdown using direct DOM (more reliable than createSelect)
function addDropdown(labelText, options, initialValue, onChange) {
  let label = createDiv(labelText);
  label.parent(controlsDiv);
  label.style('margin-top', '8px');
  label.style('margin-bottom', '4px');

  //build native select element directly
  let select = document.createElement('select');
  select.className = 'ascii-select';
  for (let opt of options) {
    let option = document.createElement('option');
    option.value = opt;
    option.textContent = opt;
    if (opt === initialValue) option.selected = true;
    select.appendChild(option);
  }
  select.addEventListener('change', () => onChange(select.value));
  controlsDiv.elt.appendChild(select);
  return select;
}

function positionControls() {
  if (isNarrow()) {
    controlsDiv.style('position', 'absolute');
    let panelX = max(10, floor((width - PANEL_W) / 2));
    controlsDiv.position(panelX, artY + artH + 30);
  } else {
    controlsDiv.style('position', 'fixed');
    controlsDiv.elt.style.left = PANEL_MARGIN + 'px';
    controlsDiv.elt.style.top = PANEL_MARGIN + 'px';
  }
}

function scheduleRegen() {
  if (regenTimer) clearTimeout(regenTimer);
  regenTimer = setTimeout(() => {
    if (saveButton) saveButton.hide();
    if (newFileButton) newFileButton.hide();
    buttonsShown = false;
    processImage();
  }, 150);
}

function resetToSplash() {
  imageLoaded = false;
  asciiChars = [];
  drawIndex = 0;
  buttonsShown = false;

  saveButton.hide();
  newFileButton.hide();
  if (controlsDiv) controlsDiv.hide();
  input.elt.value = '';

  pickSplashMessage();

  resizeCanvas(windowWidth, windowHeight);
  drawSplash();
}

function getAsciiChar(brightness) {
  let chars = RAMPS[rampStyle];
  return chars[floor(map(brightness, 0, 255, 0, chars.length - 1))];
}
