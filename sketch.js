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

//TWEAK: invert colors
let inverted = true;

// Demo image config
const DEMO_FILES = ['images/1.jpg', 'images/2.png', 'images/3.jpg', 'images/4.jpg', 'images/5.jpg', 'images/m.png', 'images/i.png', /*'images/a.png',*/ 'images/h.png'];

//TWEAK: total number of demos floating around — cycles through DEMO_FILES if higher than file count
const DEMO_COUNT = 8;
//TWEAK: cell size for the demos
const DEMO_CELL_SIZE = 7;
//TWEAK: how fast the demos drift
const DEMO_BASE_SPEED = 0.8;
//TWEAK: extra pixels beyond image edge that still triggers hover
const DEMO_HOVER_PAD = 20;
//TWEAK: how far chars fly when dispersed
const DEMO_DISPERSE_DIST = 75;
//TWEAK: smoothing factor — higher = snappier animation
const DEMO_LERP = 0.1;
//TWEAK: settle threshold for swapping back to buffer rendering
const DEMO_SETTLE_THRESHOLD = .75;
//TWEAK: collision radius as a fraction of demo size — lower = more overlap before bouncing
const COLLISION_RADIUS_SCALE = 0.75;

//TWEAK: demo size — small on mobile, medium on tablet, large on desktop
const DEMO_TARGET_SIZE_MOBILE = 100;
const DEMO_TARGET_SIZE_TABLET = 200;
const DEMO_TARGET_SIZE_DESKTOP = 300;
//TWEAK: breakpoints for the size tiers (in pixels)
const MOBILE_BREAKPOINT = 600;
const TABLET_BREAKPOINT = 1060;

const COLOR_BG = '#fff';
const COLOR_FG = '#000';
const COLOR_TEXT_LIGHT = '#fff';
const COLOR_TEXT_DARK = '#000';
//TWEAK: error message color
const COLOR_ERROR = '#cc0000';
const FONT_FAMILY = 'JetBrains Mono';
const FONT_SIZE_TITLE = 24;
const FONT_SIZE_SPLASH = 12;
const FONT_SIZE_CONTROLS = 12;
const FONT_SIZE_LABEL = 14;

//TWEAK: error messages
const ERROR_MESSAGE = 'incorrect file type.\nuse: jpg, png, or webp';
const ERROR_MESSAGE_HEIC = 'heic files won\'t work :(\nconvert to jpg or png first';
const ERROR_MESSAGE_GIF = 'this is an image generator —\ngifs aren\'t supported. try a still image.';

//file extensions we accept (jpg and jpeg are the same format, both included for filename matching)
const ACCEPTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

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

let rampStyle = 'classic';

