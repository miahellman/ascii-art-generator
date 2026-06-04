//ASCII image generator
//converts uploaded images into ASCII art that draws over time
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
  createCanvas(500, 400);
  background(255);

  input = createFileInput(handleFile);
  input.hide();

  uploadButton = createButton('upload image');
  uploadButton.position(width / 2 - 125, height / 2);
  uploadButton.mousePressed(() => input.elt.click());

  textAlign(LEFT, TOP);
  textSize(cellSize);
  fill(0);
  textSize(24);
  text('mia hellman', width / 2 - 125, height / 2 - 50);
  textSize(12);
  text('^ just do it', width / 2 - 125, height / 2 + 30);
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
  let aspectRatio = img.height / img.width;
  let newWidth = 400;
  let newHeight = newWidth * aspectRatio;
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
  newFileButton.position(300, height - 40);
  newFileButton.mousePressed(() => {
    imageLoaded = false;
    asciiChars = [];
    drawIndex = 0;
    buttonsShown = false;

    saveButton.hide();
    newFileButton.hide();

    input.elt.value = '';

    resizeCanvas(500, 400);
    background(255);
    fill(0);
    textAlign(LEFT, TOP);
    textSize(24);
    text('ascii art generator', width / 2 - 125, height / 2 - 50);

    uploadButton.show();
    uploadButton.position(width / 2 - 125, height / 2);
  });
}

function getAsciiChar(brightness) {
  let chars = "   .,:-=+$#";
  let index = floor(map(brightness, 0, 255, chars.length - 1, 0));
  return chars[index];
}
