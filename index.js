var canvas;
var context;

const textTags = {
  wNeighbourhoodFormat: "world1.txt",
  wNeighbourhoodInfo: "world1_info.txt",
  wSuburbsFormat: "world2.txt",
  wSuburbsInfo: "world2_info.txt",
  wDowntownFormat: "world3.txt",
  wDowntownInfo: "world3_info.txt",
  wManhattanFormat: "world4.txt",
  wManhattanInfo: "world4_info.txt"
}
var texts = {}

// Infection Rate when someone is right next to you outside
const infectionRate = 0.1;
// Infection rate inside houses
const indoorInfectionRate = 0.003
const maxInfection = 2
const startingInfectedChance = 0

const maskReductionInDecimal = 0.85;

// At each frame, the chance for a house to spawn a resident
const residentSpawnChance = 0.1;
const maxPeoplePerSpawn = 10;

// At each frame, when the virus will manifest itself(either the person dies or becomes immune)
const liveOrDiePercentage = 0.0007;
const mortalityRate = 0.25

var world;
var gameRunning = false;
var initialPopulation = 0;
// Milliseconds between each frame
const timeDelta = 300;
const renderTimeDelta = 40

// Colors for each character
const characterColor = "lightblue";
const infectedCharacterColor = "red"
const houseColor = "pink";
const immuneColor = "#FFFF00"

// The possible adjacent moves
const moves = [[-1, 0], [1, 0], [0, 1], [0, -1]]

const shopColor = "blue"

// This keeps track of whether or not a key is pressed down
var isKeyDown = {
  "ArrowLeft": false,
  "ArrowRight": false,
  "ArrowDown": false,
  "ArrowUp": false
}
// the pixel movement is timeDelta * cameraPixelMovement
const cameraPixelMovement = 1
var cameraCellWidth = 10
var mouseCoords = [0, 0]


window.onload = function () {
  // Starting code of the program
  console.log("starting");

  canvas = document.getElementById("gameCanvas");
  context = canvas.getContext("2d");

  // what to do when to start a new game
  document.getElementById("newGameButton").onclick = function () {
    document.getElementById("menuContainer").hidden = true;
    document.getElementById("splashScreen").hidden = false;
    setTimeout(function () {
      document.getElementById("splashScreen").hidden = true
      document.getElementById("gameContainer").hidden = false
      startScreen(start)
    }, 9000)
  }

  document.getElementById("mainMenuButton").onclick = function () {
    document.getElementById("menuContainer").hidden = false;
    document.getElementById("gameContainer").hidden = true;
    gameRunning = false
  }

  document.getElementById("howto").onclick = function () {
    document.getElementById("menuContainer").hidden = true;
    document.getElementById("gameContainer").hidden = true;
    document.getElementById("rules").hidden = false;
  }

  document.getElementById("backButton").onclick = function () {
    document.getElementById("menuContainer").hidden = false;
    document.getElementById("gameContainer").hidden = true;
    document.getElementById("rules").hidden = true;
  }

  document.getElementById("restart").onclick = () => startScreen(restart)


  document.onkeydown = function (event) {
    isKeyDown[event.code] = true
  }
  document.onkeyup = function (event) {
    isKeyDown[event.code] = false
  }
  document.onmousemove = function (event) {
    mouseCoords = [event.clientX, event.clientY]
  }

  initializeFiles()
}

function onClick() {

}

const possibleChoices = ["Neighbourhood", "Suburbs", "Downtown", "Manhattan"]
function startScreen(onClickFunction) {
  document.getElementById("worldChoiceScreen").hidden = false;

  for (let choice of possibleChoices) {
    document.getElementById("choice" + choice + "Button").onclick = function () {
      onClickFunction("w" + choice + "Format", "w" + choice + "Info")
      document.getElementById("worldChoiceScreen").hidden = true;
    }
  }
}

