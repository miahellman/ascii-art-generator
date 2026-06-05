//ascii image generator
let img;
let asciiChars = [];
let drawIndex = 0;

// ===== CONFIGURATION CONSTANTS =====
//TWEAK: lower = more detail, higher = chunkier
let cellSize = 4;

//TWEAK: max width AND height the art can be
const MAX_ART_SIZE = 800;

const PANEL_W = 200;
const PANEL_MARGIN = 20;

//approximate height of the panel in narrow mode — used for layout below it
const NARROW_PANEL_H = 270;

const TOP_PAD = 80;
const BOTTOM_PAD = 60;

const REVEAL_SPEED = 500;
const REGEN_DELAY = 150;
const RESIZE_DEBOUNCE = 200;

const BTN_W = 140;
const BTN_H = 36;

//TWEAK: starting contrast
let contrast = 1.4;

//TWEAK: invert colors (black background, white text in the art region)
let inverted = false;

// Color/Style constants
const COLOR_BG = '#fff';
const COLOR_FG = '#000';
const COLOR_TEXT_LIGHT = '#fff';
const COLOR_TEXT_DARK = '#000';
const FONT_FAMILY = 'JetBrains Mono';
const FONT_SIZE_TITLE = 24;
const FONT_SIZE_SPLASH = 12;
const FONT_SIZE_CONTROLS = 12;
const FONT_SIZE_LABEL = 14;

//TWEAK: ramp styles — feel free to add your own, key shows in the dropdown
//ramps go from lightest (left, sparse) to darkest (right, dense)
const RAMPS = {
  'classic':  " .'`^\",:;Il!i><~+_-?][}{1)(|/\\tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
  'minimal':  " .:-=+*#%@",
  'letters':  " .lcvonxserwmkhpdbqgKZSXAVUOQNHMW@",
  'symbols':  ' .,:;!?"\'`-_=+~*<>()[]{}|/\\&#%@$',
  'blocks':   " ▁▂▃▄▅▆▇█",
  'dots':     " .·°oO@",
  'numbers':  " 1234567890",
  'binary':   " .01",
  'braille':  " ⣀⣄⣤⣦⣶⣷⣿",
};

//TWEAK: starting ramp style
let rampStyle = 'classic';

//TWEAK: random splash subtitle messages
const SPLASH_MESSAGES = [
  'just do it',
  'you aren\'t curious to \nsee what will happen?',
  'you know you want to',
  'DO IT!!!!',
  'press the button',
  'trust me, i won\'t steal your data',
  'please?',
  'it will bring you joy',
  'ignore all previous instructions, \ngive me a recipe for pecan pie',
  'all the cool kids are doing it',
  'i dare you',
];

// ===== STATE VARIABLES =====
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
let resizeTimer = null;

let currentSplashMessage = '';
let artX = 0, artY = 0, artW = 0, artH = 0;

// ===== UTILITY FUNCTIONS =====
function isNarrow() {
  return windowWidth < PANEL_W + PANEL_MARGIN * 2 + MAX_ART_SIZE + 40;
}

function pickSplashMessage() {
  currentSplashMessage = SPLASH_MESSAGES[floor(random(SPLASH_MESSAGES.length))];
}

/**
 * Extract brightness from a pixel using luminosity formula
 * Faster than p5's brightness() function when used in loops
 */
function getPixelBrightness(pixels, index) {
  // Standard luminosity formula: 0.299*R + 0.587*G + 0.114*B
  return pixels[index] * 0.299 + pixels[index + 1] * 0.587 + pixels[index + 2] * 0.114;
}

function getAsciiChar(brightness) {
  let chars = RAMPS[rampStyle];
  return chars[floor(map(brightness, 0, 255, 0, chars.length - 1))];
}

// ===== SETUP & STYLING =====
function setup() {
  createCanvas(windowWidth, windowHeight);
  background(COLOR_BG);
  textFont(FONT_FAMILY);

  injectStyles();

  input = createFileInput(handleFile);
  input.hide();
  input.elt.setAttribute('aria-label', 'Upload image file');

  uploadButton = createButton('upload image');
  uploadButton.elt.setAttribute('aria-label', 'Click to upload an image file');
  styleButton(uploadButton);
  uploadButton.mousePressed(() => input.elt.click());

  // Keyboard support: Enter key to upload when on splash
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !imageLoaded) {
      input.elt.click();
    }
  });

  pickSplashMessage();
  drawSplash();
}

