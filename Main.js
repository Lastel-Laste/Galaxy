var scene, camera, renderer, particles = [];
var cubeSize = 1000;
var numParticles = 1000;
var world;
var G = 6.674e-11; // 만유인력 상수
var softening = 1; // 중력 계산 시 최소 거리(softening factor)

init();
animate();

function init() {
  // Three.js 씬 초기화
  scene = new THREE.Scene();
  
  camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 10000);
  camera.position.set(1200, 1200, 2000);
  camera.lookAt(scene.position);
  
  // 경계 구역 시각화 (와이어프레임 큐브)
  var cubeGeometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
  var edges = new THREE.EdgesGeometry(cubeGeometry);
  var line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xffffff }));
  scene.add(line);
  
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
  
  // Cannon.js 물리 월드 초기화
  world = new CANNON.World();
  world.gravity.set(0, 0, 0); // 전역 중력은 0, 각 입자 간 중력으로 적용
  // SAPBroadphase 사용 (cell 기반보다 효율적)
  world.broadphase = new CANNON.SAPBroadphase(world);
  world.solver.iterations = 10;
  
  // 입자 생성
  for (var i = 0; i < numParticles; i++) {
    var particle = new Particle();
    particles.push(particle);
    scene.add(particle.mesh);
    world.addBody(particle.body);
  }
  
  addMouseListeners();
}

// Particle 클래스 (회전 및 관성 모멘트 반영)
class Particle {
  constructor() {
    // 반지름: 2 ~ 5 사이의 임의 값
    this.radius = Math.random() * 3 + 2;
    
    // Three.js 메쉬 생성
    var geometry = new THREE.SphereGeometry(this.radius, 16, 16);
    var material = new THREE.MeshPhongMaterial({ color: 0xffffff });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(
      Math.random() * cubeSize - cubeSize / 2,
      Math.random() * cubeSize - cubeSize / 2,
      Math.random() * cubeSize - cubeSize / 2
    );
    
    // 부피에 비례한 질량 (스케일은 시뮬레이션에 맞게 조정)
    this.mass = (4/3) * Math.PI * Math.pow(this.radius, 3) * 1e6;
    
    // Cannon.js 바디 생성 (회전 활성화)
    var shape = new CANNON.Sphere(this.radius);
    this.body = new CANNON.Body({ mass: this.mass, shape: shape });
    this.body.position.copy(this.mesh.position);
    
    // 선형 및 각 감쇠 (마찰 효과)
    this.body.linearDamping = 0.01;
    this.body.angularDamping = 0.1;
    
    // 충돌 시 메쉬 색상을 일시적으로 변경 (빨간색)
    this.body.addEventListener("collide", (e) => {
      this.mesh.material.color.set(0xff0000);
      setTimeout(() => {
        this.mesh.material.color.set(0xffffff);
      }, 100);
    });
  }
  
  update() {
    // Cannon.js 바디 상태를 메쉬에 반영
    this.mesh.position.copy(this.body.position);
    this.mesh.quaternion.copy(this.body.quaternion);
    
    // 경계면과의 충돌 처리 (수동 보정)
    var boundary = cubeSize / 2;
    var restitution = 0.8;
    
    if (this.body.position.x - this.radius < -boundary) {
      this.body.position.x = -boundary + this.radius;
      this.body.velocity.x *= -restitution;
    } else if (this.body.position.x + this.radius > boundary) {
      this.body.position.x = boundary - this.radius;
      this.body.velocity.x *= -restitution;
    }
    if (this.body.position.y - this.radius < -boundary) {
      this.body.position.y = -boundary + this.radius;
      this.body.velocity.y *= -restitution;
    } else if (this.body.position.y + this.radius > boundary) {
      this.body.position.y = boundary - this.radius;
      this.body.velocity.y *= -restitution;
    }
    if (this.body.position.z - this.radius < -boundary) {
      this.body.position.z = -boundary + this.radius;
      this.body.velocity.z *= -restitution;
    } else if (this.body.position.z + this.radius > boundary) {
      this.body.position.z = boundary - this.radius;
      this.body.velocity.z *= -restitution;
    }
  }
}

var lastTime;
var fixedTimeStep = 1 / 60; // 고정 타임스텝 (60Hz)

function animate(time) {
  requestAnimationFrame(animate);
  
  if (lastTime !== undefined) {
    var dt = (time - lastTime) / 1000;
    // 고정 시간 간격으로 물리 연산 수행 (필요시 accumulator 사용 가능)
    world.step(fixedTimeStep, dt);
    
    // 입자 간 중력 계산 (O(n²); 입자 수가 많으면 Barnes-Hut나 옥트리 기반 알고리즘 고려)
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        let p1 = particles[i];
        let p2 = particles[j];
        
        let dx = p2.body.position.x - p1.body.position.x;
        let dy = p2.body.position.y - p1.body.position.y;
        let dz = p2.body.position.z - p1.body.position.z;
        let distance = Math.sqrt(dx*dx + dy*dy + dz*dz) + softening;
        let forceMagnitude = (G * p1.mass * p2.mass) / (distance * distance);
        
        let fx = forceMagnitude * dx / distance;
        let fy = forceMagnitude * dy / distance;
        let fz = forceMagnitude * dz / distance;
        
        let force1 = new CANNON.Vec3(fx, fy, fz);
        let force2 = new CANNON.Vec3(-fx, -fy, -fz);
        
        p1.body.applyForce(force1, p1.body.position);
        p2.body.applyForce(force2, p2.body.position);
      }
    }
  }
  lastTime = time;
  
  // 각 입자의 상태 업데이트
  for (var i = 0; i < particles.length; i++) {
    particles[i].update();
  }
  
  renderer.render(scene, camera);
}