// What to do when the game starts
function start(format, info) {
  if (Object.keys(texts).length != Object.keys(textTags).length) {
    setTimeout(start, 50)
    return
  }
  initialPopulation = 0;
  world = buildWorld(texts[format], texts[info])
  gameRunning = true;

  document.getElementById("vaccinateButton").onclick = function () {
    world.vaccinate(parseInt(document.getElementById("vaccinatePercentage").innerHTML) / 100)
  }
  document.onwheel = function (event) {
    world.camera.pixelWidth += event.deltaY * -0.005;
  }
  document.getElementById("ReCenter").onclick = function () {
    world.camera.resetCamera();
  }

  canvas.onmousedown = function () {
    world.camera.isMouseDown = true
    world.camera.lastRecordedMouseCoord = JSON.parse(JSON.stringify(mouseCoords))
  }
  document.onmouseup = function () {
    world.camera.isMouseDown = false
  }

  update()
  render()
}

function restart(format, info) {
  initialPopulation = 0;
  world = buildWorld(texts[format], texts[info]);
}

// This is the "loop function"
function update() {
  if (gameRunning) {
    world.tick();
    setTimeout(update, timeDelta - parseInt(document.getElementById("speedSlider").value))
  }
}

// A more frequently occuring function
function render() {
  if (gameRunning) {
    world.camera.moveDimensions()
    context.clearRect(0, 0, canvas.width, canvas.height);
    world.render();
    setTimeout(render, renderTimeDelta)
  }
}

function drawRect(x, y, width, height, color) {
  context.fillStyle = color;
  context.fillRect(x, y, width, height);
}

function drawCircle(x, y, radius, color) {
  context.beginPath();
  context.arc(x, y, radius, 0, 2 * Math.PI, false)
  context.fillStyle = color
  context.fill()
}

