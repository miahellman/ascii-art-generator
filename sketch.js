//ascii image generator
let img;
let asciiChars = [];
let drawIndex = 0;

// ===== CONFIGURATION CONSTANTS =====
//TWEAK: max width AND height the art can be
const MAX_ART_SIZE = 800;

const PANEL_W = 224;
const PANEL_MARGIN = 16;
const PANEL_GAP = 12;

//viewport narrower than this stacks the panels instead of floating them
const NARROW_BREAKPOINT = 900;

const BOTTOM_PAD = 60;

const REVEAL_SPEED = 500;
const REGEN_DELAY = 150;
const RESIZE_DEBOUNCE = 200;

const BTN_W = 140;
const BTN_H = 40;

// ===== SETTINGS (all user-adjustable via panels) =====
const settings = {
  //ascii fx — when off, cells render as gray pixel blocks instead of chars
  asciiEnabled: true,
  //TWEAK: lower = more detail, higher = chunkier
  cellSize: 4,
  rampStyle: 'classic',
  //preprocess
  brightness: 0,   // -0.5 .. 0.5 added to luminance
  contrast: 1.4,   // 0.5 .. 6
  gamma: 1.0,      // 0.25 .. 2.5
  blur: 0,         // 0 .. 4 px box blur radius
  //off = image reads normal (as uploaded), on = negative
  inverted: false,
  //dither fx — independent of ascii so either/both can be on
  ditherEnabled: false,
  ditherMode: 'floyd-steinberg',
  //pixel size only applies when ascii is off — ascii cell size wins otherwise
  ditherPixelSize: 1, // 1 .. 10
  ditherThreshold: 0.5, // 0 .. 1 tone bias before quantization
  ditherLevels: 4, // 2 .. 8 steps between the two monochrome colors
  palette: 'monochrome',
};

//sampling resolution: ascii cell size when ascii is on; otherwise the dither
//pixel size, or full 1px resolution when both fx are off
function getSampleSize() {
  if (settings.asciiEnabled) return settings.cellSize;
  if (settings.ditherEnabled) return settings.ditherPixelSize;
  return 1;
}

//ditherboy-style palettes, ordered dark -> light; 'monochrome' is exactly two
//colors and the levels slider interpolates between them. All colors editable.
const PALETTES = {
  'monochrome':  ['#000000', '#ffffff'],
  'radioactive': ['#2c2929', '#6b2c33', '#b0333a', '#ea4e29', '#f88a04', '#c6c307', '#89f329', '#b6cdae'],
  'gameboy':     ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'],
  'ocean':       ['#03045e', '#0077b6', '#00b4d8', '#90e0ef', '#caf0f8'],
  'matrix':      ['#0d0208', '#003b00', '#008f11', '#00ff41'],
  'vaporwave':   ['#2d1b69', '#7b2d8b', '#ff6ec7', '#01cdfe', '#fffb96'],
};
const MAX_PALETTE_COLORS = 8;
//working copies so edits don't clobber the defaults
const paletteColors = {};
for (const k in PALETTES) paletteColors[k] = [...PALETTES[k]];

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
//TWEAK: snappier lerp for the return trip — shortens how long a released demo
//stays on the expensive per-char path
const DEMO_SETTLE_LERP = 0.22;
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

const COLOR_BG = '#ffffff';
const COLOR_FG = '#111111';
const COLOR_TEXT_LIGHT = '#ffffff';
//TWEAK: error message color
const COLOR_ERROR = '#cc0000';
const FONT_FAMILY = 'JetBrains Mono';
const FONT_SIZE_SPLASH = 12;

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

const DITHER_MODES = ['floyd-steinberg', 'atkinson', 'bayer 2x2', 'bayer 4x4', 'bayer 8x8'];

//bayer threshold matrices for ordered dithering — bigger matrix = smoother gradients
const BAYER_MATRICES = {
  'bayer 2x2': [
    [0, 2],
    [3, 1],
  ],
  'bayer 4x4': [
    [ 0,  8,  2, 10],
    [12,  4, 14,  6],
    [ 3, 11,  1,  9],
    [15,  7, 13,  5],
  ],
  'bayer 8x8': [
    [ 0, 32,  8, 40,  2, 34, 10, 42],
    [48, 16, 56, 24, 50, 18, 58, 26],
    [12, 44,  4, 36, 14, 46,  6, 38],
    [60, 28, 52, 20, 62, 30, 54, 22],
    [ 3, 35, 11, 43,  1, 33,  9, 41],
    [51, 19, 59, 27, 49, 17, 57, 25],
    [15, 47,  7, 39, 13, 45,  5, 37],
    [63, 31, 55, 23, 61, 29, 53, 21],
  ],
};

