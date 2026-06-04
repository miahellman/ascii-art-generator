//ascii image generator
//converts uploaded images into ascii art that draws over time

//stores the uploaded image
let img;
//array to store all ascii character objects
let asciiChars = [];
//tracks which character to draw next
let drawIndex = 0;
//size of each ascii character cell in pixels
let cellSize = 6;
//track if image is ready to draw
let imageLoaded = false;
//hidden file input element
let input;
//custom upload button on splash screen
let uploadButton;
//button to upload a new file after generation
let newFileButton;
//button to save the generated ascii art
let saveButton;

//countdown state
//whether the countdown is currently running
let countdownActive = false;
//timestamp when countdown started
let countdownStart = 0;
//how long to wait before showing buttons (3 seconds)
let countdownDuration = 3000;
//whether save/upload-new buttons are visible
let buttonsShown = false;

//fixed button width so we can center it perfectly without measuring the dom
const BTN_WIDTH = 140;
const BTN_HEIGHT = 36;

//bounds of the ascii art block within the canvas
//used to center the art and position save/upload buttons on its corners
let artX = 0;
let artY = 0;
let artW = 0;
let artH = 0;

function setup() {
  //make canvas fill the whole window for responsive embedding
  createCanvas(windowWidth, windowHeight);
  background(255);

  //create hidden file input that the custom button will trigger
  input = createFileInput(handleFile);
  input.hide();

  //create the visible upload button on the splash screen
  uploadButton = createButton('upload image');
  //apply styles directly so we don't rely on external css loading
  styleButton(uploadButton);
  //when clicked, fire a click on the hidden file input to open the file picker
  uploadButton.mousePressed(() => input.elt.click());

  drawSplash();
}

//applies the black-button-with-white-text style to a p5 button
//also handles hover by swapping styles on mouseOver / mouseOut
function styleButton(btn) {
  //base styles for the resting state
  btn.style('background', '#000');
  btn.style('color', '#fff');
  btn.style('border', '1px solid #000');
  btn.style('border-radius', '0');
  btn.style('padding', '8px 16px');
  btn.style('width', BTN_WIDTH + 'px');
  btn.style('font-family', 'monospace');
  btn.style('font-size', '14px');
  btn.style('cursor', 'pointer');
  btn.style('box-sizing', 'border-box');

  //hover state: white background, black text
  btn.mouseOver(() => {
    btn.style('background', '#fff');
    btn.style('color', '#000');
  });
  //leave state: back to black background, white text
  btn.mouseOut(() => {
    btn.style('background', '#000');
    btn.style('color', '#fff');
  });
}

//draws the title and upload button centered on the splash screen
//pulled into its own function so setup, resize, and upload-new can all reuse it
function drawSplash() {
  background(255);
  fill(0);
  //explicitly set text alignment every time so it can't leak from another state
  textAlign(CENTER, CENTER);

  //big title centered horizontally at width / 2
  textSize(24);
  text('mia hellman', width / 2, height / 2 - 50);

  //small instruction text centered under the title
  textSize(12);
  text('^ just do it', width / 2, height / 2 - 20);

  //show the upload button and center it on the same x axis as the text
  uploadButton.show();
  //since the button has a fixed width, we subtract half of it to align its center with width / 2
  uploadButton.position(width / 2 - BTN_WIDTH / 2, height / 2);
}

//handles the canvas resizing when the window/iframe changes size
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  //only redraw splash if we're on the start screen, not mid-generation
  if (!imageLoaded && !buttonsShown) {
    drawSplash();
  }
}

//handles file when upload button is used
function handleFile(file) {
  //check if uploaded file is an image
  if (file.type === 'image') {
    //load the image and call processImage when done
    img = loadImage(file.data, processImage);
    //hide all buttons while processing
    uploadButton.hide();
    if (newFileButton) newFileButton.hide();
    if (saveButton) saveButton.hide();
    //reset state flags so the countdown starts fresh
    buttonsShown = false;
    countdownActive = false;
  }
}