// This is the world
class World {
  constructor(cellsX, cellsY) {
    this.width = cellsX;
    this.height = cellsY;
    this.age = 0;
    console.log("created a new world!")

    // covered[x][y]
    this.covered = []
    for (let i = 0; i < this.width; ++i) {
      this.covered.push(new Array(this.height).fill(false));
    }

    // Same as covered, but doesn't take into account people
    this.map = JSON.parse(JSON.stringify(this.covered))

    this.characters = []
    this.houses = []
    this.shops = []

    this.maskPercentage = 0
    this.sdRange = 0
    this.vaccinePercentage

    this.outsideInfectionRate = infectionRate
    this.indoorInfectionRate = indoorInfectionRate

    this.camera = new Camera(0, 0, cameraCellWidth)
  }
  // Call this before adding any people
  initialize() {
    let allCharacters = this.characters
    for (let house of this.houses) {
      allCharacters = allCharacters.concat(house.residentsInHome)
    }
    let noneInfected = true
    for (let person in allCharacters) {
      if (person.infected) {
        noneInfected = false
        break
      }
    }
    if (noneInfected) {
      if (allCharacters.length > 0) {
        allCharacters[Math.floor(Math.random() * allCharacters.length)].infected = true
      }
    }

    for (let shop of this.shops) {
      shop.distancesFrom = shop.doBFS(JSON.parse(JSON.stringify(this.map)))
    }
    for (let house of this.houses) {
      house.distancesFrom = house.doBFS(JSON.parse(JSON.stringify(this.map)))
    }
  }
  canMove(character, newX, newY) {
    // Characters can only move up, down, left or right
    if (Math.abs(newX - character.x) + Math.abs(newY - character.y) > 1) {
      return false;
    }
    // Return if there isn't anything at the new position
    return 0 <= newX && newX < this.width && 0 <= newY && newY <= this.height && !this.covered[newX][newY];
  }
  // move the character to newX and newY
  move(character, newX, newY) {
    if (this.canMove(character, newX, newY)) {
      this.covered[character.x][character.y] = false;
      this.covered[newX][newY] = true;
      character.x = newX
      character.y = newY
    }
  }
  // At each time step
  tick() {
    this.age++;
    // Everything that can tick will tick()
    for (let house of this.houses) {
      house.tick()
    }
    for (let shop of this.shops) {
      shop.tick()
    }
    for (let character of this.characters) {
      character.getMove()
      character.tick()
    }

    //day counter
    document.getElementById("day").innerHTML = ''.concat("Day: ", Math.floor(this.age / 48));

    //pass character count to html
    var characterCountHTML = document.getElementById("characterCount");
    var healthyCountHTML = document.getElementById("healthyCount");
    var infectedCountHTML = document.getElementById("infectedCount");
    var deathCountHTML = document.getElementById("deathCount");
    var count = this.characters.length;
    var healthy = 0;
    var infected = 0;

    for (let char of this.characters) {
      if (char.infected == true) {
        infected++;
      } else {
        healthy++;
      }
    }
    for (let house of this.houses) {
      for (let char of house.characters.concat(house.residentsInHome)) {
        if (char.infected == true) {
          infected++;
        } else {
          healthy++;
        }
        ++count
      }
    }
    for (let shop of this.shops) {
      count += shop.characters.length;
      for (let char of shop.characters) {
        if (char.infected == true) {
          infected++;
        } else {
          healthy++;
        }
      }
    }

    console.log(this.getAllCharacters().length)

    var deaths = initialPopulation - count;
    characterCountHTML.innerHTML = ''.concat("Population: ", count);
    healthyCountHTML.innerHTML = ''.concat("Healthy: ", healthy);
    infectedCountHTML.innerHTML = ''.concat("Infected: ", infected);
    deathCountHTML.innerHTML = ''.concat("Deaths: ", deaths);

    //update value of the control panels
    document.getElementById("maskPercentage").innerHTML = document.getElementById("maskSlider").value;
    this.maskPercentage = parseInt(document.getElementById("maskPercentage").innerHTML);
    document.getElementById("sdRange").innerHTML = document.getElementById("sdSlider").value;
    this.sdRange = parseInt(document.getElementById("sdRange").innerHTML);
    document.getElementById("vaccinatePercentage").innerHTML = document.getElementById("vaccineSlider").value;
    this.vaccinePercentage = parseInt(document.getElementById("vaccinatePercentage").innerHTML);
    document.getElementById("simulationSpeed").innerHTML = document.getElementById("speedSlider").value

    this.outsideInfectionRate = infectionRate - infectionRate * this.maskPercentage * maskReductionInDecimal / 100
    this.indoorInfectionRate = (indoorInfectionRate - indoorInfectionRate * this.maskPercentage * maskReductionInDecimal / 100) * 1 / this.sdRange;

    //base infection rate * mask percentage * 1/distance
  }
  vaccinate(dRatio) {
    let numbers = new Set()
    let characters = this.getAllCharacters()
    if (dRatio > 1) {
      for (let character of characters) {
        if (!character.infected) {
          character.immune = true
        }
      }
    }
    while (numbers.size < dRatio * characters.length) {
      numbers.add(Math.floor(Math.random() * characters.length))
    }
    for (let i of numbers) {
      if (!characters[i].infected) {
        characters[i].immune = true
      }
    }
  }
  render() {
    for (let x = 0; x < this.width; ++x) {
      for (let y = 0; y < this.height; ++y) {
        if (this.map[x][y]) {
          this.camera.render(x, y, 1, 1, "lightgreen")
        }
      }
    }
    for (let character of this.characters) {
      character.render(this.camera);
    }
    for (let house of this.houses) {
      house.render(this.camera)
    }
    for (let shop of this.shops) {
      shop.render(this.camera)
    }
  }
  addCharacter(character) {
    if (this.isEmpty(character.x, character.y)) {
      this.covered[character.x][character.y] = true
      this.characters.push(character)
    } else {
      console.log("couldn't add character")
    }
  }
  characterDied(character) {
    for (let house of this.houses) {
      house.removeCharacter(character)
    }
    for (let i = 0; i < this.characters.length; ++i) {
      if (this.characters[i] == character) {
        this.characters.splice(i, 1)
        this.covered[character.x][character.y] = false
        return
      }
    }
    for (let shop of this.shops) {
      shop.removeCharacter(character)
    }
  }
  addHouse(house) {
    this.houses.push(house)
    for (let x = house.x; x < house.x + house.width; ++x) {
      for (let y = house.y; y < house.y + house.height; ++y) {
        if (0 <= x && x < this.width && 0 <= y && y < this.height) {
          this.covered[x][y] = true
          this.map[x][y] = true
        } else {
          console.log("house reaches past the border")
        }
      }
    }
  }
  addShop(shop) {
    this.shops.push(shop)
    for (let x = shop.x; x < shop.x + shop.width; ++x) {
      for (let y = shop.y; y < shop.y + shop.height; ++y) {
        if (0 <= x && x < this.width && 0 <= y && y < this.height) {
          this.covered[x][y] = true
          this.map[x][y] = true
        } else {
          console.log("shop reaches past the border")
        }
      }
    }
  }
  getAllCharacters() {
    let toreturn = []
    for (let house of this.houses) {
      for (let character of house.inHome) {
        toreturn.push(character)
      }
    }
    return toreturn
  }
  // Returns if something can spawn on this cell, or if it's empty(if it doesn't exist, it's the same as a border)
  isEmpty(x, y) {
    if (0 <= x && x < this.width && 0 <= y && y < this.height) {
      return !this.covered[x][y]
    }
    return false
  }
  deleteCharacter(character) {
    this.characters.splice(this.characters.indexOf(character), 1)
    this.covered[character.x][character.y] = false
  }
  setUnwalkable(x, y, value) {
    this.covered[x][y] = value
    this.map[x][y] = value
  }
  randomHouse() {
    return this.houses[Math.floor(Math.random() * this.houses.length)]
  }
  randomShop() {
    return this.shops[Math.floor(Math.random() * this.shops.length)]
  }
  intoBuilding(building, character) {
    this.deleteCharacter(character)
    building.enterBuilding(character)
  }
}

