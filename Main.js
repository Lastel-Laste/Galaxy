// 전역 변수 선언
var scene, camera, renderer;
var world;
var particles = [];
var cubeSize = 1000;

// Cannon.js 물리 월드 초기화
function initPhysics() {
  world = new CANNON.World();
  world.gravity.set(0, 0, 0); // 전역 중력은 0으로 설정 (파티클 간 상호 중력 사용)
  world.solver.iterations = 10;
  world.broadphase = new CANNON.NaiveBroadphase();
}

// 파티클 클래스
class Particle {
  constructor() {
    // 반지름 2 ~ 5 사이 (랜덤)
    this.radius = Math.random() * 3 + 2;
    
    // Three.js 메쉬 생성
    const geometry = new THREE.SphereGeometry(this.radius, 16, 16);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(
      Math.random() * cubeSize - cubeSize / 2,
      Math.random() * cubeSize - cubeSize / 2,
      Math.random() * cubeSize - cubeSize / 2
    );
    
    // 질량: 반지름의 세제곱에 비례 (단위 조정)
    this.mass = Math.pow(this.radius, 3);
    const shape = new CANNON.Sphere(this.radius);
    this.body = new CANNON.Body({
      mass: this.mass,
      shape: shape,
      position: new CANNON.Vec3(this.mesh.position.x, this.mesh.position.y, this.mesh.position.z)
    });
    
    // 감쇠 적용 (선형, 각속도)
    this.body.linearDamping = 0.99;
    this.body.angularDamping = 0.9;
    
    // 물리 월드에 추가
    world.addBody(this.body);
  }
  
  update() {
    // Cannon.js 바디의 위치와 회전을 Three.js 메쉬에 복사
    this.mesh.position.copy(this.body.position);
    this.mesh.quaternion.copy(this.body.quaternion);
  }
}

// 초기화 함수: 씬, 카메라, 렌더러, 파티클 생성
function init() {
  // 물리 월드 초기화
  initPhysics();
  
  // Three.js 씬 생성
  scene = new THREE.Scene();
  
  // 카메라 생성 및 위치 설정
  camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 5000);
  camera.position.set(1200, 1200, 2000);
  camera.lookAt(scene.position);
  
  // 시각적 기준을 위한 큐브 외곽선 추가
  var cubeGeometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
  var edges = new THREE.EdgesGeometry(cubeGeometry);
  var line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xffffff }));
  scene.add(line);
  
  // 다수의 파티클 생성
  for (var i = 0; i < 1000; i++) {
    var particle = new Particle();
    scene.add(particle.mesh);
    particles.push(particle);
  }
  
  // 렌더러 생성
  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
  
  // 마우스 이벤트 리스너 추가 (MouseEvent.js에 정의된 함수 사용)
  addMouseListeners();
}

// 파티클 간 상호 만유인력 적용 함수 (Cannon.js의 applyForce 사용)
function applyGravitation(particle1, particle2) {
  const G = 6.674e-11; // 만유인력 상수
  const pos1 = particle1.body.position;
  const pos2 = particle2.body.position;
  
  // 두 파티클 사이 벡터 및 거리 계산 (0으로 나누는 문제 방지)
  const diff = pos2.vsub(pos1);
  const distance = diff.norm() + 0.001;
  
  // 힘의 크기 계산
  const forceMagnitude = (G * particle1.mass * particle2.mass) / (distance * distance);
  const force = diff.unit().scale(forceMagnitude);
  
  // particle1에는 particle2 방향으로 힘 적용, particle2에는 반대 힘 적용
  particle1.body.applyForce(force, pos1);
  particle2.body.applyForce(force.negate(), pos2);
}

// 애니메이션 루프 (고정 시간 스텝 사용)
let lastTime;
function animate(time) {
  requestAnimationFrame(animate);
  
  if (lastTime !== undefined) {
    const dt = (time - lastTime) / 1000; // 초 단위 시간 간격
    const fixedTimeStep = 1 / 60; // 60Hz 고정 업데이트
    const maxSubSteps = 3;
    
    // 모든 파티클 간 만유인력 적용 (O(n²); 많은 파티클이면 최적화 고려)
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        applyGravitation(particles[i], particles[j]);
      }
    }
    
    // 물리 엔진 업데이트
    world.step(fixedTimeStep, dt, maxSubSteps);
  }
  lastTime = time;
  
  // 파티클 업데이트 (Three.js 메쉬와 동기화)
  particles.forEach(p => p.update());
  
  renderer.render(scene, camera);
}

init();
animate();
