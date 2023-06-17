// app.js

class Particle {
  constructor() {
    var geometry = new THREE.SphereGeometry(Math.random() * 3 + 2);
    var material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    var radius = geometry.parameters.radius;
    this.mesh = new THREE.Mesh(geometry, material);

    this.mesh.position.x = Math.random() * cubeSize - cubeSize/2;
    this.mesh.position.y = Math.random() * cubeSize - cubeSize/2;
    this.mesh.position.z = Math.random() * cubeSize - cubeSize/2;
    this.previousPosition = new THREE.Vector3().copy(this.mesh.position);

    this.velocityX = Math.random() * 0;
    this.velocityY = Math.random() * 0;
    this.velocityZ = Math.random() * 0;

    this.mass = radius * radius * 10e8;
    var shape = new CANNON.Sphere(radius);
    this.body = new CANNON.Body({ mass: this.mass, shape });
    this.body.position.set(this.mesh.position.x, this.mesh.position.y, this.mesh.position.z);
    world.addBody(this.body);

    this.isColliding = false; // 충돌 상태 여부
  }

  update() {
    var position = this.body.position;

    this.mesh.position.copy(position);

    this.mesh.position.x += this.velocityX;
    this.mesh.position.y += this.velocityY;
    this.mesh.position.z += this.velocityZ;

    var boundary = 500;
    var radius = this.mesh.geometry.parameters.radius;

    var restitution = 0.6; // 반발력 계수

    // 충돌 판정
    if (this.mesh.position.x - radius < -boundary) {
      this.mesh.position.x = -boundary + radius;
      this.velocityX *= -restitution; // 반발력 적용
    } else if (this.mesh.position.x + radius > boundary) {
      this.mesh.position.x = boundary - radius;
      this.velocityX *= -restitution; // 반발력 적용
    }
    if (this.mesh.position.y - radius < -boundary) {
      this.mesh.position.y = -boundary + radius;
      this.velocityY *= -restitution; // 반발력 적용
    } else if (this.mesh.position.y + radius > boundary) {
      this.mesh.position.y = boundary - radius;
      this.velocityY *= -restitution; // 반발력 적용
    }
    if (this.mesh.position.z - radius < -boundary) {
      this.mesh.position.z = -boundary + radius;
      this.velocityZ *= -restitution; // 반발력 적용
    } else if (this.mesh.position.z + radius > boundary) {
      this.mesh.position.z = boundary - radius;
      this.velocityZ *= -restitution; // 반발력 적용
    }

    // 파티클 충돌 검사
    var cellX = Math.floor((this.mesh.position.x + boundary) / cellSize);
    var cellY = Math.floor((this.mesh.position.y + boundary) / cellSize);
    var cellZ = Math.floor((this.mesh.position.z + boundary) / cellSize);

    for (var cx = cellX - 1; cx <= cellX + 1; cx++) {
      for (var cy = cellY - 1; cy <= cellY + 1; cy++) {
        for (var cz = cellZ - 1; cz <= cellZ + 1; cz++) {
          var cellParticles = cells[getCellIndex(cx, cy, cz)];

          if (cellParticles) {
            for (var i = 0; i < cellParticles.length; i++) {
              var particle = cellParticles[i];
              if (particle !== this) {
                var distance = this.mesh.position.distanceTo(particle.mesh.position);
                var sumOfRadii = this.mesh.geometry.parameters.radius + particle.mesh.geometry.parameters.radius;

                if (distance < sumOfRadii) {
                  // 충돌 계산
                  handleCollision(this, particle);
                }
              }
            }
          }
        }
      }
    }

    if (!this.isColliding) {
      this.mesh.material.color.set(0xffffff); // 충돌 상태가 아니면 하얀색으로 변경
    }

    this.body.position.copy(this.mesh.position);
    this.isColliding = false; // 충돌 상태 초기화
  }
}

var scene, camera, renderer, particles, world, cells;
var cubeSize = 1000 // 큐브 크기
var cellDivide = 32 // 큐브 한 변을 나누는 셀의 수
var cellSize = cubeSize/cellDivide; // 셀 크기

init();
animate();

function init() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 5000);
  camera.position.set(1200, 1200, 2000);
  camera.lookAt(scene.position);

  var cubeGeometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
  var edges = new THREE.EdgesGeometry(cubeGeometry);
  var line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xffffff }));
  scene.add(line);

  particles = [];
  cells = new Array(cellDivide * cellDivide * cellDivide);

  // Cannon.js world creation
  world = new CANNON.World();
  world.gravity.set(0, 0, 0); // 중력

  for (var i = 0; i < 1000; i++) {
    var particle = new Particle();
    scene.add(particle.mesh);
    particles.push(particle);

    // 셀에 파티클 할당
    var position = particle.mesh.position;
    var cellX = Math.floor((position.x + 500) / cellSize);
    var cellY = Math.floor((position.y + 500) / cellSize);
    var cellZ = Math.floor((position.z + 500) / cellSize);
    var cellIndex = getCellIndex(cellX, cellY, cellZ);
    if (!cells[cellIndex]) {
      cells[cellIndex] = [];
    }
    cells[cellIndex].push(particle);
  }

  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
  addMouseListeners();
}

