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
    //TODO make a reset game function
  }

  document.getElementById("howto").onclick = function(){
    document.getElementById("menuContainer").hidden = true;
    document.getElementById("gameContainer").hidden = true;
    document.getElementById("rules").hidden = false;
  }

  initializeFiles()
}

var world;
var gameRunning = false;
// Milliseconds between each frame
const timeDelta = 300;

// What to do when the game starts
function start(){
  if(Object.keys(texts).length != Object.keys(textTags).length){
    setTimeout(start, 50)
    return
  }
  world = buildWorld(texts.w1Format, texts.w1Info)

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

    // Same as covered, but doesn't take into account people
    this.map = JSON.parse(JSON.stringify(this.covered))

    this.characters = []
    this.houses = []
    this.shops = []

    this.camera = new Camera(0, 0, 30)
  }
  // Call this before adding any people
  initializeBFS(){
    for(let shop of this.shops){
      shop.distancesFrom = shop.doBFS(JSON.parse(JSON.stringify(this.map)))
    }
    for(let house of this.houses){
      house.distancesFrom = house.doBFS(JSON.parse(JSON.stringify(this.map)))
    }
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
      house.tick()
    }
    for(let shop of this.shops){
      shop.tick()
    }

    //pass character count to html
    var characterCountHTML = document.getElementById("characterCount").innerHTML;
    console.log(characterCountHTML); 
    //= ''.concat("Character Count: ", this.characters.length);
  }
  render(){
    for(let x = 0; x < this.width; ++x){
      for(let y = 0; y < this.height; ++y){
        if(this.covered[x][y]){
          this.camera.render(x, y, 1, 1, "lightgreen")
        }
      }
    }
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
          this.map[x][y] = true
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
          this.map[x][y] = true
        }else{
          console.log("shop reaches past the border")
        }
      }
    }
  }
  // Returns if something can spawn on this cell, or if it's empty(if it doesn't exist, it's the same as a border)
  isEmpty(x, y){
    if(0 <= x && x < this.width && 0 <= y && y < this.height){
      return !this.covered[x][y]
    }
    return false
  }
  deleteCharacter(character){
    this.characters.splice(this.characters.indexOf(character), 1)
    this.covered[character.x][character.y] = false
  }
  setUnwalkable(x, y, value){
    this.covered[x][y] = value
    this.map[x][y] = value
  }
  randomHouse(){
    return this.houses[Math.floor(Math.random() * this.houses.length)]
  }
  randomShop(){
    return this.shops[Math.floor(Math.random() * this.shops.length)]
  }
  intoBuilding(building, character){
    building.enterBuilding(character)
    this.deleteCharacter(character)
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

// The possible adjacent moves
const moves = [[-1, 0], [1, 0], [0, 1], [0, -1]]

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
  constructor(x, y, world, buildingsPath, timeInBuildings){
    super(x, y, 1, 1, world)
    this.buildingsPath = buildingsPath
    this.timeInBuildings = timeInBuildings
    this.currentBuilding = this.buildingsPath[0];
    this.time = timeInBuildings[0]
    this.color = characterColor;
  }
  // Based on where the character is now, we get its new move
  getMove(){
    let distances = this.currentBuilding.distancesFrom;
    // Make sure every coordinate is in the map and valid
    let possibleValues = moves.map((diff) => [this.x + diff[0], this.y + diff[1]]).filter((coord) => this.world.isEmpty(coord[0], coord[1]))

    // Remove anything that gives us a lower rating
    possibleValues = possibleValues.filter((coord) => distances[coord[0]][coord[1]] <= distances[this.x][this.y])

    // Sort by rating
    possibleValues.sort((first, second) => distances[first[0]][first[1]] - distances[second[0]][second[1]])

    return possibleValues.length > 0 ? possibleValues[0] : [this.x, this.y]
  }
  render(camera){
    camera.render(this.x, this.y, this.width, this.height, this.color);
  }
}

