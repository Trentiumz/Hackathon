var canvas;
var context;

const textTags = {
  w1Format: "world1.txt",
  w1Info: "world1_info.txt"
}
var texts = {}

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

  document.getElementById("mainMenuButton").onclick = function() {
    document.getElementById("menuContainer").hidden = false;
    document.getElementById("gameContainer").hidden = true;
  }

}

var world;
var gameRunning = false;
// Milliseconds between each frame
const timeDelta = 300;

// What to do when the game starts
function start(){
  if(Object.keys(texts).length != Object.keys(textTags).length){
    
  }
  world = new World(100, 100);
  var house = new House(3, 3, 2, 2, world, 5)
  world.addHouse(house)

  gameRunning = true;
  update()
}

// This is the "loop function"
function update(){
  if(gameRunning){
    world.tick();
    context.clearRect(0, 0, canvas.width, canvas.height);
    world.render();
    setTimeout(update, timeDelta)
  }
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

    // covered[x][y]
    this.covered = []
    for(let i = 0; i < this.width; ++i){
      this.covered.push(new Array(this.height).fill(false));
    }

    this.characters = []
    this.houses = []
    this.shops = []

    this.camera = new Camera(0, 0, 10)
  }
  canMove(character, newX, newY){
    // Characters can only move up, down, left or right
    if(Math.abs(newX - character.x) + Math.abs(newY - character.y) > 1){
      return false;
    }
    // Return if there isn't anything at the new position
    return 0 <= newX && newX < this.width && 0 <= newY && newY <= this.height && !this.covered[newX][newY];
  }
  // move the character to newX and newY
  move(character, newX, newY){
    if(this.canMove(character, newX, newY)){
      this.covered[character.x][character.y] = false;
      this.covered[newX][newY] = true;
      character.x = newX
      character.y = newY
    }
  }
  // At each time step
  tick(){
    // Everything that can tick will tick()
    for(let character of this.characters){
        if(this.covered[character.x][character.y] != null){
          let [newX, newY] = character.getMove();
          if(this.canMove(character, newX, newY)){
            this.move(character, newX, newY)
          }
        }
    }
    for(let house of this.houses){
      let toSpawn = house.getSpawnLocations()
      for(let coord of toSpawn){
        let [x, y] = coord
        if(this.isEmpty(x, y)){
          this.addCharacter(new Character(x, y, this))
        }
      }
    }
    for(let shop of this.shops){
      shop.tick()
    }
  }
  render(){
    for(let character of this.characters){
      character.render(this.camera);
    }
    for(let house of this.houses){
      house.render(this.camera)
    }
    for(let shop of this.shops){
      shop.render(this.camera)
    }
  }
  addCharacter(character){
    if(this.isEmpty(character.x, character.y)){
      this.covered[character.x][character.y] = true
      this.characters.push(character)
    }
  }
  addHouse(house){
    this.houses.push(house)
    for(let x = house.x; x < house.x + house.width; ++x){
      for(let y = house.y; y < house.y + house.height; ++y){
        if(0 <= x && x < this.width && 0 <= y && y < this.height){
          this.covered[x][y] = true
        }else{
          console.log("house reaches past the border")
        }
      }
    }
  }
  addShop(shop){
    this.shops.push(shop)
    for(let x = shop.x; x < shop.x + shop.width; ++x){
      for(let y = shop.y; y < shop.y + shop.height; ++y){
        if(0 <= x && x < this.width && 0 <= y && y < this.height){
          this.covered[x][y] = true
        }else{
          console.log("shop reaches past the border")
        }
      }
    }
  }
  // Returns if something can spawn on this cell, or if it's empty(if it doesn't exist, it's the same as a border)
  isEmpty(x, y){
    if(0 <= x < this.width && 0 <= y < this.height){
      return !this.covered[x][y]
    }
    return false
  }
  deleteCharacter(character){
    this.characters.splice(this.characters.indexOf(character), 1)
    this.covered[character.x][character.y] = false
  }
  setCovered(x, y, value){
    this.covered[x][y] = value
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
  // Based on where the character is now, we get its new move
  getMove(){
    if(this.world.canMove(this, this.x + 1, this.y)){
      return [this.x + 1, this.y]
    }
    return [this.x, this.y]
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


const residentSpawnChance = 0.2;
const maxPeoplePerSpawn = 2;
// People start the day in houses
class House extends Building{
  constructor(x, y, width, height, world, residents){
    super(x, y, width, height, world);
    this.residents = residents;
    this.spawnChance = residentSpawnChance
    this.maxAtOnce = maxPeoplePerSpawn
    this.world = world
    this.color = houseColor;
  }
  getSpawnLocations(){
    let loop = createLoop(this.x, this.y, this.width, this.height).filter((coord) => this.world.isEmpty(coord[0], coord[1]))

    var toSpawn = []

    while(Math.random() < this.spawnChance && toSpawn.length < this.maxAtOnce && this.residents > 0 && loop.length > 0){
      let ci = Math.floor(Math.random() * loop.length);
      let [x, y] = loop[ci]
      toSpawn.push([x, y])
      loop.splice(ci, 1)
      --this.residents;
    }
    return toSpawn
  }
  render(camera){
    camera.render(this.x, this.y, this.width, this.height, this.color);
  }
}

const shopColor = "blue"
class Shop extends Building{
  constructor(x, y, width, height, world){
    super(x, y, width, height, world)
    this.color = shopColor
  }
  tick(){

  }
  render(camera){
    camera.render(this.x, this.y, this.width, this.height, this.color)
  }
}

function range(start, end){
  var toreturn = []
  for(let i = start; i < end; ++i){
    toreturn.push(i)
  }
  return toreturn
}

function flatten2D(arr){
  var toreturn = []
  for(let a of arr){
    toreturn = toreturn.concat(a)
  }
  return toreturn
}

// returns the list of coordinates that are "one step" away from the building
function createLoop(x, y, width, height){
  // x = x - 1, x + width
  let loop = [x - 1, x + width]
  .map((nx) => range(y, y + height).map((ny)=>[nx, ny]))
  // y = y - 1, y + height
  loop = loop.concat([y - 1, y + height]
  .map((ny) => range(x, x + width).map((nx) => [nx, ny])))
  loop = flatten2D(loop)

  return loop
}

function buildWorld(format, info){
  let lines = format.split("\n")
  var toreturn = new World(lines[0].split(" ").length, lines.length)

  for(let y = 0; y < lines.length; ++y){
    let cells = lines[y].split(" ")
    for(let x = 0; x < cells.length; ++x){
      if(cells[x] == "C"){
        toreturn.setCovered(x, y, true)
      }
    }
  }

  lines = info.split("\n")
  for(let line of lines){
    let properties = line.split(" ")
    let type = properties.shift()
    if(type == "H"){
      let [x, y, width, height, residents] = properties.map((val) => parseInt(val))
      toreturn.addHouse(new House(x, y, width, height, toreturn, residents))
    }else if(type == "S"){
      let [x, y, width, height] = properties.map((val) => parseInt(val))
      toreturn.addShop(new Shop(x, y, width, height, toreturn))
    }
  }

  return toreturn
}

function initialize(){
  for(let id in textTags){
    getText("./world_files/" + textTags[id], id)
  }
}

function getText(file, id){
  fetch(file)
  .then(response => response.text())
  .then((data) => {
    texts[id] = data
  })
}