//error-diffusion kernels: [dx, dy, weight]
const DIFFUSION_KERNELS = {
  'floyd-steinberg': [[1, 0, 7 / 16], [-1, 1, 3 / 16], [0, 1, 5 / 16], [1, 1, 1 / 16]],
  'atkinson': [[1, 0, 1 / 8], [2, 0, 1 / 8], [-1, 1, 1 / 8], [0, 1, 1 / 8], [1, 1, 1 / 8], [0, 2, 1 / 8]],
};

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
let regenTimer = null;
let resizeTimer = null;

let currentSplashMessage = '';
//error state — when set, splash shows this in red instead of the random message
let splashErrorMessage = null;

let artX = 0, artY = 0, artW = 0, artH = 0;
//sampling size the current art was generated at (settings can change mid-debounce)
let artCS = 4;
//per-level fill strings for colored ascii chars — null renders single-color
let revealFills = null;
//pixel mode renders into this buffer, revealed in scaled row strips
let pixelBuf = null;
let revealRow = 0;
let revealBand = 1;

let demoRawImages = [];
let demoImages = [];
let demosReady = false;

//glyph sprite atlas — all demo chars pre-rendered into ONE canvas so the hover
//disperse effect is a stream of same-source drawImage calls (no text(), no
//per-glyph canvas switching) and stays at 60fps even at fullscreen demo sizes
let glyphAtlas = null;

//editor chrome
let dock = null;
let panels = [];
let panelZ = 700;
let syncDitherFn = null;
let colorSwatchWrap = null;

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
  return windowWidth < NARROW_BREAKPOINT;
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

//maps a 0..1 luminance to a ramp char
function getAsciiChar(l) {
  let chars = RAMPS[settings.rampStyle];
  return chars[min(chars.length - 1, floor(l * chars.length))];
}