// A building
class Building extends Entity{
  constructor(x, y, width, height, world){
    super(x, y, width, height, world)
    this.distancesFrom = []
    this.characters = []
    this.characterTimeIn = []
  }
  doBFS(covered){
    var distance = []
    for(let i = 0; i < this.world.width; ++i){
      distance.push(new Array(this.world.height).fill(99999999))
    }

    var queue = createLoop(this.x, this.y, this.width, this.height).filter((coord) => inRange(coord[0], coord[1], this.world.width, this.world.height))
    queue.forEach((coord) => covered[coord[0]][coord[1]] = true)
    let currentIter = 1
    for(;queue.length > 0; ++currentIter){
      var buffer = []
      while(queue.length > 0){
        let [x, y] = queue.shift()
        distance[x][y] = currentIter
        for(let move of moves){
          let [dx, dy] = move
          let nx = x + dx
          let ny = y + dy
          if(inRange(nx, ny, this.world.width, this.world.height) && !covered[nx][ny]){
            buffer.push([nx, ny])
            covered[nx][ny] = true
          }
        }
      }
      queue = buffer;
    }

    return distance
  }
  enterBuilding(character){
    this.characters.push(character)
    this.characterTimeIn.push(timeInBuilding)
  }
}


const residentSpawnChance = 0.2;
const maxPeoplePerSpawn = 2;
// People start the day in houses
class House extends Building{
  constructor(x, y, width, height, world, residents){
    super(x, y, width, height, world);
    this.spawnChance = residentSpawnChance
    this.maxAtOnce = maxPeoplePerSpawn
    this.world = world
    this.color = houseColor;

    this.inHome = []
    for(let i = 0; i < residents; ++i){
      this.inHome.push(new Character(0, 0, this.world, [null], [null]))
    }
    this.residentsInHome = Array.from(this.inHome);
  }
  tick(){
    let loop = createLoop(this.x, this.y, this.width, this.height).filter((coord) => this.world.isEmpty(coord[0], coord[1]))

    var toSpawn = []

    while(Math.random() < this.spawnChance && toSpawn.length < this.maxAtOnce && this.residentsInHome.length > 0 && loop.length > 0){
      let ci = Math.floor(Math.random() * loop.length);
      let [x, y] = loop[ci]
      toSpawn.push([x, y])
      loop.splice(ci, 1)
    }

    
    for(let coord of toSpawn){
      let [x, y] = coord
      var toAdd = this.residentsInHome.shift()
      toAdd.buildingsPath = [this.world.randomShop()]
      toAdd.timeInBuildings = [5]
      this.world.addCharacter(toAdd)
    }
  }
  render(camera){
    camera.render(this.x, this.y, this.width, this.height, this.color);
  }
}

const shopColor = "blue"
const timeInBuilding = 5
class Shop extends Building{
  constructor(x, y, width, height, world){
    super(x, y, width, height, world)
    this.color = shopColor
  }
  tick(){
    for(let i = 0; i < this.characters.length; ++i){
      ++this.characterTimeIn[i];
      if(this.characterTimeIn[i] >= timeInBuilding){
        let around = createLoop(this.x, this.y, this.width, this.height).filter((coord) => this.world.isEmpty(coord[0], coodr[1]))
        let targetCoord = around[Math.floor(Math.random() * around.length)]
        this.world.addCharacter(this.characters.shift())
        this.characterTimeIn.shift()
      }
    }
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
        toreturn.setUnwalkable(x, y, true)
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

  toreturn.initializeBFS();

  return toreturn
}

function initializeFiles(){
  for(let id in textTags){
    setText("./world_files/" + textTags[id], id)
  }
}

function setText(file, id){
  fetch(file)
  .then(response => response.text())
  .then((data) => {
    texts[id] = data
  })
}

function inRange(x, y, worldWidth, worldHeight){
  return 0 <= x && x < worldWidth && 0 <= y && y < worldHeight;
}