//processes the uploaded image into ascii characters
function processImage() {
  //clear any previous data from a prior upload
  asciiChars = [];
  drawIndex = 0;

  //figure out the ascii block size
  //the art is as wide as the window, height follows the image's aspect ratio
  let imgAspect = img.height / img.width;
  artW = floor(windowWidth / cellSize) * cellSize;
  artH = floor((artW * imgAspect) / cellSize) * cellSize;

  //keep canvas at full window size so we can center the art on it
  resizeCanvas(windowWidth, windowHeight);
  background(255);

  //compute the top-left corner of the art so it sits in the middle of the canvas
  artX = floor((width - artW) / 2);
  artY = floor((height - artH) / 2);

  //resize image so each pixel maps to one ascii character cell
  img.resize(artW / cellSize, artH / cellSize);

  //loop through every pixel in the resized image
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      //get the color at this pixel
      let c = img.get(x, y);
      //calculate brightness value (0-255)
      let b = brightness(c);
      //choose ascii character based on brightness
      let char = getAsciiChar(b);

      //add character object to array with position offset into the centered art region
      asciiChars.push({
        x: artX + x * cellSize,
        y: artY + y * cellSize,
        char: char,
        //original pixel color (not using this tho)
        color: c
      });
    }
  }

  //set flag to start drawing in the draw() loop
  imageLoaded = true;
  //reset text alignment back to top-left for drawing ascii chars
  textAlign(LEFT, TOP);
  textSize(cellSize);
}

function draw() {
  //only draw if image has been processed
  if (imageLoaded) {
    //draw speed depends on num here
    //higher number = faster reveal
    for (let i = 0; i < 200; i++) {
      //check if there are still characters left to draw
      if (drawIndex < asciiChars.length) {
        //get the next character from array
        let ascii = asciiChars[drawIndex];
        //use black text on white background
        fill(0);
        //draw the character at its position
        text(ascii.char, ascii.x, ascii.y);
        //move to next character
        drawIndex++;
      }
    }

    //when all characters are drawn, start the silent countdown once
    if (drawIndex >= asciiChars.length && !countdownActive && !buttonsShown) {
      countdownActive = true;
      countdownStart = millis();
    }

    //countdown runs silently in the background so save/upload buttons don't pop up instantly
    //nothing gets drawn on canvas during countdown so the saved image stays clean
    if (countdownActive) {
      if (millis() - countdownStart >= countdownDuration) {
        countdownActive = false;
        showButtons();
      }
    }
  }
}

//creates the save and upload-new buttons after countdown ends
function showButtons() {
  buttonsShown = true;

  //save button goes in the top-left corner of the ascii art
  saveButton = createButton('save image');
  styleButton(saveButton);
  saveButton.position(artX, artY);
  //save the canvas as a png when clicked
  saveButton.mousePressed(() => {
    saveCanvas('ascii-art', 'png');
  });

  //upload-new button goes in the top-right corner of the ascii art
  newFileButton = createButton('upload new');
  styleButton(newFileButton);
  newFileButton.position(artX + artW - BTN_WIDTH, artY);

  //reset everything and go back to the splash screen when clicked
  newFileButton.mousePressed(() => {
    imageLoaded = false;
    asciiChars = [];
    drawIndex = 0;
    buttonsShown = false;

    saveButton.hide();
    newFileButton.hide();
    //clear the file input so selecting the same file again still works
    input.elt.value = '';

    //resize canvas back to fill the window and redraw splash
    resizeCanvas(windowWidth, windowHeight);
    drawSplash();
  });
}

//converts brightness value to appropriate ascii character
function getAsciiChar(brightness) {
  //character gradient from lightest (spaces) to darkest (#)
  //more spaces at start = more empty areas for bright pixels
  let chars = "   .,:-=+$#";
  //map brightness to character index
  //darker pixels (low brightness) get denser characters
  let index = floor(map(brightness, 0, 255, chars.length - 1, 0));
  //return the character at calculated index
  return chars[index];
}