function hexToRgb(h) {
  h = h.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

//the color list quantization maps onto — null when dithering is off.
//monochrome: ditherLevels steps interpolated between its two colors;
//other palettes: the colors as listed (dark -> light)
function activeDitherColors() {
  if (!settings.ditherEnabled) return null;
  const hexes = paletteColors[settings.palette];
  if (settings.palette === 'monochrome') {
    const a = hexToRgb(hexes[0]);
    const b = hexToRgb(hexes[1]);
    const K = settings.ditherLevels;
    const out = [];
    for (let i = 0; i < K; i++) {
      const t = i / (K - 1);
      out.push([round(lerp(a[0], b[0], t)), round(lerp(a[1], b[1], t)), round(lerp(a[2], b[2], t))]);
    }
    return out;
  }
  return hexes.map(hexToRgb);
}

// ===== DEMO IMAGES =====
function initDemoImages() {
  demoImages = [];
  if (!glyphAtlas) buildGlyphAtlas();
  let validRaws = demoRawImages.filter(r => r && r.width);
  if (validRaws.length === 0) return;

  for (let i = 0; i < DEMO_COUNT; i++) {
    let raw = validRaws[i % validRaws.length];
    demoImages.push(createDemo(raw));
  }
  demosReady = true;
}

//demos always use the classic ramp so the splash look doesn't depend on
//whatever style the user last picked in the editor
function classicChar(l) {
  const chars = RAMPS.classic;
  return chars[min(chars.length - 1, floor(l * chars.length))];
}

//renders every classic-ramp glyph into one spritesheet canvas
//cells are kept as tight as possible — sprite blit cost scales with pixel area
function buildGlyphAtlas() {
  const pad = 2;
  const cell = ceil(DEMO_CELL_SIZE * 1.4) + pad * 2;
  const chars = [...new Set(RAMPS.classic)].filter(c => c !== ' ');

  const gr = createGraphics(cell * chars.length, cell);
  gr.textFont(FONT_FAMILY);
  gr.textSize(DEMO_CELL_SIZE);
  gr.textAlign(LEFT, TOP);
  gr.noStroke();
  gr.fill(COLOR_FG);
  gr.clear();

  const d = gr.pixelDensity();
  const map = {};
  chars.forEach((ch, i) => {
    gr.text(ch, i * cell + pad, pad);
    //source rect in device px, destination size in logical px
    map[ch] = { sx: i * cell * d, sd: cell * d, cell: cell, pad: pad };
  });
  glyphAtlas = { elt: gr.elt, map: map };
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
      let b = getPixelBrightness(work.pixels, idx) / 255;
      let ch = classicChar(b);
      if (ch === ' ') continue; //spaces are invisible — skip them entirely

      let ox = (x - cellsX / 2) * DEMO_CELL_SIZE;
      let oy = (y - cellsY / 2) * DEMO_CELL_SIZE;

      let angle = random(TWO_PI);

      chars.push({
        ox: ox, oy: oy,
        cx: ox, cy: oy,
        glyph: glyphAtlas.map[ch],
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
    buffer.text(c.char, c.ox + actualW / 2, c.oy + actualH / 2);
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

  // Pass 3: find the single nearest hovered demo — only one disperses at a
  // time, so a mouse sweep can't put several demos on the slow path at once
  let hoveredIdx = -1;
  let bestSq = Infinity;
  for (let i = 0; i < demoImages.length; i++) {
    let d = demoImages[i];
    let dx = mouseX - d.x;
    let dy = mouseY - d.y;
    let distSq = dx * dx + dy * dy;
    let hoverRadius = max(d.w, d.h) / 2 + DEMO_HOVER_PAD;
    if (distSq < hoverRadius * hoverRadius && distSq < bestSq) {
      bestSq = distSq;
      hoveredIdx = i;
    }
  }

  // Pass 4: drawing
  const ctx = drawingContext;
  const atlasEl = glyphAtlas.elt;
  for (let i = 0; i < demoImages.length; i++) {
    let d = demoImages[i];
    let hovered = i === hoveredIdx;

    if (!hovered && !d.dispersed) {
      //FAST PATH: blit pre-rendered buffer (one call instead of thousands)
      image(d.buffer, d.x - d.w / 2, d.y - d.h / 2);
    } else {
      //DISPERSE PATH: glyph sprites from a single atlas via raw drawImage —
      //integer coords + no smoothing keeps blits on the fast unfiltered path
      const smoothing = ctx.imageSmoothingEnabled;
      ctx.imageSmoothingEnabled = false;
      let amt = hovered ? DEMO_LERP : DEMO_SETTLE_LERP;
      let maxDelta = 0;
      for (let c of d.chars) {
        let targetX = hovered ? c.ox + c.dispX * DEMO_DISPERSE_DIST : c.ox;
        let targetY = hovered ? c.oy + c.dispY * DEMO_DISPERSE_DIST : c.oy;
        c.cx = lerp(c.cx, targetX, amt);
        c.cy = lerp(c.cy, targetY, amt);

        let delta = abs(c.cx - c.ox) + abs(c.cy - c.oy);
        if (delta > maxDelta) maxDelta = delta;

        const g = c.glyph;
        //source rect in device px, destination in logical px
        ctx.drawImage(atlasEl, g.sx, 0, g.sd, g.sd,
          (d.x + c.cx - g.pad) | 0, (d.y + c.cy - g.pad) | 0, g.cell, g.cell);
      }
      ctx.imageSmoothingEnabled = smoothing;

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

// ===== SETUP =====
function setup() {
  createCanvas(windowWidth, windowHeight);
  clear();
  textFont(FONT_FAMILY);

  buildChrome();

  input = createFileInput(handleFile);
  input.hide();
  input.elt.setAttribute('aria-label', 'Upload image file');
  //restrict the file picker to supported formats (still images only — no gif, no heic)
  input.elt.setAttribute('accept', 'image/jpeg, image/png, image/webp');

  uploadButton = createButton('get creative');
  uploadButton.elt.setAttribute('aria-label', 'Click to upload an image file');
  uploadButton.elt.className = 'btn btn-primary btn-splash';
  uploadButton.mousePressed(() => input.elt.click());

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !imageLoaded) {
      input.elt.click();
    }
  });

  //wait for the webfont before rasterizing demo buffers + glyph sprites,
  //otherwise they bake in the fallback font
  document.fonts.load(`12px "${FONT_FAMILY}"`)
    .catch(() => {})
    .then(() => { if (!demosReady) initDemoImages(); });

  pickSplashMessage();
  drawSplash();
}

function drawSplash() {
  uploadButton.show();
  uploadButton.position(width / 2 - BTN_W / 2, height / 4);
}

function drawSplashOverlay() {
  textFont(FONT_FAMILY);
  textAlign(CENTER, CENTER);
  noStroke();

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

// ===== EDITOR CHROME (draggable panels) =====
function el(tag, cls, parent, txt) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (txt !== undefined) e.textContent = txt;
  if (parent) parent.appendChild(e);
  return e;
}

function buildChrome() {
  dock = el('div', null, null);
  dock.id = 'dock';
  document.body.insertBefore(dock, document.body.firstChild);
  buildPanels();
}

function buildPanels() {
  // --- file panel (upload/save live here so no toolbar is needed) ---
  let body = addPanel('file');
  const row = el('div', 'ctl btn-row', body);

  const newBtn = el('button', 'btn', row, 'upload new');
  newBtn.setAttribute('aria-label', 'Upload a new image');
  newBtn.addEventListener('click', resetToSplash);

  const saveBtn = el('button', 'btn btn-primary', row, 'save image');
  saveBtn.setAttribute('aria-label', 'Download ASCII art as PNG image');
  saveBtn.addEventListener('click', () => {
    let cropped = get(artX, artY, artW, artH);
    cropped.save('ascii-art', 'png');
  });

  // --- ascii panel ---
  body = addPanel('ascii');
  let cellSizeCtl, styleCtl;
  addCheck(body, 'enabled', settings.asciiEnabled, v => {
    settings.asciiEnabled = v;
    cellSizeCtl.classList.toggle('disabled', !v);
    styleCtl.classList.toggle('disabled', !v);
    if (syncDitherFn) syncDitherFn(); //dither pixel size depends on ascii state
    scheduleRegen();
  });
  cellSizeCtl = addSlider(body, 'cell size', 3, 10, 1, settings.cellSize, v => v + 'px', v => {
    settings.cellSize = v;
    scheduleRegen();
  });
  styleCtl = addSelect(body, 'style', Object.keys(RAMPS), settings.rampStyle, v => {
    settings.rampStyle = v;
    scheduleRegen();
  });
  cellSizeCtl.classList.toggle('disabled', !settings.asciiEnabled);
  styleCtl.classList.toggle('disabled', !settings.asciiEnabled);

  // --- preprocess panel ---
  body = addPanel('preprocess', true);
  addSlider(body, 'brightness', -0.5, 0.5, 0.05, settings.brightness,
    v => (v > 0 ? '+' : '') + v.toFixed(2), v => {
      settings.brightness = v;
      scheduleRegen();
    });
  addSlider(body, 'contrast', 0.5, 6, 0.1, settings.contrast, v => v.toFixed(1), v => {
    settings.contrast = v;
    scheduleRegen();
  });
  addSlider(body, 'gamma', 0.25, 2.5, 0.05, settings.gamma, v => v.toFixed(2), v => {
    settings.gamma = v;
    scheduleRegen();
  });
  addSlider(body, 'blur', 0, 4, 1, settings.blur, v => v + 'px', v => {
    settings.blur = v;
    scheduleRegen();
  });
  addCheck(body, 'invert', settings.inverted, v => {
    settings.inverted = v;
    scheduleRegen();
  });

  // --- dither panel ---
  body = addPanel('dither', true);
  let pixelCtl, thresholdCtl, modeCtl, levelsCtl, paletteCtl, colorsCtl;
  syncDitherFn = () => {
    const on = settings.ditherEnabled;
    //pixel size only drives sampling when ascii is off
    pixelCtl.classList.toggle('disabled', !on || settings.asciiEnabled);
    thresholdCtl.classList.toggle('disabled', !on);
    modeCtl.classList.toggle('disabled', !on);
    //levels only interpolates the two monochrome colors — palettes bring their own count
    levelsCtl.classList.toggle('disabled', !on || settings.palette !== 'monochrome');
    paletteCtl.classList.toggle('disabled', !on);
    colorsCtl.classList.toggle('disabled', !on);
  };
  addCheck(body, 'enabled', settings.ditherEnabled, v => {
    settings.ditherEnabled = v;
    syncDitherFn();
    scheduleRegen();
  });
  pixelCtl = addSlider(body, 'pixel size', 1, 10, 1, settings.ditherPixelSize, v => v + 'px', v => {
    settings.ditherPixelSize = v;
    scheduleRegen();
  });
  thresholdCtl = addSlider(body, 'threshold', 0, 1, 0.01, settings.ditherThreshold, v => v.toFixed(2), v => {
    settings.ditherThreshold = v;
    scheduleRegen();
  });
  modeCtl = addSelect(body, 'mode', DITHER_MODES, settings.ditherMode, v => {
    settings.ditherMode = v;
    scheduleRegen();
  });

  // --- palette panel (colors the dither maps onto) ---
  body = addPanel('palette', true);
  paletteCtl = addSelect(body, 'palette', Object.keys(PALETTES), settings.palette, v => {
    settings.palette = v;
    rebuildColorRows();
    syncDitherFn();
    scheduleRegen();
  });
  levelsCtl = addSlider(body, 'levels', 2, 8, 1, settings.ditherLevels, v => '' + v, v => {
    settings.ditherLevels = v;
    scheduleRegen();
  });

  colorsCtl = el('div', 'ctl', body);
  const colorsRow = el('div', 'ctl-row', colorsCtl);
  el('span', null, colorsRow, 'colors');
  colorSwatchWrap = el('div', null, colorsCtl);
  rebuildColorRows();

  syncDitherFn();
}

//rebuilds the palette swatch list: color picker + editable hex per row,
//[x] remove on custom palettes, dashed add button up to the cap.
//monochrome is fixed at exactly two colors
function rebuildColorRows() {
  colorSwatchWrap.innerHTML = '';
  const colors = paletteColors[settings.palette];
  const mono = settings.palette === 'monochrome';

  colors.forEach((hex, i) => {
    const row = el('div', 'swatch-row', colorSwatchWrap);

    const sw = el('input', 'swatch', row);
    sw.type = 'color';
    sw.value = hex;
    sw.setAttribute('aria-label', 'palette color ' + (i + 1));

    const hexIn = el('input', 'swatch-hex', row);
    hexIn.type = 'text';
    hexIn.value = hex.toUpperCase();
    hexIn.setAttribute('aria-label', 'palette color ' + (i + 1) + ' hex value');

    sw.addEventListener('input', () => {
      colors[i] = sw.value;
      hexIn.value = sw.value.toUpperCase();
      scheduleRegen();
    });
    hexIn.addEventListener('change', () => {
      let v = hexIn.value.trim();
      if (!v.startsWith('#')) v = '#' + v;
      if (/^#[0-9a-fA-F]{6}$/.test(v)) {
        colors[i] = v.toLowerCase();
        sw.value = colors[i];
        scheduleRegen();
      }
      hexIn.value = colors[i].toUpperCase();
    });

    if (!mono && colors.length > 2) {
      const del = el('button', 'swatch-del', row, '[x]');
      del.setAttribute('aria-label', 'remove palette color ' + (i + 1));
      del.addEventListener('click', () => {
        colors.splice(i, 1);
        rebuildColorRows();
        scheduleRegen();
      });
    }
  });

  if (!mono && colors.length < MAX_PALETTE_COLORS) {
    const add = el('button', 'btn add-color', colorSwatchWrap, '+ add color');
    add.addEventListener('click', () => {
      colors.push(colors[colors.length - 1]);
      rebuildColorRows();
      scheduleRegen();
    });
  }
}

function addPanel(title, startCollapsed) {
  const panel = el('div', 'panel', dock);
  const header = el('div', 'panel-header', panel);
  el('span', 'panel-title', header, title);

  const collapse = el('button', 'panel-collapse', header, startCollapsed ? '[+]' : '[–]');
  collapse.setAttribute('aria-label', 'Collapse ' + title + ' panel');
  if (startCollapsed) panel.classList.add('collapsed');
  collapse.addEventListener('click', (e) => {
    e.stopPropagation();
    const collapsed = panel.classList.toggle('collapsed');
    collapse.textContent = collapsed ? '[+]' : '[–]';
    layoutPanels();
  });

  const pbody = el('div', 'panel-body', panel);
  makeDraggable(panel, header);
  panels.push(panel);
  return pbody;
}

function makeDraggable(panel, header) {
  header.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.panel-collapse')) return;
    if (document.body.classList.contains('narrow')) return;

    const rect = panel.getBoundingClientRect();
    const offX = e.clientX - rect.left;
    const offY = e.clientY - rect.top;
    panel.style.zIndex = ++panelZ;
    header.setPointerCapture(e.pointerId);

    const move = (ev) => {
      let x = constrain(ev.clientX - offX, 0, window.innerWidth - rect.width);
      let y = constrain(ev.clientY - offY, 0, window.innerHeight - 36);
      panel.style.left = x + 'px';
      panel.style.top = y + 'px';
      panel.dataset.moved = '1';
    };
    const up = () => header.removeEventListener('pointermove', move);

    header.addEventListener('pointermove', move);
    header.addEventListener('pointerup', up, { once: true });
    header.addEventListener('pointercancel', up, { once: true });
  });
}

//stacks un-dragged panels down the left edge (wide mode) or clears
//inline positions so they flow in the dock (narrow mode)
function layoutPanels() {
  const narrow = isNarrow();
  document.body.classList.toggle('narrow', narrow);

  if (narrow) {
    for (const p of panels) {
      p.style.left = '';
      p.style.top = '';
      delete p.dataset.moved;
    }
    return;
  }

  let y = PANEL_MARGIN;
  for (const p of panels) {
    if (p.dataset.moved) {
      //re-clamp dragged panels into the viewport
      const r = p.getBoundingClientRect();
      p.style.left = constrain(r.left, 0, max(0, window.innerWidth - r.width)) + 'px';
      p.style.top = constrain(r.top, 0, max(0, window.innerHeight - 36)) + 'px';
      continue;
    }
    p.style.left = PANEL_MARGIN + 'px';
    p.style.top = y + 'px';
    y += p.offsetHeight + PANEL_GAP;
  }
}

function addSlider(parent, label, minV, maxV, step, value, fmt, onChange) {
  const ctl = el('div', 'ctl', parent);
  const row = el('div', 'ctl-row', ctl);
  el('span', null, row, label);
  const val = el('span', 'ctl-val', row, fmt(value));

  const slider = el('input', null, ctl);
  slider.type = 'range';
  slider.min = minV;
  slider.max = maxV;
  slider.step = step;
  slider.value = value;
  slider.setAttribute('aria-label', label);
  slider.addEventListener('input', () => {
    const v = parseFloat(slider.value);
    val.textContent = fmt(v);
    onChange(v);
  });
  return ctl;
}

function addSelect(parent, label, options, initialValue, onChange) {
  const ctl = el('div', 'ctl', parent);
  const row = el('div', 'ctl-row', ctl);
  el('span', null, row, label);

  const wrap = el('div', 'selectwrap', ctl);
  const select = el('select', null, wrap);
  select.setAttribute('aria-label', label);
  for (let opt of options) {
    const option = el('option', null, select, opt);
    option.value = opt;
    if (opt === initialValue) option.selected = true;
  }
  select.addEventListener('change', () => onChange(select.value));
  return ctl;
}

//text checkbox: renders as [*] when true, [ ] when false
function addCheck(parent, label, initialValue, onChange) {
  const ctl = el('div', 'ctl', parent);
  const btn = el('button', 'check', ctl);
  btn.setAttribute('role', 'checkbox');

  let value = initialValue;
  const render = () => {
    btn.textContent = (value ? '[*] ' : '[ ] ') + label;
    btn.setAttribute('aria-checked', value);
  };
  btn.addEventListener('click', () => {
    value = !value;
    render();
    onChange(value);
  });
  render();
  return ctl;
}

function showEditorChrome() {
  document.body.classList.add('editor');
  layoutPanels();
}

// ===== FILE HANDLING =====
function windowResized() {
  if (imageLoaded) {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      layoutPanels();
      processImage();
    }, RESIZE_DEBOUNCE);
  } else {
    resizeCanvas(windowWidth, windowHeight);
    //regenerate demos if we crossed a viewport boundary
    if (demosReady) {
      let firstDemoSize = demoImages.length > 0 ? max(demoImages[0].w, demoImages[0].h) : 0;
      let targetSize = getDemoTargetSize();
      if (abs(firstDemoSize - targetSize) > 50) {
        initDemoImages();
      }
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
  //NOTE: ui switches to editor in processImage on success, NOT here
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
//computes artX/artY/artW/artH for the current viewport and resizes the canvas
function computeArtLayout() {
  const cs = getSampleSize();
  const narrow = isNarrow();

  let boxSize, areaLeft;
  if (narrow) {
    areaLeft = 0;
    boxSize = min(MAX_ART_SIZE, windowWidth - 24);
  } else {
    areaLeft = PANEL_MARGIN * 2 + PANEL_W;
    boxSize = min(MAX_ART_SIZE, windowWidth - areaLeft - 24);
  }
  boxSize = max(boxSize, cs * 10);

  let imgAspect = img.height / img.width;
  let targetW, targetH;
  if (imgAspect > 1) {
    targetH = boxSize;
    targetW = boxSize / imgAspect;
  } else {
    targetW = boxSize;
    targetH = boxSize * imgAspect;
  }
  artW = max(cs, floor(targetW / cs) * cs);
  artH = max(cs, floor(targetH / cs) * cs);

  let canvasH;
  if (narrow) {
    //panels sit in the document flow above the canvas
    artX = floor((windowWidth - artW) / 2);
    artY = 16;
    canvasH = max(windowHeight - dock.offsetHeight, artY + artH + BOTTOM_PAD);
  } else {
    artX = areaLeft + floor((windowWidth - areaLeft - artW) / 2);
    artY = 24;
    canvasH = max(windowHeight, artY + artH + BOTTOM_PAD);
  }
  resizeCanvas(windowWidth, canvasH);
}

function processImage() {
  //we know the image loaded — clear error, leave splash, show editor chrome
  splashErrorMessage = null;
  uploadButton.hide();
  showEditorChrome();

  asciiChars = [];
  drawIndex = 0;
  pixelBuf = null;
  revealRow = 0;
  revealFills = null;

  computeArtLayout();
  clear();

  //frame: outer hairline border + art background
  noFill();
  stroke(COLOR_FG);
  strokeWeight(1);
  rect(artX - 2.5, artY - 2.5, artW + 5, artH + 5);
  noStroke();
  fill(settings.inverted ? COLOR_BG : COLOR_FG);
  rect(artX, artY, artW, artH);

  const cs = getSampleSize();
  artCS = cs;
  const cols = artW / cs;
  const rows = artH / cs;

  let work = img.get();
  work.resize(cols, rows);
  work.loadPixels();

  //--- preprocess: luminance + brightness/contrast/gamma ---
  const { brightness, contrast, gamma } = settings;
  let gray = new Float32Array(cols * rows);
  for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
    let l = getPixelBrightness(work.pixels, p) / 255;
    l += brightness;
    l = (l - 0.5) * contrast + 0.5;
    l = constrain(l, 0, 1);
    if (gamma !== 1) l = pow(l, 1 / gamma);
    gray[i] = l;
  }

  if (settings.blur > 0) gray = boxBlur(gray, cols, rows, settings.blur);

  //quantize to the active color count (levels for monochrome, list length otherwise)
  const ditherColors = activeDitherColors();
  const K = ditherColors ? ditherColors.length : 0;
  applyDither(gray, cols, rows, K);

  //tone rule: unchecked invert reads as the positive image (matches ascii's bg/fg swap)
  const inv = settings.inverted;

  if (settings.asciiEnabled) {
    //--- ascii mode: per-char reveal, optionally colored by the dither palette ---
    if (ditherColors) {
      revealFills = ditherColors.map(c => `rgb(${c[0]},${c[1]},${c[2]})`);
    }
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const l = gray[y * cols + x];
        asciiChars.push({
          x: artX + x * cs,
          y: artY + y * cs,
          char: getAsciiChar(l),
          ci: ditherColors ? constrain(round((inv ? 1 - l : l) * (K - 1)), 0, K - 1) : -1
        });
      }
    }
  } else {
    //--- pixel mode: render into a small buffer, revealed in scaled strips ---
    //(at 1px sampling there can be ~640k cells — far too many for per-cell objects)
    pixelBuf = createImage(cols, rows);
    pixelBuf.loadPixels();
    for (let i = 0; i < gray.length; i++) {
      const lEff = inv ? 1 - gray[i] : gray[i];
      let r, g, b;
      if (ditherColors) {
        const c = ditherColors[constrain(round(lEff * (K - 1)), 0, K - 1)];
        r = c[0]; g = c[1]; b = c[2];
      } else {
        r = g = b = round(lEff * 255);
      }
      const p = i * 4;
      pixelBuf.pixels[p] = r;
      pixelBuf.pixels[p + 1] = g;
      pixelBuf.pixels[p + 2] = b;
      pixelBuf.pixels[p + 3] = 255;
    }
    pixelBuf.updatePixels();
    revealRow = 0;
    //aim for a ~1.5s reveal regardless of resolution
    revealBand = max(1, ceil(rows / 90));
  }

  imageLoaded = true;
}

