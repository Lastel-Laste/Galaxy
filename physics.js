// physics.js 파일

// 중력 상수 설정
const gravity = 0.98;

// 마우스
let mouseX = 0;
let mouseY = 0;

function distance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

function showCoordinates(event) {
  const coordinates = document.getElementById("coordinates");
  coordinates.innerHTML = `x: ${event.clientX.toFixed(2)}, y: ${event.clientY.toFixed(2)}`;
}

canvas.addEventListener("mousemove", showCoordinates);

// 드래그 이벤트 등록
canvas.addEventListener("mousedown", (event) => {
  mouseX = event.clientX;
  mouseY = event.clientY;

  for (let i = 0; i < balls.length; i++) {
    if (distance(balls[i].x, balls[i].y, mouseX, mouseY) < balls[i].radius) {
      balls[i].isDragging = true;
      balls[i].dragOffset.x = balls[i].x - mouseX;
      balls[i].dragOffset.y = balls[i].y - mouseY;
      balls[i].velocity.x = 0;
      balls[i].velocity.y = 0;

      // 일정한 간격으로 이벤트 핸들러 함수를 호출하는 intervalId 변수 대신,
      // requestAnimationFrame() 함수를 사용하여 콜백 함수를 등록합니다.
      const updateBallPosition = () => {
        // 콜백 함수 내부에서 다시 requestAnimationFrame() 함수를 호출하여,
        // 지속적으로 공의 위치를 업데이트하도록 합니다.
        if (balls[i].isDragging) {
          balls[i].x = mouseX + balls[i].dragOffset.x;
          balls[i].y = mouseY + balls[i].dragOffset.y;
          balls[i].velocity.x = 0;
          balls[i].velocity.y = 0;
          requestAnimationFrame(updateBallPosition);
        }
      };
      requestAnimationFrame(updateBallPosition);
      break;
    }
  }
});

canvas.addEventListener("mousemove", (event) => {
  for (let i = 0; i < balls.length; i++) {
    if (balls[i].isDragging) {
      const dx = event.clientX - mouseX;
      const dy = event.clientY - mouseY;
      balls[i].x += dx;
      balls[i].y += dy;
      mouseX = event.clientX;
      mouseY = event.clientY;
    }
  }
});

canvas.addEventListener("mouseup", (event) => {
  for (let i = 0; i < balls.length; i++) {
    if (balls[i].isDragging) {
      balls[i].isDragging = false;
      break;
    }
  }
});

function checkCollision(ball1, ball2) {
  const dist = distance(ball1.x, ball1.y, ball2.x, ball2.y);
  return dist <= ball1.radius + ball2.radius;
}

function resolveCollision(ball1, ball2) {
  const dx = ball2.x - ball1.x;
  const dy = ball2.y - ball1.y;

  const dist = distance(ball1.x, ball1.y, ball2.x, ball2.y);

  if (dist == 0) return;

  const nx = dx / dist;
  const ny = dy / dist;

  const p = 2 * (ball1.velocity.x * nx + ball1.velocity.y * ny - ball2.velocity.x * nx - ball2.velocity.y * ny) / (ball1.radius + ball2.radius);

  ball1.velocity.x -= p * ball2.radius * nx;
  ball1.velocity.y -= p * ball2.radius * ny;
  ball2.velocity.x += p * ball1.radius * nx;
  ball2.velocity.y += p * ball1.radius * ny;
}
