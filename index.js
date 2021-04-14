var canvas;
var context;


window.onload = function(){
  // Starting code of the program
  console.log("starting");

  canvas = document.getElementById("gameCanvas");
  context = canvas.getContext("2d");

  // what to do when to start a new game
  document.getElementById("newGameButton").onclick = function(){
    document.getElementById("menuContainer").hidden = true;
    document.getElementById("gameContainer").hidden = false;
    start();
  }
}

// What to do when the game starts
function start(){
  var world = new World();
  var person = new Character(200, 200);
}

function drawRect(x, y, width, height, color){
  context.fillStyle = color;
  context.fillRect(x, y, width, height);
}

// This is the world
class World{
  constructor(cellsX, cellsY){
    this.width = cellsX;
    this.height = cellsY;
    console.log("created a new world!")

    // covered[row][col]
    this.covered = []
    for(let i = 0; i < this.height; ++i){
      this.covered.push(new Array(this.width).fill(null));
    }

    this.camera = new Camera(0, 0, 30)
  }
  canMove(character, newRow, newCol){
    // Characters can only move up, down, left or right
    if(Math.abs(newRow - character.x) + Math.abs(newCol - character.y) > 1){
      return false;
    }
    // Return if there isn't anything at the new position
    return !covered[newRow][newRow] && 0 <= newRow && newRow < this.height && 0 <= newCol && newCol <= ths.width;
  }
  // move the character to newRow and newCol
  move(character, newRow, newCol){
    if(this.canMove(character, newRow, newCol)){
      covered[character.x][character.y] = null;
      covered[newRow][newCol] = character;
    }
  }
  // get the coordinates of the character
  getCharacterCoords(character){
    for(let row = 0; row < this.height; ++row){
      for(let col = 0; col < this.width; ++col){
        if(this.covered[row][col] == character){
          return [row, col];
        }
      }
    }
  }
  // At each time step
  tick(){
    // Everything that can tick will tick()
    for(let row = 0; row < this.height; ++row){
      for(let col = 0; col < this.width; ++col){
        if(covered[row][col] != null){
          covered[row][col].tick();
        }
      }
    }
  }
  render(){
    for(let row = 0; row < this.height; ++row){
      for(let col = 0; col < this.width; ++col){
        if(covered[row][col] != null){
          covered[row][col].render();
        }
      }
    }
  }
}

// Rendering the world
class Camera{
  constructor(x, y, pixelWidth){
    this.x = x;
    this.y = y;
    this.pixelWidth = pixelWidth;
  }
  // Everything is stored in cells, so we need to convert that into pixels
  render(cellX, cellY, cellWidth, cellHeight, color){
    let startX = cellX * this.pixelWidth - this.x;
    let startY = cellY * this.pixelWidth - this.y;
    drawRect(startX, startY, cellWidth * this.pixelWidth, cellHeight * this.pixelWidth, color);
  }
}

const characterColor = "lightblue";
const houseColor = "pink";

// Any object that exists in the world
class Entity{
  constructor(x, y, width, height, world){
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.world = world;
  }
}

// Each person
class Character extends Entity{
  constructor(x, y, world){
    super(x, y, 1, 1, world)
    this.color = characterColor;
  }
  tick(){

  }
  render(camera){
    camera.render(this.x, this.y, this.width, this.height, this.color);
  }
}

// A building
class Building extends Entity{
  constructor(x, y, width, height, world){
    super(x, y, width, height, world)
  }
  tick(){

  }
}

// People start the day in houses
class House extends Building{
  constructor(x, y, width, height, world, residents){
    super(x, y, width, height, world);
    this.residents = residents;
    this.color = houseColor;
  }
  tick(){

  }
  render(camera){
    camera.render(this.x, this.y, this.width, this.height, this.color);
  }
}