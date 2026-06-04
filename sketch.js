// ASCII image generator
// converts uploaded images into ASCII art that draws over time
let img;
let asciiChars = [];
let drawIndex = 0;
let cellSize = 6;
let imageLoaded = false;
let input;
let uploadButton;
let newFileButton;
let saveButton;
// countdown state
let countdownActive = false;
let countdownStart = 0;
let countdownDuration = 3000; // 3 seconds
let buttonsShown = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  background(255);

  input = createFileInput(handleFile);
  input.hide();

  uploadButton = createButton('upload image');
  uploadButton.mousePressed(() => input.elt.click());

  textAlign(LEFT, TOP);
  fill(0);
  drawSplash();
}

// draws the title + upload button centered for the current canvas size
function drawSplash() {
  background(255);
  fill(0);
  textAlign(LEFT, TOP);
  textSize(24);
  text('mia hellman', width / 2 - 125, height / 2 - 50);
  textSize(12);
  text('^ just do it', width / 2 - 125, height / 2 + 30);
  uploadButton.position(width / 2 - 50, height / 2);
  uploadButton.show();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  // only redraw splash if we're on the start screen
  if (!imageLoaded && !buttonsShown) {
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
    countdownActive = false;
  }
}

function processImage() {
  asciiChars = [];
  drawIndex = 0;

  // fit image inside the current window while preserving aspect ratio
  let maxW = windowWidth;
  let maxH = windowHeight;
  let imgAspect = img.width / img.height;
  let windowAspect = maxW / maxH;

  let newWidth, newHeight;
  if (imgAspect > windowAspect) {
    // image is wider than window — constrain by width
    newWidth = maxW;
    newHeight = maxW / imgAspect;
  } else {
    // image is taller — constrain by height
    newHeight = maxH;
    newWidth = maxH * imgAspect;
  }

  // round to multiples of cellSize so the grid lines up
  newWidth = floor(newWidth / cellSize) * cellSize;
  newHeight = floor(newHeight / cellSize) * cellSize;

  resizeCanvas(newWidth, newHeight);
  background(255);

  img.resize(width / cellSize, height / cellSize);

  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      let c = img.get(x, y);
      let b = brightness(c);
      let char = getAsciiChar(b);
      asciiChars.push({
        x: x * cellSize,
        y: y * cellSize,
        char: char,
        color: c
      });
    }
  }

  imageLoaded = true;
  textSize(cellSize);
}

function draw() {
  if (imageLoaded) {
    for (let i = 0; i < 200; i++) {
      if (drawIndex < asciiChars.length) {
        let ascii = asciiChars[drawIndex];
        fill(0);
        text(ascii.char, ascii.x, ascii.y);
        drawIndex++;
      }
    }
    if (drawIndex >= asciiChars.length && !countdownActive && !buttonsShown) {
      countdownActive = true;
      countdownStart = millis();
    }
    if (countdownActive) {
      if (millis() - countdownStart >= countdownDuration) {
        countdownActive = false;
        showButtons();
      }
    }
  }
}

function showButtons() {
  buttonsShown = true;
  saveButton = createButton('save image');
  saveButton.position(10, height - 40);
  saveButton.mousePressed(() => {
    saveCanvas('ascii-art', 'png');
  });
  newFileButton = createButton('upload new');
  newFileButton.position(width - 110, height - 40);
  newFileButton.mousePressed(() => {
    imageLoaded = false;
    asciiChars = [];
    drawIndex = 0;
    buttonsShown = false;

    saveButton.hide();
    newFileButton.hide();
    input.elt.value = '';

    resizeCanvas(windowWidth, windowHeight);
    drawSplash();
  });
}

function getAsciiChar(brightness) {
  let chars = "   .,:-=+$#";
  let index = floor(map(brightness, 0, 255, chars.length - 1, 0));
  return chars[index];
}