// Rendering the world
class Camera {
  constructor(x, y, pixelWidth) {
    this.x = x;
    this.y = y;
    this.pixelWidth = pixelWidth;

    this.lastRecordedMouseCoord = [0, 0]
    this.isMouseDown = false
  }
  // Everything is stored in cells, so we need to convert that into pixels
  render(cellX, cellY, cellWidth, cellHeight, color) {
    let startX = cellX * this.pixelWidth - this.x;
    let startY = cellY * this.pixelWidth - this.y;
    drawRect(startX, startY, cellWidth * this.pixelWidth, cellHeight * this.pixelWidth, color);
  }
  renderCircle(cellX, cellY, diameter, color) {
    let startX = cellX * this.pixelWidth - this.x + this.pixelWidth / 2;
    let startY = cellY * this.pixelWidth - this.y + this.pixelWidth / 2;
    drawCircle(startX, startY, diameter * this.pixelWidth / 2, color)
  }
  moveDimensions() {
    if (this.isMouseDown) {
      let [cx, cy] = mouseCoords
      let [ox, oy] = this.lastRecordedMouseCoord
      let diffX = ox - cx
      let diffY = oy - cy
      this.lastRecordedMouseCoord = mouseCoords

      this.x += diffX
      this.y += diffY
      this.x = Math.max(Math.min(world.width * this.pixelWidth - canvas.width, this.x), 0)
      this.y = Math.max(Math.min(world.height * this.pixelWidth - canvas.height, this.y), 0)
    }
  }
  resetCamera() {
    this.x = 0;
    this.y = 0;
    this.pixelWidth = 10;
    this.lastRecordedMouseCoord = [0, 0];
    this.isMouseDown = false;
    isKeyDown.ArrowDown = false;
    isKeyDown.ArrowUp = false;
    isKeyDown.ArrowLeft = false;
    isKeyDown.ArrowRight = false;
  }
}