function animate() {
  requestAnimationFrame(animate);

  // Update Cannon.js physics simulation
  world.step(1 / 60);

  // Update particle positions and rotations based on physics simulation
  for (var i = 0; i < particles.length; i++) {
    particles[i].update();

    // Get the position and rotation information from the Cannon.js body
    particles[i].mesh.position.copy(particles[i].body.position);
    particles[i].mesh.quaternion.copy(particles[i].body.quaternion);

    // Apply gravitational force between particles
    for (var j = i + 1; j < particles.length; j++) {
      applyGravitation(particles[i], particles[j]);
    }

    // Update particle's cell assignment
    var particle = particles[i];
    var position = particle.mesh.position;
    var oldCellX = Math.floor((particle.previousPosition.x + 500) / cellSize);
    var oldCellY = Math.floor((particle.previousPosition.y + 500) / cellSize);
    var oldCellZ = Math.floor((particle.previousPosition.z + 500) / cellSize);
    var newCellX = Math.floor((position.x + 500) / cellSize);
    var newCellY = Math.floor((position.y + 500) / cellSize);
    var newCellZ = Math.floor((position.z + 500) / cellSize);

    if (oldCellX !== newCellX || oldCellY !== newCellY || oldCellZ !== newCellZ) {
      // Remove particle from old cell
      var oldCellIndex = getCellIndex(oldCellX, oldCellY, oldCellZ);
      var oldCellParticles = cells[oldCellIndex];
      if (oldCellParticles) {
        var index = oldCellParticles.indexOf(particle);
        if (index !== -1) {
          oldCellParticles.splice(index, 1);
        }
      }

      // Add particle to new cell
      var newCellIndex = getCellIndex(newCellX, newCellY, newCellZ);
      if (!cells[newCellIndex]) {
        cells[newCellIndex] = [];
      }
      cells[newCellIndex].push(particle);

      // Update previous position
      particle.previousPosition.copy(position);
    }
  }

  renderer.render(scene, camera);
}

// Function to get the index of the cell based on its coordinates
function getCellIndex(x, y, z) {
  return x + y * cellDivide + z * cellDivide * cellDivide;
}

function handleCollision(particleA, particleB) {
  const dx = particleA.mesh.position.x - particleB.mesh.position.x;
  const dy = particleA.mesh.position.y - particleB.mesh.position.y;
  const dz = particleA.mesh.position.z - particleB.mesh.position.z;
  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

  if (distance < particleA.mesh.geometry.parameters.radius + particleB.mesh.geometry.parameters.radius) {
    particleA.mesh.material.color.set(0xff0000); // 충돌 시 빨간색으로 변경
    particleB.mesh.material.color.set(0xff0000); // 충돌 시 빨간색으로 변경
    
    // 겹침
    const overlap = (particleA.mesh.geometry.parameters.radius + particleB.mesh.geometry.parameters.radius) - distance;

    // 두 파티클 사이의 중심 방향 벡터
    const direction = new THREE.Vector3(dx / distance, dy / distance, dz / distance);

    // 두 파티클을 겹치지 않게 위치 조정
    particleA.mesh.position.x += overlap * direction.x;
    particleA.mesh.position.y += overlap * direction.y;
    particleA.mesh.position.z += overlap * direction.z;
    particleB.mesh.position.x -= overlap * direction.x;
    particleB.mesh.position.y -= overlap * direction.y;
    particleB.mesh.position.z -= overlap * direction.z;

    // 충돌 평면 벡터
    const normal = new THREE.Vector3(dx, dy, dz).normalize();

    // 충돌 이전의 속도 벡터
    const velocity1 = new THREE.Vector3(particleA.velocityX, particleA.velocityY, particleA.velocityZ);
    const velocity2 = new THREE.Vector3(particleB.velocityX, particleB.velocityY, particleB.velocityZ);

    // 운동량 보존을 이용한 속도 벡터 계산
    const restitution = 0.8; // 반발력 계수
    const massSum = particleA.mass + particleB.mass;
    const velocityDiff = velocity1.clone().sub(velocity2);
    const impulse = (1 + restitution) * velocityDiff.dot(normal) / massSum;
    const impulseVector = normal.clone().multiplyScalar(impulse);

    particleA.velocityX -= impulseVector.x * particleB.mass;
    particleA.velocityY -= impulseVector.y * particleB.mass;
    particleA.velocityZ -= impulseVector.z * particleB.mass;
    particleB.velocityX += impulseVector.x * particleA.mass;
    particleB.velocityY += impulseVector.y * particleA.mass;
    particleB.velocityZ += impulseVector.z * particleA.mass;
  }
}

function applyGravitation(particle1, particle2) {
  const G = 6.674 * Math.pow(10, -11); // 만유인력 상수
  const dx = particle2.mesh.position.x - particle1.mesh.position.x;
  const dy = particle2.mesh.position.y - particle1.mesh.position.y;
  const dz = particle2.mesh.position.z - particle1.mesh.position.z;
  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

  const gravity = (G * particle1.mass * particle2.mass) / Math.pow(distance, 2);
  const fx = gravity * dx / distance;
  const fy = gravity * dy / distance;
  const fz = gravity * dz / distance;

  // 파티클1에 대한 가속도
  const ax1 = fx / particle1.mass;
  const ay1 = fy / particle1.mass;
  const az1 = fz / particle1.mass;

  // 파티클2에 대한 가속도
  const ax2 = -fx / particle2.mass;
  const ay2 = -fy / particle2.mass;
  const az2 = -fz / particle2.mass;

  // 속도 갱신
  particle1.velocityX += ax1;
  particle1.velocityY += ay1;
  particle1.velocityZ += az1;

  particle2.velocityX += ax2;
  particle2.velocityY += ay2;
  particle2.velocityZ += az2;
}
