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

function setup() {
  //make canvas fill the whole window for responsive embedding
  createCanvas(windowWidth, windowHeight);
  background(255);

  //inject button styles into the page
  //doing this in css because inline styles can't handle :hover
  let style = createElement('style', `
    button.ascii-btn {
      background: #000;
      color: #fff;
      border: 1px solid #000;
      border-radius: 0;
      padding: 8px 16px;
      font-family: monospace;
      font-size: 14px;
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
    }
    button.ascii-btn:hover {
      background: #fff;
      color: #000;
    }
  `);

  //create hidden file input that the custom button will trigger
  input = createFileInput(handleFile);
  input.hide();

  //create the visible upload button on the splash screen
  uploadButton = createButton('upload image');
  uploadButton.class('ascii-btn');
  //when clicked, fire a click on the hidden file input to open the file picker
  uploadButton.mousePressed(() => input.elt.click());

  //center-align text for the splash screen
  textAlign(CENTER, CENTER);
  fill(0);
  drawSplash();
}

//draws the title and upload button centered on the splash screen
//pulled into its own function so setup, resize, and upload-new can all reuse it
function drawSplash() {
  background(255);
  fill(0);
  textAlign(CENTER, CENTER);
  //big title
  textSize(24);
  text('mia hellman', width / 2, height / 2 - 50);
  //small instruction text under the title
  textSize(12);
  text('v just do it', width / 2, height / 2 - 10);

  //show the upload button and center it under the text
  uploadButton.show();
  //measure the button's actual width so we can center it perfectly
  //fallback to 120 if the dom hasn't measured it yet
  let bw = uploadButton.elt.offsetWidth || 120;
  let bh = uploadButton.elt.offsetHeight || 36;
  uploadButton.position(width / 2 - bw / 2, height / 2 + 10);
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

  //image fills the full width of the window
  //height is calculated from the image's aspect ratio so nothing gets squished
  let imgAspect = img.height / img.width;
  let newWidth = windowWidth;
  let newHeight = newWidth * imgAspect;

  //round dimensions to nearest multiple of cellSize
  //this makes sure the character grid lines up cleanly
  newWidth = floor(newWidth / cellSize) * cellSize;
  newHeight = floor(newHeight / cellSize) * cellSize;

  //resize canvas to match image proportions
  resizeCanvas(newWidth, newHeight);
  background(255);

  //resize image so each pixel maps to one ascii character cell
  img.resize(width / cellSize, height / cellSize);

  //loop through every pixel in the resized image
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      //get the color at this pixel
      let c = img.get(x, y);
      //calculate brightness value (0-255)
      let b = brightness(c);
      //choose ascii character based on brightness
      let char = getAsciiChar(b);

      //add character object to array with position and properties
      asciiChars.push({
        x: x * cellSize,
        y: y * cellSize,
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

  //save button goes in the top-left corner of the image
  saveButton = createButton('save image');
  saveButton.class('ascii-btn');
  saveButton.position(10, 10);
  //save the canvas as a png when clicked
  saveButton.mousePressed(() => {
    saveCanvas('ascii-art', 'png');
  });

  //upload-new button goes in the top-right corner of the image
  newFileButton = createButton('upload new');
  newFileButton.class('ascii-btn');
  //wait a tick so the button is in the dom and we can measure its width
  setTimeout(() => {
    let bw = newFileButton.elt.offsetWidth || 120;
    newFileButton.position(width - bw - 10, 10);
  }, 0);

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