//separable box blur on a grayscale float array
function boxBlur(src, w, h, radius) {
  const r = round(radius);
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  const norm = 1 / (r * 2 + 1);

  //horizontal pass (clamped edges)
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let sum = 0;
    for (let k = -r; k <= r; k++) sum += src[row + constrain(k, 0, w - 1)];
    for (let x = 0; x < w; x++) {
      tmp[row + x] = sum * norm;
      sum += src[row + min(x + r + 1, w - 1)] - src[row + max(x - r, 0)];
    }
  }
  //vertical pass
  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let k = -r; k <= r; k++) sum += tmp[constrain(k, 0, h - 1) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = sum * norm;
      sum += tmp[min(y + r + 1, h - 1) * w + x] - tmp[max(y - r, 0) * w + x];
    }
  }
  return out;
}

//quantizes the grayscale array to K levels using the selected algorithm —
//the dither texture then shows up in the char/pixel pattern.
//threshold biases the tone before quantization (0.5 = neutral)
function applyDither(gray, w, h, K) {
  if (!settings.ditherEnabled) return;
  const mode = settings.ditherMode;

  const n = K - 1;
  const bias = 0.5 - settings.ditherThreshold;

  const bayer = BAYER_MATRICES[mode];
  if (bayer) {
    const size = bayer.length;
    const area = size * size;
    for (let y = 0; y < h; y++) {
      const brow = bayer[y % size];
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const t = (brow[x % size] + 0.5) / area - 0.5;
        gray[i] = constrain(round((gray[i] + bias + t / n) * n) / n, 0, 1);
      }
    }
    return;
  }

  //error diffusion (floyd-steinberg / atkinson)
  const kernel = DIFFUSION_KERNELS[mode];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const old = gray[i] + bias;
      const q = constrain(round(old * n) / n, 0, 1);
      gray[i] = q;
      const err = old - q;
      for (const [dx, dy, wt] of kernel) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && nx < w && ny < h) gray[ny * w + nx] += err * wt;
      }
    }
  }
}

