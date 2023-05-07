// object.js 파일

// Ball 클래스 정의
class Ball {
  constructor(x, y, radius, color) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
    this.velocity = { x: 0, y: 0 };
    this.isDragging = false;
    this.dragOffset = { x: 0, y: 0 };
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
    ctx.fillStyle = this.color;
    ctx.fill();

    ctx.fillStyle = "white";
    ctx.font = "14px Arial";
    ctx.fillText(`x: ${this.x.toFixed(2)}, y: ${this.y.toFixed(2)}`, 10, 20);

    const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
    const arrowSize = Math.max(5, speed / 10);
    const arrowAngle = Math.atan2(this.velocity.y, this.velocity.x);
    const arrowLength = Math.min(speed, 50);
    const arrowX = this.x + Math.cos(arrowAngle) * (this.radius + arrowLength);
    const arrowY = this.y + Math.sin(arrowAngle) * (this.radius + arrowLength);

    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(arrowX, arrowY);
    ctx.lineTo(
      arrowX + Math.cos(arrowAngle - Math.PI * 0.75) * arrowSize,
      arrowY + Math.sin(arrowAngle - Math.PI * 0.75) * arrowSize
    );
    ctx.moveTo(arrowX, arrowY);
    ctx.lineTo(
      arrowX + Math.cos(arrowAngle + Math.PI * 0.75) * arrowSize,
      arrowY + Math.sin(arrowAngle + Math.PI * 0.75) * arrowSize
    );
    ctx.lineWidth = 2;
    ctx.strokeStyle = "red";
    ctx.stroke();
  }

  update() {
    this.velocity.y += gravity;
    this.x += this.velocity.x;
    this.y += this.velocity.y;

    if (this.y + this.radius > canvas.height) {
      this.y = canvas.height - this.radius;
      this.velocity.y *= -0.8;
    }

    if (this.x - this.radius < 0) {
      this.x = this.radius;
      this.velocity.x *= -0.8;
    } else if (this.x + this.radius > canvas.width) {
      this.x = canvas.width - this.radius;
      this.velocity.x *= -0.8;
    }
  }
}

// Ball 객체 생성
const balls = [
  new Ball(canvas.width / 4, canvas.height / 2, 20, "white"),
  new Ball(2 * canvas.width / 4, canvas.height / 3, 20, "white"),
  new Ball(3 * canvas.width / 4, canvas.height / 3, 20, "white"),
];
