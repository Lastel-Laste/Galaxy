// Main.js

var scene, camera, renderer, world;
var particles = [];
var cubeSize = 1000;
var defaultMaterial;

init();
animate();

function init() {
  // --- Three.js 초기화 ---
  scene = new THREE.Scene();
  
  camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 5000);
  camera.position.set(1200, 1200, 2000);
  camera.lookAt(scene.position);
  
  // 경계 큐브 표시
  var cubeGeometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
  var edges = new THREE.EdgesGeometry(cubeGeometry);
  var line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xffffff }));
  scene.add(line);
  
  // --- Cannon.js 물리 월드 초기화 ---
  world = new CANNON.World();
  world.gravity.set(0, 0, 0); // 균일 중력은 없고, 파티클 간 중력을 수동으로 계산함
  world.broadphase = new CANNON.NaiveBroadphase();
  world.solver.iterations = 10;
  
  // 기본 재질 및 접촉 재질 설정 (충돌 시 마찰, 반발력 효과 적용)
  defaultMaterial = new CANNON.Material("default");
  var defaultContactMaterial = new CANNON.ContactMaterial(defaultMaterial, defaultMaterial, {
    friction: 0.3,
    restitution: 0.8
  });
  world.addContactMaterial(defaultContactMaterial);
  world.defaultContactMaterial = defaultContactMaterial;
  
  // --- 파티클 생성 ---
  // 예제에서는 1000개의 파티클 생성 (성능 문제 시 수를 줄일 수 있음)
  for (var i = 0; i < 1000; i++) {
    var particle = new Particle();
    particles.push(particle);
    scene.add(particle.mesh);
    world.addBody(particle.body);
  }
  
  // --- 렌더러 초기화 ---
  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
  
  // 마우스 이벤트 리스너 추가 (FPSCounter.js, MouseEvent.js는 그대로 사용)
  addMouseListeners();
}

// Particle 클래스 (회전 관련 처리 그대로 유지)
class Particle {
  constructor() {
    // 반경: 2~5 사이 (랜덤)
    this.radius = Math.random() * 3 + 2;
    var geometry = new THREE.SphereGeometry(this.radius, 16, 16);
    // MeshPhongMaterial 사용하여 조명 효과 적용 (회전 등 변화가 눈에 띔)
    var material = new THREE.MeshPhongMaterial({ color: 0xffffff });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(
      Math.random() * cubeSize - cubeSize / 2,
      Math.random() * cubeSize - cubeSize / 2,
      Math.random() * cubeSize - cubeSize / 2
    );
    
    // 질량: 부피에 비례하도록 (예시)
    this.mass = Math.pow(this.radius, 3);
    var shape = new CANNON.Sphere(this.radius);
    this.body = new CANNON.Body({ mass: this.mass, shape: shape });
    this.body.position.copy(this.mesh.position);
    // Cannon.js에서는 회전도 계산하므로 fixedRotation 설정 없이 둡니다.
    
    // 선형 및 각 감쇠: 약간의 마찰 효과 반영
    this.body.linearDamping = 0.01;
    this.body.angularDamping = 0.01;
    
    // 기본 재질 할당
    this.body.material = defaultMaterial;
  }
  
  update() {
    // Cannon.js가 계산한 위치와 회전 정보를 Three.js 메쉬에 반영
    this.mesh.position.copy(this.body.position);
    this.mesh.quaternion.copy(this.body.quaternion);
  }
}

// 고정 타임스텝 관련 변수
var fixedTimeStep = 1 / 60; // 60 Hz
var lastTime;

// animate 루프: 물리 연산과 렌더링을 분리하여 처리
function animate(time) {
  requestAnimationFrame(animate);
  
  if (lastTime !== undefined) {
    var dt = (time - lastTime) / 1000; // 경과시간(초)
    
    // 파티클 간 중력 계산 후 force 적용 (모든 파티클 쌍에 대해)
    applyGravitationalForces();
    
    // 고정 타임스텝으로 물리 업데이트
    world.step(fixedTimeStep, dt);
    
    // 각 파티클의 Three.js 메쉬를 업데이트
    for (var i = 0; i < particles.length; i++) {
      particles[i].update();
    }
  }
  
  lastTime = time;
  renderer.render(scene, camera);
}

// 중력 계산 함수: softening factor를 도입해 너무 가까운 경우 힘이 폭발하지 않도록 함
function applyGravitationalForces() {
  var G = 6.674e-11; // 만유인력 상수
  var softening = 1; // softening factor
  
  // 모든 파티클 쌍에 대해 중력 계산 (O(n²), 많은 파티클이면 성능 고려 필요)
  for (var i = 0; i < particles.length; i++) {
    for (var j = i + 1; j < particles.length; j++) {
      var p1 = particles[i];
      var p2 = particles[j];
      
      // 두 파티클 사이의 거리 벡터 계산
      var dx = p2.body.position.x - p1.body.position.x;
      var dy = p2.body.position.y - p1.body.position.y;
      var dz = p2.body.position.z - p1.body.position.z;
      var distanceSquared = dx * dx + dy * dy + dz * dz + softening * softening;
      var distance = Math.sqrt(distanceSquared);
      
      // 중력 힘의 크기 계산
      var forceMagnitude = (G * p1.mass * p2.mass) / distanceSquared;
      
      // 힘 벡터의 각 성분
      var fx = forceMagnitude * dx / distance;
      var fy = forceMagnitude * dy / distance;
      var fz = forceMagnitude * dz / distance;
      
      // 두 파티클에 반대 방향으로 힘 적용 (뉴턴의 제3법칙)
      var force = new CANNON.Vec3(fx, fy, fz);
      p1.body.applyForce(force, p1.body.position);
      p2.body.applyForce(force.negate(), p2.body.position);
    }
  }
}