const SPLASH_MESSAGES = [
  'just do it',
  'you aren\'t curious to \nsee what will happen?',
  'you know you want to',
  'trust me, i won\'t steal your data',
  'it will bring you joy',
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
//error state — when set, splash shows this in red instead of the random message
let splashErrorMessage = null;

let artX = 0, artY = 0, artW = 0, artH = 0;

let demoRawImages = [];
let demoImages = [];

// ===== PRELOAD =====
function preload() {
  for (let f of DEMO_FILES) {
    demoRawImages.push(loadImage(
      f,
      null,
      () => console.warn('Could not load demo image:', f)
    ));
  }
}

// ===== UTILITY FUNCTIONS =====
function isNarrow() {
  return windowWidth < PANEL_W + PANEL_MARGIN * 2 + MAX_ART_SIZE + 40;
}

//returns the demo target size for the current viewport
function getDemoTargetSize() {
  if (windowWidth < MOBILE_BREAKPOINT) return DEMO_TARGET_SIZE_MOBILE;
  if (windowWidth < TABLET_BREAKPOINT) return DEMO_TARGET_SIZE_TABLET;
  return DEMO_TARGET_SIZE_DESKTOP;
}

function pickSplashMessage() {
  currentSplashMessage = SPLASH_MESSAGES[floor(random(SPLASH_MESSAGES.length))];
}

function getPixelBrightness(pixels, index) {
  return pixels[index] * 0.299 + pixels[index + 1] * 0.587 + pixels[index + 2] * 0.114;
}

function getAsciiChar(brightness) {
  let chars = RAMPS[rampStyle];
  return chars[floor(map(brightness, 0, 255, 0, chars.length - 1))];
}

// ===== DEMO IMAGES =====
function initDemoImages() {
  demoImages = [];
  let validRaws = demoRawImages.filter(r => r && r.width);
  if (validRaws.length === 0) return;

  for (let i = 0; i < DEMO_COUNT; i++) {
    let raw = validRaws[i % validRaws.length];
    demoImages.push(createDemo(raw));
  }
}

function createDemo(raw) {
  let size = getDemoTargetSize();
  let aspect = raw.height / raw.width;
  let w, h;
  if (aspect > 1) {
    h = size;
    w = size / aspect;
  } else {
    w = size;
    h = size * aspect;
  }

  let cellsX = floor(w / DEMO_CELL_SIZE);
  let cellsY = floor(h / DEMO_CELL_SIZE);

  let work = raw.get();
  work.resize(cellsX, cellsY);
  work.loadPixels();

  let chars = [];
  for (let y = 0; y < cellsY; y++) {
    for (let x = 0; x < cellsX; x++) {
      let idx = (y * cellsX + x) * 4;
      let b = getPixelBrightness(work.pixels, idx);
      let ch = getAsciiChar(b);

      let ox = (x - cellsX / 2) * DEMO_CELL_SIZE;
      let oy = (y - cellsY / 2) * DEMO_CELL_SIZE;

      let angle = random(TWO_PI);

      chars.push({
        ox: ox, oy: oy,
        cx: ox, cy: oy,
        char: ch,
        dispX: cos(angle),
        dispY: sin(angle),
      });
    }
  }

  let actualW = cellsX * DEMO_CELL_SIZE;
  let actualH = cellsY * DEMO_CELL_SIZE;

  //pre-render to offscreen buffer for fast blitting when at rest
  let buffer = createGraphics(actualW, actualH);
  buffer.textFont(FONT_FAMILY);
  buffer.textSize(DEMO_CELL_SIZE);
  buffer.textAlign(LEFT, TOP);
  buffer.fill(COLOR_FG);
  buffer.noStroke();
  buffer.clear();
  for (let c of chars) {
    if (c.char !== ' ') {
      buffer.text(c.char, c.ox + actualW / 2, c.oy + actualH / 2);
    }
  }

  return {
    chars: chars,
    buffer: buffer,
    dispersed: false,
    x: random(actualW, windowWidth - actualW),
    y: random(actualH, windowHeight - actualH),
    vx: random([-1, 1]) * DEMO_BASE_SPEED * random(0.6, 1.4),
    vy: random([-1, 1]) * DEMO_BASE_SPEED * random(0.6, 1.4),
    w: actualW,
    h: actualH,
  };
}

/**
 * Pairwise collision resolution between demos
 */
function resolveDemoCollisions() {
  for (let i = 0; i < demoImages.length; i++) {
    for (let j = i + 1; j < demoImages.length; j++) {
      let a = demoImages[i];
      let b = demoImages[j];

      let dx = b.x - a.x;
      let dy = b.y - a.y;
      let distSq = dx * dx + dy * dy;

      //shrink effective radii so demos overlap a bit before bouncing
      let ra = max(a.w, a.h) / 2 * COLLISION_RADIUS_SCALE;
      let rb = max(b.w, b.h) / 2 * COLLISION_RADIUS_SCALE;
      let minDist = ra + rb;

      if (distSq < minDist * minDist && distSq > 0) {
        let dist = sqrt(distSq);
        let nx = dx / dist;
        let ny = dy / dist;

        let va = a.vx * nx + a.vy * ny;
        let vb = b.vx * nx + b.vy * ny;

        if (va - vb > 0) {
          a.vx += (vb - va) * nx;
          a.vy += (vb - va) * ny;
          b.vx += (va - vb) * nx;
          b.vy += (va - vb) * ny;
        }

        let overlap = (minDist - dist) / 2;
        a.x -= nx * overlap;
        a.y -= ny * overlap;
        b.x += nx * overlap;
        b.y += ny * overlap;
      }
    }
  }
}

function drawDemos() {
  // Pass 1: move + bounce off walls
  for (let d of demoImages) {
    d.x += d.vx;
    d.y += d.vy;

    if (d.x < d.w / 2) { d.x = d.w / 2; d.vx *= -1; }
    if (d.x > width - d.w / 2) { d.x = width - d.w / 2; d.vx *= -1; }
    if (d.y < d.h / 2) { d.y = d.h / 2; d.vy *= -1; }
    if (d.y > height - d.h / 2) { d.y = height - d.h / 2; d.vy *= -1; }
  }

  // Pass 2: pairwise collisions
  resolveDemoCollisions();

  // Pass 3: hover detection + drawing
  for (let d of demoImages) {
    let dx = mouseX - d.x;
    let dy = mouseY - d.y;
    let distSq = dx * dx + dy * dy;
    let hoverRadius = max(d.w, d.h) / 2 + DEMO_HOVER_PAD;
    let hovered = distSq < hoverRadius * hoverRadius;

    if (!hovered && !d.dispersed) {
      //FAST PATH: blit pre-rendered buffer (one call instead of thousands)
      image(d.buffer, d.x - d.w / 2, d.y - d.h / 2);
    } else {
      //SLOW PATH: per-char render with text()
      textSize(DEMO_CELL_SIZE);
      textAlign(LEFT, TOP);
      textFont(FONT_FAMILY);
      fill(COLOR_FG);
      noStroke();

      let maxDelta = 0;
      for (let c of d.chars) {
        let targetX = hovered ? c.ox + c.dispX * DEMO_DISPERSE_DIST : c.ox;
        let targetY = hovered ? c.oy + c.dispY * DEMO_DISPERSE_DIST : c.oy;
        c.cx = lerp(c.cx, targetX, DEMO_LERP);
        c.cy = lerp(c.cy, targetY, DEMO_LERP);

        let delta = abs(c.cx - c.ox) + abs(c.cy - c.oy);
        if (delta > maxDelta) maxDelta = delta;

        if (c.char !== ' ') text(c.char, d.x + c.cx, d.y + c.cy);
      }

      //snap chars to home when fully settled, then flip back to buffer rendering
      if (!hovered && maxDelta <= DEMO_SETTLE_THRESHOLD) {
        for (let c of d.chars) {
          c.cx = c.ox;
          c.cy = c.oy;
        }
        d.dispersed = false;
      } else {
        d.dispersed = true;
      }
    }
  }
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
  //restrict the file picker to supported formats (still images only — no gif, no heic)
  input.elt.setAttribute('accept', 'image/jpeg, image/png, image/webp');

  uploadButton = createButton('get creative');
  uploadButton.elt.setAttribute('aria-label', 'Click to upload an image file');
  styleButton(uploadButton);
  uploadButton.mousePressed(() => input.elt.click());

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !imageLoaded) {
      input.elt.click();
    }
  });

  initDemoImages();
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
  uploadButton.show();
  uploadButton.position(width / 2 - BTN_W / 2, height / 4);
}

