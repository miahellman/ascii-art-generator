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

//tracks whether the user has generated an image at least once
//used to swap the splash title from "mia hellman" to "ascii art generator"
let hasGeneratedOnce = false;

//slider controls (created after first generation)
let controlsDiv;
let cellSizeSlider;
let contrastSlider;
let rampSlider;
//timer handle for debouncing slider input
let regenTimer = null;

const BTN_W = 140;
const BTN_H = 36;
const MAX_ART_W = 800;
const TOP_PAD = 80;
const BOTTOM_PAD = 200;

//TWEAK: how many characters get revealed per frame
//bump this up if cellSize is small (lots of chars to draw)
//range: 200 (slow reveal) to 1000 (almost instant)
const REVEAL_SPEED = 500;

//TWEAK: starting contrast — sliders override this once visible
let contrast = 1.4;

//TWEAK: starting ramp length — sliders override this once visible
//0 = short chunky ramp, 1 = long detailed ramp
let rampDetail = 1;

//two ramps to choose between via the detail slider
const RAMP_SHORT = " .:-=+*#%@";
const RAMP_LONG = " .'`^\",:;Il!i><~+_-?][}{1)(|/\\tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";

//art bounds within the canvas
let artX = 0, artY = 0, artW = 0, artH = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  background(255);
  textFont('Helvetica');

  //inject css for the range sliders so they match the button style
  createElement('style', `
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
  `);

  input = createFileInput(handleFile);
  input.hide();

  uploadButton = createButton('upload image');
  styleButton(uploadButton);
  uploadButton.mousePressed(() => input.elt.click());

  drawSplash();
}

//styles a button with hover swap
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

//splash: title, button, instruction below
//title is "mia hellman" on first load, "ascii art generator" after that
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
  text('^ just do it', width / 2, height / 2 + BTN_H + 25);
}

//re-render at new size when window resizes
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

  //apply contrast boost
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

  //reposition the panel since the art bounds may have changed
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

//save + upload-new buttons, plus the slider control panel
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

//creates the slider panel — runs once after first generation
function buildControls() {
  controlsDiv = createDiv();
  controlsDiv.style('position', 'absolute');
  controlsDiv.style('background', '#000');
  controlsDiv.style('color', '#fff');
  controlsDiv.style('padding', '16px');
  controlsDiv.style('font-family', 'Helvetica, Arial, sans-serif');
  controlsDiv.style('font-size', '12px');
  controlsDiv.style('width', '160px');
  controlsDiv.style('border', '2px solid #000');
  controlsDiv.style('box-sizing', 'border-box');

  cellSizeSlider = addSlider('cell size', 3, 10, cellSize, 1, v => {
    cellSize = v;
    scheduleRegen();
  });
  contrastSlider = addSlider('contrast', 0.5, 2.5, contrast, 0.1, v => {
    contrast = v;
    scheduleRegen();
  });
  rampSlider = addSlider('detail', 0, 1, rampDetail, 1, v => {
    rampDetail = v;
    scheduleRegen();
  });
}

//helper that creates a labeled slider inside the controls panel
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

//places the panel beside the art on wide screens, below it on narrow ones
function positionControls() {
  //panel width (160) + padding (32) + 20px gap from art
  const PANEL_TOTAL_W = 220;
  let hasSideRoom = (artX + artW + PANEL_TOTAL_W) <= windowWidth;

  if (hasSideRoom) {
    controlsDiv.position(artX + artW + 20, artY);
  } else {
    let panelX = max(10, floor((width - 192) / 2));
    controlsDiv.position(panelX, artY + artH + 20);
  }
}

//debounced regen: wait 150ms after the last slider change before redrawing
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

  resizeCanvas(windowWidth, windowHeight);
  drawSplash();
}

//brightness (0-255) to ascii character
function getAsciiChar(brightness) {
  let chars = rampDetail === 1 ? RAMP_LONG : RAMP_SHORT;
  return chars[floor(map(brightness, 0, 255, 0, chars.length - 1))];
}