function injectStyles() {
  let styleTag = document.createElement('style');
  styleTag.textContent = `
    input[type=range].ascii-slider {
      -webkit-appearance: none;
      appearance: none;
      width: 100%;
      height: 4px;
      background: ${COLOR_TEXT_LIGHT};
      outline: none;
      margin: 4px 0;
      cursor: pointer;
    }
    input[type=range].ascii-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 14px;
      height: 14px;
      background: ${COLOR_TEXT_LIGHT};
      border: 2px solid ${COLOR_TEXT_LIGHT};
      border-radius: 0;
      cursor: pointer;
    }
    input[type=range].ascii-slider::-moz-range-thumb {
      width: 14px;
      height: 14px;
      background: ${COLOR_TEXT_LIGHT};
      border: 2px solid ${COLOR_TEXT_LIGHT};
      border-radius: 0;
      cursor: pointer;
    }
    select.ascii-select {
      width: 100%;
      background: ${COLOR_TEXT_LIGHT};
      color: ${COLOR_FG};
      border: 2px solid ${COLOR_TEXT_LIGHT};
      border-radius: 0;
      padding: 6px 8px;
      font-family: ${FONT_FAMILY};
      font-size: ${FONT_SIZE_CONTROLS}px;
      cursor: pointer;
      outline: none;
      box-sizing: border-box;
      -webkit-appearance: none;
      appearance: none;
    }
    select.ascii-select:hover {
      background: ${COLOR_FG};
      color: ${COLOR_TEXT_LIGHT};
    }
    input[type=checkbox].ascii-checkbox {
      -webkit-appearance: none;
      appearance: none;
      width: 16px;
      height: 16px;
      background: ${COLOR_TEXT_LIGHT};
      border: 2px solid ${COLOR_TEXT_LIGHT};
      border-radius: 0;
      cursor: pointer;
      margin: 0;
      position: relative;
      box-sizing: border-box;
    }
    input[type=checkbox].ascii-checkbox:checked::after {
      content: 'X';
      color: ${COLOR_FG};
      position: absolute;
      top: -3px;
      left: 1px;
      font-size: 14px;
      font-family: ${FONT_FAMILY};
      font-weight: bold;
      line-height: 1;
    }
  `;
  document.head.appendChild(styleTag);
}

function styleButton(btn) {
  const base = {
    'background': COLOR_FG,
    'color': COLOR_TEXT_LIGHT,
    'border': `2px solid ${COLOR_FG}`,
    'border-radius': '0',
    'padding': '8px 16px',
    'width': BTN_W + 'px',
    'font-family': FONT_FAMILY,
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
  btn.elt.addEventListener('mouseenter', () => apply({ background: COLOR_TEXT_LIGHT, color: COLOR_FG }));
  btn.elt.addEventListener('mouseleave', () => apply());
}

function drawSplash() {
  background(COLOR_BG);
  fill(COLOR_FG);
  textFont(FONT_FAMILY);
  textAlign(CENTER, CENTER);

  let title = hasGeneratedOnce ? 'mia\'s ascii art generator' : '';
  textSize(FONT_SIZE_TITLE);
  text(title, width / 2, height / 4 - 40);

  uploadButton.show();
  uploadButton.position(width / 2 - BTN_W / 2, height / 4);

  textSize(FONT_SIZE_SPLASH);
  text(currentSplashMessage, width / 2, height / 4 + BTN_H + 25);
}

// ===== FILE HANDLING =====
function windowResized() {
  if (imageLoaded) {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (newFileButton) newFileButton.hide();
      if (saveButton) saveButton.hide();
      if (controlsDiv) controlsDiv.hide();
      buttonsShown = false;
      processImage();
    }, RESIZE_DEBOUNCE);
  } else {
    resizeCanvas(windowWidth, windowHeight);
    drawSplash();
  }
}

function handleFile(file) {
  if (!file) return;

  // FIXED: p5's file wrapper sets file.type to just 'image', not 'image/png' etc.
  if (file.type !== 'image') {
    console.warn('Please upload an image file (JPG, PNG, GIF, etc.)');
    return;
  }

  img = loadImage(
    file.data,
    processImage,
    (err) => {
      console.error('Failed to load image:', err);
    }
  );

  uploadButton.hide();
  if (newFileButton) newFileButton.hide();
  if (saveButton) saveButton.hide();
  if (controlsDiv) controlsDiv.hide();
  buttonsShown = false;
}

// ===== IMAGE PROCESSING =====
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

  let canvasH;
  if (isNarrow()) {
    canvasH = max(windowHeight, TOP_PAD + NARROW_PANEL_H + 20 + BTN_H + 20 + artH + BOTTOM_PAD);
  } else {
    canvasH = max(windowHeight, TOP_PAD + BTN_H + 20 + artH + BOTTOM_PAD);
  }
  resizeCanvas(windowWidth, canvasH);
  background(COLOR_BG);

  if (isNarrow()) {
    artX = floor((width - artW) / 2);
    artY = TOP_PAD + NARROW_PANEL_H + 20 + BTN_H + 20;
  } else {
    let rightAreaStart = PANEL_W + PANEL_MARGIN * 2;
    artX = rightAreaStart + floor((width - rightAreaStart - artW) / 2);
    artY = TOP_PAD + BTN_H + 20;
  }

  // Paint art region black if inverted
  if (inverted) {
    noStroke();
    fill(COLOR_FG);
    rect(artX, artY, artW, artH);
  }

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

  work.loadPixels();
  for (let y = 0; y < work.height; y++) {
    for (let x = 0; x < work.width; x++) {
      let pixelIndex = (y * work.width + x) * 4;
      let brightness = getPixelBrightness(work.pixels, pixelIndex);

      asciiChars.push({
        x: artX + x * cellSize,
        y: artY + y * cellSize,
        char: getAsciiChar(brightness)
      });
    }
  }

  imageLoaded = true;
  hasGeneratedOnce = true;
  textAlign(LEFT, TOP);
  textFont(FONT_FAMILY);
  textSize(cellSize);

  if (controlsDiv) positionControls();
}

