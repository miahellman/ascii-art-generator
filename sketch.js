//ascii image generator

let img;
let asciiChars = [];
let drawIndex = 0;
let cellSize = 6;
let imageLoaded = false;

let input;
let uploadButton;
let newFileButton;
let saveButton;
let buttonsShown = false;

const BTN_W = 140;
const BTN_H = 36;
//max width the art can grow to
const MAX_ART_W = 800;
//space at the top of the canvas for the buttons above the art
const TOP_PAD = 80;
const BOTTOM_PAD = 20;

//art bounds
let artX = 0;
let artY = 0;
let artW = 0;
let artH = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  background(255);
  //helvetica for all canvas text
  textFont('Helvetica');

  input = createFileInput(handleFile);
  input.hide();

  uploadButton = createButton('upload image');
  styleButton(uploadButton);
  uploadButton.mousePressed(() => input.elt.click());

  drawSplash();
}

//builds the inline style string for a button
function btnStyle(bg, fg) {
  return `
    background: ${bg} !important;
    color: ${fg} !important;
    border: 1px solid #000 !important;
    border-radius: 0 !important;
    padding: 8px 16px !important;
    width: ${BTN_W}px !important;
    font-family: Helvetica !important;
    font-size: 14px !important;
    cursor: pointer !important;
    box-sizing: border-box !important;
  `;
}

//applies button style with hover swap
function styleButton(btn) {
  const base = btnStyle('#000', '#fff');
  const hover = btnStyle('#fff', '#000');
  btn.elt.setAttribute('style', base);
  btn.elt.addEventListener('mouseenter', () => btn.elt.setAttribute('style', hover));
  btn.elt.addEventListener('mouseleave', () => btn.elt.setAttribute('style', base));
}

//splash screen: title, button in middle, just do it below
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
  if (file.type === 'image') {
    img = loadImage(file.data, processImage);
    uploadButton.hide();
    if (newFileButton) newFileButton.hide();
    if (saveButton) saveButton.hide();
    buttonsShown = false;
  }
}

//converts image into ascii character grid
function processImage() {
  asciiChars = [];
  drawIndex = 0;

  //art width = window width, capped at MAX_ART_W
  let imgAspect = img.height / img.width;
  artW = floor(min(windowWidth, MAX_ART_W) / cellSize) * cellSize;
  artH = floor((artW * imgAspect) / cellSize) * cellSize;

  //canvas grows tall enough to fit buttons + art + padding
  let canvasH = max(windowHeight, TOP_PAD + artH + BOTTOM_PAD);
  resizeCanvas(windowWidth, canvasH);
  background(255);

  //horizontally centered, starts at fixed top offset (not vertically centered)
  artX = floor((width - artW) / 2);
  artY = TOP_PAD;

  //work on a copy so img stays pristine for resizes
  let work = img.get();
  work.resize(artW / cellSize, artH / cellSize);

  for (let y = 0; y < work.height; y++) {
    for (let x = 0; x < work.width; x++) {
      let c = work.get(x, y);
      asciiChars.push({
        x: artX + x * cellSize,
        y: artY + y * cellSize,
        char: getAsciiChar(brightness(c))
      });
    }
  }

  imageLoaded = true;
  textAlign(LEFT, TOP);
  textSize(cellSize);
}

function draw() {
  if (!imageLoaded) return;

  //reveal 200 chars per frame
  for (let i = 0; i < 200; i++) {
    if (drawIndex < asciiChars.length) {
      let ascii = asciiChars[drawIndex];
      fill(0);
      text(ascii.char, ascii.x, ascii.y);
      drawIndex++;
    }
  }

  //show buttons the moment generation finishes
  if (drawIndex >= asciiChars.length && !buttonsShown) {
    showButtons();
  }
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
  let chars = "   .,:-=+$#";
  let index = floor(map(brightness, 0, 255, chars.length - 1, 0));
  return chars[index];
}
