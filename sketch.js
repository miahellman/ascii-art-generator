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

//button size constants
const BTN_WIDTH = 140;
const BTN_HEIGHT = 36;

//bounds of the ascii art block within the canvas
let artX = 0;
let artY = 0;
let artW = 0;
let artH = 0;

function setup() {
  //canvas fills the window for responsive embedding
  createCanvas(windowWidth, windowHeight);
  background(255);

  //hidden file input triggered by the custom upload button
  input = createFileInput(handleFile);
  input.hide();

  //splash screen upload button
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
  //set the full style string at once with !important to beat any editor css
  btn.elt.setAttribute('style', base);
  btn.elt.addEventListener('mouseenter', () => btn.elt.setAttribute('style', hover));
  btn.elt.addEventListener('mouseleave', () => btn.elt.setAttribute('style', base));
}

//draws splash screen with title and upload button
function drawSplash() {
  background(255);
  fill(0);
  textAlign(CENTER, CENTER);

  //title
  textSize(24);
  text('mia hellman', width / 2, height / 2 - 50);
  //instruction
  textSize(12);
  text('^ just do it', width / 2, height / 2 - 20);

  //center upload button on the same axis as the text
  uploadButton.show();
  uploadButton.position(width / 2 - BTN_WIDTH / 2, height / 2);
}

//keeps canvas responsive
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  if (!imageLoaded && !buttonsShown) drawSplash();
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
function processImage() {
  asciiChars = [];
  drawIndex = 0;

  //ascii art is as wide as the window, height follows the image's aspect ratio
  //rounded to multiples of cellSize so the grid is clean
  let imgAspect = img.height / img.width;
  artW = floor(windowWidth / cellSize) * cellSize;
  artH = floor((artW * imgAspect) / cellSize) * cellSize;

  //canvas stays full window size so we can center the art and place buttons above it
  resizeCanvas(windowWidth, windowHeight);
  background(255);

  //center horizontally, push down vertically to leave room for buttons above
  artX = floor((width - artW) / 2);
  artY = floor((height - artH) / 2) + BTN_HEIGHT + 20;

  //resize image so each pixel = one ascii cell
  img.resize(artW / cellSize, artH / cellSize);

  //build the character array offset into the centered art region
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      let c = img.get(x, y);
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

  //show buttons after the countdown completes
  if (countdownActive && millis() - countdownStart >= countdownDuration) {
    countdownActive = false;
    showButtons();
  }
}

//creates the save and upload-new buttons above the ascii art
function showButtons() {
  buttonsShown = true;

  //save button above the top-left corner of the art
  saveButton = createButton('save image');
  styleButton(saveButton);
  saveButton.position(artX, artY - BTN_HEIGHT - 20);
  saveButton.mousePressed(() => saveCanvas('ascii-art', 'png'));

  //upload-new button above the top-right corner of the art
  newFileButton = createButton('upload new');
  styleButton(newFileButton);
  newFileButton.position(artX + artW - BTN_WIDTH, artY - BTN_HEIGHT - 20);
  newFileButton.mousePressed(resetToSplash);
}

//tears down the current art and returns to splash
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
  let chars = "   .,:-=+$#";
  let index = floor(map(brightness, 0, 255, chars.length - 1, 0));
  return chars[index];
}