// Any object that exists in the world
class Entity {
  constructor(x, y, width, height, world) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.world = world;
  }
}

// Each person
class Character extends Entity {
  constructor(x, y, world) {
    super(x, y, 1, 1, world)
    this.buildingsPath = null
    this.timeInBuildings = null
    this.currentBuilding = null
    this.time = 0

    this.color = characterColor;
    this.infectedColor = infectedCharacterColor;
    this.immuneColor = immuneColor

    this.infected = Math.random() < startingInfectedChance;

    this.resultPercentage = liveOrDiePercentage
    this.deathChance = mortalityRate
    this.immune = false;
  }
  // For when the character goes out of the house(we have a new shopping list)
  goOut(buildingsPath, timeInBuildings, x, y) {
    this.buildingsPath = buildingsPath
    this.timeInBuildings = timeInBuildings
    this.outOfBuilding(x, y)
  }
  particlesIn() {
    if (!this.immune) {
      this.infected = true
      this.startTimeInfected = world.age;
    }
  }
  tick() {
    if (this.infected) {
      if (Math.random() < this.resultPercentage) {
        if (Math.random() < this.deathChance) {
          this.world.characterDied(this)
          world.deaths++;
        } else {
          this.immune = true
          this.infected = false
        }
      }
    }
  }
  // Based on where the character is now, we get its new move
  getMove() {
    if (this.infected) {
      let nearby = this.world.characters.filter((character) => Math.abs(character.x - this.x) <= 2 && Math.abs(character.y - this.y) <= 2 && character != this)
      for (let c of nearby) {
        let probability = 1 / (Math.sqrt((c.x - this.x) * (c.x - this.x) + (c.y - this.y) * (c.y - this.y))) * this.world.outsideInfectionRate
        if (Math.random() < probability) {
          c.particlesIn()
        }
      }
    }

    let distances = this.currentBuilding.distancesFrom;
    if (distances[this.x][this.y] == 1) {
      this.world.intoBuilding(this.currentBuilding, this)
      return
    }

    // Make sure every coordinate is in the map and valid
    let possibleValues = moves.map((diff) => [this.x + diff[0], this.y + diff[1]]).filter((coord) => this.world.isEmpty(coord[0], coord[1]))

    // Sort by rating
    possibleValues.sort((first, second) => distances[second[0]][second[1]] - distances[first[0]][first[1]])

    if (possibleValues.length == 0) {
      return
    }

    var distancing = this.world.sdRange
    let nearbies = this.world.characters.filter((character) => Math.abs(character.x - this.x) <= 3 && Math.abs(character.y - this.y) <= 3).filter((c) => c != this)

    let maxVal = distances[possibleValues[0][0]][possibleValues[0][1]]
    // score based on how it can get to the home
    let scores = possibleValues.map((coord) => Math.abs(distances[coord[0]][coord[1]] - maxVal - 1))


    scores = scores.map(function (currentScore, i) {
      let [x, y] = possibleValues[i]
      if (nearbies.length == 0) {
        return currentScore
      }
      let closestDistance = Math.sqrt(nearbies.map((char) => (char.x - x) * (char.x - x) + (char.y - y) * (char.y - y)).reduce((last, current) => Math.min(last, current)))

      let multiplier = Math.pow(1 - distancing / 3 / (Math.pow(2, 2 * (closestDistance - 2.5)) + 1), 2)
      return currentScore * multiplier
    })

    let maxScore = scores.reduce((last, cur) => Math.max(last, cur))
    for (let i = 0; i < scores.length; ++i) {
      if (scores[i] == maxScore) {
        this.world.move(this, possibleValues[i][0], possibleValues[i][1])
      }
    }
  }
  // For when character goes out of a building
  outOfBuilding(x, y) {
    if (this.buildingsPath.length > 0) {
      this.currentBuilding = this.buildingsPath.shift()
      this.time = this.timeInBuildings.shift()
    }
    this.x = x
    this.y = y
  }
  render(camera) {
    let color = ""
    if (this.infected) {
      color = this.infectedColor
    } else if (this.immune) {
      color = this.immuneColor
    } else {
      color = this.color
    }
    camera.renderCircle(this.x, this.y, this.width, color);
  }
}

