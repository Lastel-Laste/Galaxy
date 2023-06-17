// MouseEvent.js

var leftMouseDown = false;
var leftMouseX = 0;
var leftMouseY = 0;
var rightMouseDown = false;
var rightMouseX = 0;
var rightMouseY = 0;
var zoomSpeed = 0.1;

function addMouseListeners() {
  document.addEventListener('mousedown', onMouseDown, false);
  document.addEventListener('mouseup', onMouseUp, false);
  document.addEventListener('mousemove', onMouseMove, false);
  document.addEventListener('wheel', onMouseWheel, false);
  document.addEventListener('contextmenu', onContextMenu, false);
}

function onMouseDown(event) {
  if (event.button === 0) { // 좌클릭
    leftMouseDown = true;
    leftMouseX = event.clientX;
    leftMouseY = event.clientY;
  }
  if (event.button === 2) { // 우클릭
    event.preventDefault();
    rightMouseDown = true;
    rightMouseX = event.clientX;
    rightMouseY = event.clientY;
  }
}

function onMouseUp(event) {
  if (event.button === 0) { // 좌클릭
    leftMouseDown = false;
  }
  if (event.button === 2) { // 우클릭
    rightMouseDown = false;
  }
}

function onMouseMove(event) {
  if (leftMouseDown) {
    var deltaX = event.clientX - leftMouseX;
    var deltaY = event.clientY - leftMouseY;

    // 큐브 회전
    var rotationSpeed = 0.005;
    scene.rotation.y += deltaX * rotationSpeed;
    scene.rotation.x += deltaY * rotationSpeed;

    leftMouseX = event.clientX;
    leftMouseY = event.clientY;
  }

  if (rightMouseDown) {
    var deltaX = event.clientX - rightMouseX;
    var deltaY = event.clientY - rightMouseY;

    // 카메라 위치 조정
    var movementSpeed = 1;
    camera.position.x -= deltaX * movementSpeed;
    camera.position.y += deltaY * movementSpeed;

    rightMouseX = event.clientX;
    rightMouseY = event.clientY;
  }
}

function onMouseWheel(event) {
  // 휠로 줌 인/아웃
  var delta = event.deltaY;
  if (delta < 0) {
    camera.position.z *= (1 - zoomSpeed);
  } else {
    camera.position.z *= (1 + zoomSpeed);
  }
}

function onContextMenu(event) {
  event.preventDefault();
}
