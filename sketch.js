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

//slider controls
let controlsDiv;
let cellSizeSlider;
let contrastSlider;
let rampSlider;
let regenTimer = null;

const BTN_W = 140;
const BTN_H = 36;

//TWEAK: max width AND height the art can be — image scales down to fit inside this box
const MAX_ART_SIZE = 550;

//panel total width including padding + border, used for layout math
const PANEL_W = 192;
//gap between panel and art on wide screens
const COL_GAP = 30;

const TOP_PAD = 80;
const BOTTOM_PAD = 40;

//TWEAK: how many characters get revealed per frame
const REVEAL_SPEED = 500;

//TWEAK: starting contrast — sliders override this once visible
let contrast = 1.4;

//TWEAK: starting ramp length — 0 = short chunky, 1 = long detailed
let rampDetail = 1;

const RAMP_SHORT = " .:-=+*#%@";
const RAMP_LONG = " .'`^\",:;Il!i><~+_-?][}{1)(|/\\tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";

//art bounds within the canvas
let artX = 0, artY = 0, artW = 0, artH = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  background(255);
  textFont('Helvetica');

  //inject css for the range sliders so they match the button style
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
  `;
  document.head.appendChild(styleTag);

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

//splash screen
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

  //scale image to fit within MAX_ART_SIZE x MAX_ART_SIZE, preserving aspect ratio
  let imgAspect = img.height / img.width;
  let targetW, targetH;
  if (imgAspect > 1) {
    //taller than wide: height is the constraint
    targetH = MAX_ART_SIZE;
    targetW = MAX_ART_SIZE / imgAspect;
  } else {
    //wider than tall: width is the constraint
    targetW = MAX_ART_SIZE;
    targetH = MAX_ART_SIZE * imgAspect;
  }
  //round to multiples of cellSize for a clean grid
  artW = floor(targetW / cellSize) * cellSize;
  artH = floor(targetH / cellSize) * cellSize;

  //decide layout based on available width
  //wide: panel + gap + art fits in window
  //narrow: stack panel below art
  let wideLayout = (PANEL_W + COL_GAP + artW + 40) <= windowWidth;

  //compute canvas height based on layout
  let canvasH;
  if (wideLayout) {
    //tallest column wins (art column includes buttons above it)
    let artColH = BTN_H + 20 + artH;
    let panelColH = 220; //approximate panel height — adjust if you add more sliders
    canvasH = TOP_PAD + max(artColH, panelColH) + BOTTOM_PAD;
  } else {
    //stacked: buttons + art + gap + panel
    canvasH = TOP_PAD + BTN_H + 20 + artH + 30 + 220 + BOTTOM_PAD;
  }
  canvasH = max(windowHeight, canvasH);

  resizeCanvas(windowWidth, canvasH);
  background(255);

  //position the art column
  if (wideLayout) {
    //panel on left, art on right — center the combined block
    let totalW = PANEL_W + COL_GAP + artW;
    let blockX = floor((width - totalW) / 2);
    artX = blockX + PANEL_W + COL_GAP;
    artY = TOP_PAD + BTN_H + 20; //leave room for buttons above
  } else {
    //art centered, full width if it fits
    artX = floor((width - artW) / 2);
    artY = TOP_PAD + BTN_H + 20;
  }

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

  if (controlsDiv) positionControls(wideLayout);
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

  //save in top-left of art, upload-new in top-right
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
  //figure out current layout for positioning
  let wideLayout = (PANEL_W + COL_GAP + artW + 40) <= windowWidth;
  positionControls(wideLayout);
}

//creates the slider panel — runs once
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
  controlsDiv.style('z-index', '1000');

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

//positions the panel — left of art on wide layouts, below art on narrow
function positionControls(wideLayout) {
  if (wideLayout) {
    //panel on the left, aligned with the buttons at the top of the art column
    let panelX = artX - COL_GAP - PANEL_W;
    let panelY = artY - BTN_H - 20; //align top with buttons
    controlsDiv.position(panelX, panelY);
  } else {
    //below the art, horizontally centered
    let panelX = max(10, floor((width - PANEL_W) / 2));
    controlsDiv.position(panelX, artY + artH + 30);
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

  resizeCanvas(windowWidth, windowHeight);
  drawSplash();
}

function getAsciiChar(brightness) {
  let chars = rampDetail === 1 ? RAMP_LONG : RAMP_SHORT;
  return chars[floor(map(brightness, 0, 255, 0, chars.length - 1))];
}
