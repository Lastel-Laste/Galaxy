// Main.js

class Particle {
  constructor() {
    const radius = Math.random() * 3 + 2;
    const geometry = new THREE.SphereGeometry(radius);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(
      Math.random() * cubeSize - cubeSize / 2,
      Math.random() * cubeSize - cubeSize / 2,
      Math.random() * cubeSize - cubeSize / 2
    );
    this.previousPosition = this.mesh.position.clone();
    
    this.velocity = new THREE.Vector3();
    
    this.mass = radius * radius * 10e8;
    const shape = new CANNON.Sphere(radius);
    this.body = new CANNON.Body({ mass: this.mass, shape });
    this.body.position.copy(this.mesh.position);
    
    this.isColliding = false;
  }

  update() {
    const position = this.body.position;
    
    this.mesh.position.copy(position);
    this.mesh.position.add(this.velocity);
    
    const boundary = 500;
    const radius = this.mesh.geometry.parameters.radius;
    const restitution = 0.8;

    // 경계 충돌 판정
    if (this.mesh.position.x - radius < -boundary) {
      this.mesh.position.x = -boundary + radius;
      this.velocity.x *= -restitution; 
    } else if (this.mesh.position.x + radius > boundary) {
      this.mesh.position.x = boundary - radius;
      this.velocity.x *= -restitution; 
    }
    if (this.mesh.position.y - radius < -boundary) {
      this.mesh.position.y = -boundary + radius;
      this.velocity.y *= -restitution; 
    } else if (this.mesh.position.y + radius > boundary) {
      this.mesh.position.y = boundary - radius;
      this.velocity.y *= -restitution; 
    }
    if (this.mesh.position.z - radius < -boundary) {
      this.mesh.position.z = -boundary + radius;
      this.velocity.z *= -restitution; 
    } else if (this.mesh.position.z + radius > boundary) {
      this.mesh.position.z = boundary - radius;
      this.velocity.z *= -restitution; 
    }

    const cellX = Math.floor((this.mesh.position.x + boundary) / cellSize);
    const cellY = Math.floor((this.mesh.position.y + boundary) / cellSize);
    const cellZ = Math.floor((this.mesh.position.z + boundary) / cellSize);

    for (let cx = cellX - 1; cx <= cellX + 1; cx++) {
      for (let cy = cellY - 1; cy <= cellY + 1; cy++) {
        for (let cz = cellZ - 1; cz <= cellZ + 1; cz++) {
          const cellParticles = cells[getCellIndex(cx, cy, cz)];

          if (cellParticles) {
            for (let i = 0; i < cellParticles.length; i++) {
              const particle = cellParticles[i];
              if (particle !== this) {
                const distance = this.mesh.position.distanceTo(particle.mesh.position);
                const sumOfRadii = this.mesh.geometry.parameters.radius + particle.mesh.geometry.parameters.radius;

                if (distance < sumOfRadii) {
                  handleCollision(this, particle);
                }
              }
            }
          }
        }
      }
    }

    if (!this.isColliding) {
      this.mesh.material.color.set(0xffffff);
    }

    this.body.position.copy(this.mesh.position);
    this.isColliding = false;
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
    const velocity1 = new THREE.Vector3(particleA.velocity.x, particleA.velocity.y, particleA.velocity.z);
    const velocity2 = new THREE.Vector3(particleB.velocity.x, particleB.velocity.y, particleB.velocity.z);

    // 운동량 보존을 이용한 속도 벡터 계산
    const restitution = 0.8; // 반발력 계수
    const massSum = particleA.mass + particleB.mass;
    const velocityDiff = velocity1.clone().sub(velocity2);
    const impulse = (1 + restitution) * velocityDiff.dot(normal) / massSum;
    const impulseVector = normal.clone().multiplyScalar(impulse);

    particleA.velocity.sub(impulseVector.clone().multiplyScalar(particleB.mass));
    particleB.velocity.add(impulseVector.clone().multiplyScalar(particleA.mass));
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
  particle1.velocity.add(new THREE.Vector3(ax1, ay1, az1));
  particle2.velocity.add(new THREE.Vector3(ax2, ay2, az2));
}