function drawSplashOverlay() {
  textFont(FONT_FAMILY);
  textAlign(CENTER, CENTER);

  let title = ' ';
  textSize(FONT_SIZE_TITLE);
  fill(COLOR_FG);
  text(title, width / 2, height / 4 - 40);

  //show error in red if set, otherwise show the random splash message
  textSize(FONT_SIZE_SPLASH);
  if (splashErrorMessage) {
    fill(COLOR_ERROR);
    text(splashErrorMessage, width / 2, height / 4 + BTN_H + 25);
  } else {
    fill(COLOR_FG);
    text(currentSplashMessage, width / 2, height / 4 + BTN_H + 25);
  }
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
    //regenerate demos if we crossed a viewport boundary
    let firstDemoSize = demoImages.length > 0 ? max(demoImages[0].w, demoImages[0].h) : 0;
    let targetSize = getDemoTargetSize();
    if (abs(firstDemoSize - targetSize) > 50) {
      initDemoImages();
    }
    drawSplash();
  }
}

function handleFile(file) {
  if (!file) return;

  //clear any previous error
  splashErrorMessage = null;

  //reject non-image categories (video, audio, application, etc)
  if (file.type !== 'image') {
    splashErrorMessage = ERROR_MESSAGE;
    return;
  }

  //inspect filename to catch types we can't handle even though browser calls them images
  let filename = (file.name || '').toLowerCase();

  //gifs are animated — this is a still image generator
  if (filename.endsWith('.gif')) {
    splashErrorMessage = ERROR_MESSAGE_GIF;
    return;
  }

  //heic doesn't work on canvas operations across browsers
  if (filename.endsWith('.heic') || filename.endsWith('.heif')) {
    splashErrorMessage = ERROR_MESSAGE_HEIC;
    return;
  }

  //also check the file extension matches our accepted list
  //(catches tiff, bmp, svg, etc that browsers may or may not decode reliably)
  let hasValidExtension = ACCEPTED_EXTENSIONS.some(ext => filename.endsWith(ext));
  if (filename && !hasValidExtension) {
    splashErrorMessage = ERROR_MESSAGE;
    return;
  }

  //try to load — if browser can't decode for some reason, error callback handles it
  //NOTE: ui cleanup (hiding button etc) happens in processImage on success, NOT here
  img = loadImage(
    file.data,
    processImage,
    (err) => {
      console.error('Failed to load image:', err);
      splashErrorMessage = ERROR_MESSAGE;
    }
  );
}

// ===== IMAGE PROCESSING =====
function processImage() {
  //clear error and hide splash UI now that we know the image loaded successfully
  splashErrorMessage = null;
  uploadButton.hide();
  if (newFileButton) newFileButton.hide();
  if (saveButton) saveButton.hide();
  if (controlsDiv) controlsDiv.hide();
  buttonsShown = false;

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
  if (!imageLoaded) {
    background(COLOR_BG);
    drawDemos();
    drawSplashOverlay();
    return;
  }

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
  splashErrorMessage = null;

  if (saveButton) saveButton.hide();
  if (newFileButton) newFileButton.hide();
  if (controlsDiv) controlsDiv.hide();
  input.elt.value = '';

  resizeCanvas(windowWidth, windowHeight);
  drawSplash();
}