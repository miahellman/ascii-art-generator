//ascii image generator
//converts uploaded images into ascii art that draws over time

//image and ascii data
let img;
let asciiChars = [];
let drawIndex = 0;
let cellSize = 6;
let imageLoaded = false;

//ui elements
let input;
let uploadButton;
let newFileButton;
let saveButton;

//countdown before showing save/upload buttons
let countdownActive = false;
let countdownStart = 0;
let countdownDuration = 3000;
let buttonsShown = false;

//button size and layout constants
const BTN_WIDTH = 140;
const BTN_HEIGHT = 36;
//max width the ascii art is allowed to be
const MAX_ART_WIDTH = 800;
//padding between top of canvas, buttons, art, and bottom
const TOP_PAD = 20;
const BTN_GAP = 20;
const BOTTOM_PAD = 20;

//bounds of the ascii art block within the canvas
let artX = 0;
let artY = 0;
let artW = 0;
let artH = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  background(255);

  input = createFileInput(handleFile);
  input.hide();

  uploadButton = createButton('upload image');
  styleButton(uploadButton);
  uploadButton.mousePressed(() => input.elt.click());

  drawSplash();
}

//builds the inline style string for a button at a given bg/text color
function btnStyle(bg, fg) {
  return `
    background: ${bg} !important;
    color: ${fg} !important;
    border: 1px solid #000 !important;
    border-radius: 0 !important;
    padding: 8px 16px !important;
    width: ${BTN_WIDTH}px !important;
    font-family: monospace !important;
    font-size: 14px !important;
    cursor: pointer !important;
    box-sizing: border-box !important;
  `;
}

//applies the button style and hover swap
function styleButton(btn) {
  const base = btnStyle('#000', '#fff');
  const hover = btnStyle('#fff', '#000');
  btn.elt.setAttribute('style', base);
  btn.elt.addEventListener('mouseenter', () => btn.elt.setAttribute('style', hover));
  btn.elt.addEventListener('mouseleave', () => btn.elt.setAttribute('style', base));
}

//draws splash screen with title, upload button, and instruction below it
function drawSplash() {
  background(255);
  fill(0);
  textAlign(CENTER, CENTER);

  //title above the button
  textSize(24);
  text('mia hellman', width / 2, height / 2 - 40);

  //center upload button on the same x axis as the text
  uploadButton.show();
  uploadButton.position(width / 2 - BTN_WIDTH / 2, height / 2);

  //instruction below the button
  textSize(12);
  text('^ just do it', width / 2, height / 2 + BTN_HEIGHT + 25);
}

//keeps everything responsive when the iframe/window resizes
function windowResized() {
  if (imageLoaded || buttonsShown) {
    //re-render the art at the new size using the cached original image
    processImage();
    //if buttons are already shown, reposition them; otherwise let the countdown re-fire
    if (buttonsShown) {
      buttonsShown = false;
      countdownActive = false;
      drawIndex = asciiChars.length; //skip the draw animation, jump to done state
      //force-draw all chars immediately so user doesn't see a redraw flash
      fill(0);
      textAlign(LEFT, TOP);
      textSize(cellSize);
      for (let c of asciiChars) text(c.char, c.x, c.y);
      showButtons();
    }
  } else {
    resizeCanvas(windowWidth, windowHeight);
    drawSplash();
  }
}

//runs when user picks a file
function handleFile(file) {
  if (file.type === 'image') {
    img = loadImage(file.data, processImage);
    uploadButton.hide();
    if (newFileButton) newFileButton.hide();
    if (saveButton) saveButton.hide();
    buttonsShown = false;
    countdownActive = false;
  }
}

//converts uploaded image into ascii character data
//uses a fresh copy each time so img stays pristine for re-renders on resize
function processImage() {
  asciiChars = [];
  drawIndex = 0;

  //art width: window width, capped at MAX_ART_WIDTH
  let imgAspect = img.height / img.width;
  artW = floor(min(windowWidth, MAX_ART_WIDTH) / cellSize) * cellSize;
  artH = floor((artW * imgAspect) / cellSize) * cellSize;

  //canvas grows to fit art plus buttons and padding, but never shorter than the window
  let neededHeight = TOP_PAD + BTN_HEIGHT + BTN_GAP + artH + BOTTOM_PAD;
  let canvasHeight = max(windowHeight, neededHeight);
  resizeCanvas(windowWidth, canvasHeight);
  background(255);

  //horizontally center the art
  artX = floor((width - artW) / 2);
  //vertically: center within the visible window area when there's room,
  //otherwise pin near the top so buttons stay in view
  if (canvasHeight === windowHeight) {
    artY = floor((height - artH) / 2) + BTN_HEIGHT / 2 + BTN_GAP / 2;
  } else {
    artY = TOP_PAD + BTN_HEIGHT + BTN_GAP;
  }

  //work on a copy so the original img isn't mutated by resize
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

  //reveal 200 characters per frame
  for (let i = 0; i < 200; i++) {
    if (drawIndex < asciiChars.length) {
      let ascii = asciiChars[drawIndex];
      fill(0);
      text(ascii.char, ascii.x, ascii.y);
      drawIndex++;
    }
  }

  //start silent countdown once everything is drawn
  if (drawIndex >= asciiChars.length && !countdownActive && !buttonsShown) {
    countdownActive = true;
    countdownStart = millis();
  }

  //show buttons after countdown completes
  if (countdownActive && millis() - countdownStart >= countdownDuration) {
    countdownActive = false;
    showButtons();
  }
}

//creates the save and upload-new buttons above the ascii art
function showButtons() {
  buttonsShown = true;

  saveButton = createButton('save image');
  styleButton(saveButton);
  saveButton.position(artX, artY - BTN_HEIGHT - BTN_GAP);
  saveButton.mousePressed(() => saveCanvas('ascii-art', 'png'));

  newFileButton = createButton('upload new');
  styleButton(newFileButton);
  newFileButton.position(artX + artW - BTN_WIDTH, artY - BTN_HEIGHT - BTN_GAP);
  newFileButton.mousePressed(resetToSplash);
}

//tears down current art and returns to splash
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

//maps brightness (0-255) to an ascii character
function getAsciiChar(brightness) {
  //gradient from lightest (spaces) to darkest (#)
  let chars = "     .,:-=+$#";
  let index = floor(map(brightness, 0, 255, chars.length - 1, 0));
  return chars[index];
}