// ===== DRAWING & ANIMATION =====
function draw() {
  if (!imageLoaded) {
    clear();
    drawDemos();
    drawSplashOverlay();
    return;
  }

  if (drawIndex < asciiChars.length) {
    //ascii reveal — chars in a single color, or palette-colored when dithering
    noStroke();
    textFont(FONT_FAMILY);
    textSize(artCS);
    textAlign(LEFT, TOP);
    let lastCi = -2;
    if (!revealFills) fill(settings.inverted ? COLOR_FG : COLOR_TEXT_LIGHT);
    for (let i = 0; i < REVEAL_SPEED && drawIndex < asciiChars.length; i++) {
      let a = asciiChars[drawIndex++];
      if (revealFills && a.ci !== lastCi) {
        fill(revealFills[a.ci]);
        lastCi = a.ci;
      }
      text(a.char, a.x, a.y);
    }
  } else if (pixelBuf && revealRow < pixelBuf.height) {
    //pixel reveal — blit the buffer up in crisp row strips
    const band = min(revealBand, pixelBuf.height - revealRow);
    const ctx = drawingContext;
    const smoothing = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;
    image(pixelBuf, artX, artY + revealRow * artCS, artW, band * artCS,
      0, revealRow, pixelBuf.width, band);
    ctx.imageSmoothingEnabled = smoothing;
    revealRow += band;
  }
}

function scheduleRegen() {
  if (regenTimer) clearTimeout(regenTimer);
  regenTimer = setTimeout(() => {
    processImage();
  }, REGEN_DELAY);
}

function resetToSplash() {
  imageLoaded = false;
  asciiChars = [];
  drawIndex = 0;
  pixelBuf = null;
  revealRow = 0;
  revealFills = null;
  splashErrorMessage = null;

  document.body.classList.remove('editor');
  input.elt.value = '';

  resizeCanvas(windowWidth, windowHeight);
  clear();
  pickSplashMessage();
  drawSplash();
}