// A building
class Building extends Entity {
  constructor(x, y, width, height, world) {
    super(x, y, width, height, world)
    this.distancesFrom = []
    this.characters = []
    this.characterTimeIn = []
  }
  doBFS(covered) {
    var distance = []
    for (let i = 0; i < this.world.width; ++i) {
      distance.push(new Array(this.world.height).fill(99999999))
    }

    var queue = createLoop(this.x, this.y, this.width, this.height).filter((coord) => inRange(coord[0], coord[1], this.world.width, this.world.height))
    queue.forEach((coord) => covered[coord[0]][coord[1]] = true)
    let currentIter = 1
    for (; queue.length > 0; ++currentIter) {
      var buffer = []
      while (queue.length > 0) {
        let [x, y] = queue.shift()
        distance[x][y] = currentIter
        for (let move of moves) {
          let [dx, dy] = move
          let nx = x + dx
          let ny = y + dy
          if (inRange(nx, ny, this.world.width, this.world.height) && !covered[nx][ny]) {
            buffer.push([nx, ny])
            covered[nx][ny] = true
          }
        }
      }
      queue = buffer;
    }

    return distance
  }
  removeCharacter(character) {
    for (let i = 0; i < this.characters.length; ++i) {
      if (character == this.characters[i]) {
        this.characters.splice(i, 1)
        this.characterTimeIn.splice(i, 1)
      }
    }
  }
  letCharactersOut() {
    for (let i = 0; i < this.characters.length; ++i) {
      ++this.characterTimeIn[i];
      if (this.characterTimeIn[i] >= this.characters[i].time) {
        let around = createLoop(this.x, this.y, this.width, this.height).filter((coord) => this.world.isEmpty(coord[0], coord[1]))
        let targetCoord = around[Math.floor(Math.random() * around.length)]

        let character = this.characters.shift()
        character.outOfBuilding(targetCoord[0], targetCoord[1])
        this.world.addCharacter(character)
        this.characterTimeIn.shift()
      }
    }
  }
  enterBuilding(character) {
    this.characters.push(character)
    this.characterTimeIn.push(0)
  }
}

// People start the day in houses
class House extends Building {
  constructor(x, y, width, height, world, residents) {
    super(x, y, width, height, world);
    this.spawnChance = residentSpawnChance
    this.maxAtOnce = maxPeoplePerSpawn
    this.world = world
    this.color = houseColor;

    this.maxInfectionPerFrame = maxInfection

    // All people who belong in this home
    this.inHome = []
    for (let i = 0; i < residents; ++i) {
      this.inHome.push(new Character(0, 0, this.world))
    }
    // All residents who are actually in this house
    this.residentsInHome = Array.from(this.inHome);
  }
  removeCharacter(character) {
    super.removeCharacter(character)
    for (let i = 0; i < this.residentsInHome.length; ++i) {
      if (this.residentsInHome[i] == character) {
        this.residentsInHome.splice(i, 1)
      }
    }
    for (let i = 0; i < this.inHome.length; ++i) {
      if (this.inHome[i] == character) {
        this.inHome.splice(i, 1)
      }
    }
  }
  tick() {
    let allPeople = this.residentsInHome.concat(this.characters)
    let totalNewInfections = 0
    outer:
    for (let person of allPeople) {
      person.tick()
      if (person.infected) {
        for (let other of allPeople) {
          if (Math.random() < this.world.indoorInfectionRate) {
            other.particlesIn()
            ++totalNewInfections
            if (totalNewInfections >= this.maxInfectionPerFrame) {
              break outer;
            }
          }
        }
      }
    }

    let loop = createLoop(this.x, this.y, this.width, this.height).filter((coord) => this.world.isEmpty(coord[0], coord[1]))

    var toSpawn = []

    while (Math.random() < this.spawnChance && toSpawn.length < this.maxAtOnce && this.residentsInHome.length > 0 && loop.length > 0) {
      let ci = Math.floor(Math.random() * loop.length);
      let [x, y] = loop[ci]
      loop.splice(ci, 1)

      var toAdd = this.residentsInHome.shift()
      toAdd.goOut([this.world.randomShop(), this], [20, 0], x, y)
      this.world.addCharacter(toAdd)
    }

    this.letCharactersOut()
  }
  render(camera) {
    camera.render(this.x, this.y, this.width, this.height, this.color);
  }
  enterBuilding(character) {
    if (this.inHome.includes(character)) {
      this.residentsInHome.push(character)
    } else {
      this.characters.push(character)
      this.characterTimeIn.push(0)
    }
  }
}