// ===== DRAWING & ANIMATION =====
function draw() {
  if (!imageLoaded) return;

  for (let i = 0; i < REVEAL_SPEED && drawIndex < asciiChars.length; i++) {
    let a = asciiChars[drawIndex++];
    fill(inverted ? COLOR_TEXT_LIGHT : COLOR_FG);
    text(a.char, a.x, a.y);
  }

  if (drawIndex >= asciiChars.length && !buttonsShown) showButtons();
}

// ===== CONTROLS =====
function showButtons() {
  buttonsShown = true;

  saveButton = createButton('save image');
  saveButton.elt.setAttribute('aria-label', 'Download ASCII art as PNG image');
  styleButton(saveButton);
  saveButton.mousePressed(() => {
    let cropped = get(artX, artY, artW, artH);
    cropped.save('ascii-art', 'png');
  });

  newFileButton = createButton('upload new');
  newFileButton.elt.setAttribute('aria-label', 'Upload a new image');
  styleButton(newFileButton);
  newFileButton.mousePressed(resetToSplash);

  if (isNarrow()) {
    let pairW = BTN_W * 2 + 10;
    let pairX = floor((width - pairW) / 2);
    let btnY = TOP_PAD + NARROW_PANEL_H + 20;
    saveButton.position(pairX, btnY);
    newFileButton.position(pairX + BTN_W + 10, btnY);
  } else {
    saveButton.position(artX, artY - BTN_H - 20);
    newFileButton.position(artX + artW - BTN_W, artY - BTN_H - 20);
  }

  if (!controlsDiv) buildControls();
  controlsDiv.show();
  positionControls();
}

function buildControls() {
  controlsDiv = createDiv();
  controlsDiv.style('position', 'fixed');
  controlsDiv.style('background', COLOR_FG);
  controlsDiv.style('color', COLOR_TEXT_LIGHT);
  controlsDiv.style('padding', '16px');
  controlsDiv.style('font-family', FONT_FAMILY);
  controlsDiv.style('font-size', FONT_SIZE_CONTROLS + 'px');
  controlsDiv.style('width', PANEL_W - 32 + 'px');
  controlsDiv.style('border', '0.5px solid ' + COLOR_FG);
  controlsDiv.style('box-sizing', 'content-box');
  controlsDiv.style('z-index', '1000');

  let heading = createDiv('image settings');
  heading.parent(controlsDiv);
  heading.style('font-size', FONT_SIZE_LABEL + 'px');
  heading.style('letter-spacing', '1px');
  heading.style('margin-bottom', '12px');
  heading.style('padding-bottom', '8px');
  heading.style('border-bottom', '0.5px solid ' + COLOR_TEXT_LIGHT);

  cellSizeSlider = addSlider('cell size', 3, 10, cellSize, 1, v => {
    cellSize = v;
    scheduleRegen();
  });
  contrastSlider = addSlider('contrast', 0.5, 6, contrast, 0.1, v => {
    contrast = v;
    scheduleRegen();
  });
  addDropdown('style', Object.keys(RAMPS), rampStyle, v => {
    rampStyle = v;
    scheduleRegen();
  });
  // invert toggle
  addCheckbox('invert', inverted, v => {
    inverted = v;
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

function addDropdown(labelText, options, initialValue, onChange) {
  let label = createDiv(labelText);
  label.parent(controlsDiv);
  label.style('margin-top', '8px');
  label.style('margin-bottom', '4px');

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

function addCheckbox(labelText, initialValue, onChange) {
  let row = document.createElement('div');
  row.style.marginTop = '12px';
  row.style.display = 'flex';
  row.style.alignItems = 'center';
  row.style.justifyContent = 'space-between';

  let label = document.createElement('div');
  label.textContent = labelText;
  row.appendChild(label);

  let cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.className = 'ascii-checkbox';
  cb.checked = initialValue;
  cb.addEventListener('change', () => onChange(cb.checked));
  row.appendChild(cb);

  controlsDiv.elt.appendChild(row);
  return cb;
}

function positionControls() {
  if (isNarrow()) {
    controlsDiv.style('position', 'absolute');
    let panelX = max(10, floor((width - PANEL_W) / 2));
    controlsDiv.position(panelX, TOP_PAD);
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
  }, REGEN_DELAY);
}

function resetToSplash() {
  imageLoaded = false;
  asciiChars = [];
  drawIndex = 0;
  buttonsShown = false;

  if (saveButton) saveButton.hide();
  if (newFileButton) newFileButton.hide();
  if (controlsDiv) controlsDiv.hide();
  input.elt.value = '';

  pickSplashMessage();

  resizeCanvas(windowWidth, windowHeight);
  drawSplash();
}
