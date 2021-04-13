var canvas;
var context;


window.onload = function(){
  // Starting code of the program
  console.log("starting");

  canvas = document.getElementById("gameCanvas");
  context = canvas.getContext("2d");

  drawRect(0, 0, 50, 50, "blue");
}

function drawRect(x, y, width, height, color){
  context.fillStyle = color;
  context.fillRect(x, y, width, height);
}

function drawCircle(x, y, radius){

}

class World{
  
}