class Shop extends Building {
  constructor(x, y, width, height, world) {
    super(x, y, width, height, world)
    this.color = shopColor
    this.maxInfectedPerFrame = maxInfection
  }
  tick() {
    let totalInfected = 0
    outer:
    for (let person of this.characters) {
      person.tick()
      if (person.infected) {
        for (let other of this.characters) {
          if (Math.random() < this.world.indoorInfectionRate) {
            other.particlesIn()
            ++totalInfected
            if (totalInfected >= this.maxInfectedPerFrame) {
              break outer;
            }
          }
        }
      }
    }

    this.letCharactersOut()
  }
  render(camera) {
    camera.render(this.x, this.y, this.width, this.height, this.color)
  }
}

function range(start, end) {
  var toreturn = []
  for (let i = start; i < end; ++i) {
    toreturn.push(i)
  }
  return toreturn
}

function flatten2D(arr) {
  var toreturn = []
  for (let a of arr) {
    toreturn = toreturn.concat(a)
  }
  return toreturn
}

// returns the list of coordinates that are "one step" away from the building
function createLoop(x, y, width, height) {
  // x = x - 1, x + width
  let loop = [x - 1, x + width]
    .map((nx) => range(y, y + height).map((ny) => [nx, ny]))
  // y = y - 1, y + height
  loop = loop.concat([y - 1, y + height]
    .map((ny) => range(x, x + width).map((nx) => [nx, ny])))
  loop = flatten2D(loop)

  return loop
}

function buildWorld(format, info) {
  let lines = format.split("\n").filter((line) => line != "")
  var toreturn = new World(lines[0].split(" ").filter((cell) => cell != "").length, lines.length)

  for (let y = 0; y < lines.length; ++y) {
    let cells = lines[y].split(" ").filter((cell) => cell != "")
    for (let x = 0; x < cells.length; ++x) {
      if (cells[x].trim() === "C") {
        toreturn.setUnwalkable(x, y, true)
      }
    }
  }

  lines = info.split("\n")
  for (let line of lines) {
    let properties = line.split(" ")
    let type = properties.shift()
    if (type == "H") {
      let [x, y, width, height, residents] = properties.map((val) => parseInt(val))
      toreturn.addHouse(new House(x, y, width, height, toreturn, residents))
      initialPopulation += residents;
    } else if (type == "S") {
      let [x, y, width, height] = properties.map((val) => parseInt(val))
      toreturn.addShop(new Shop(x, y, width, height, toreturn))
    }
  }

  toreturn.initialize();

  return toreturn
}

function initializeFiles() {
  for (let id in textTags) {
    setText("./world_files/" + textTags[id], id)
  }
}

function setText(file, id) {
  fetch(file)
    .then(response => response.text())
    .then((data) => {
      texts[id] = data
    })
}

function inRange(x, y, worldWidth, worldHeight) {
  return 0 <= x && x < worldWidth && 0 <= y && y < worldHeight;
}