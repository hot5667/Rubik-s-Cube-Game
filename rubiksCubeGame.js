let scene, camera, renderer, controls;
let cubes = [];
const size = 0.9;
const gap = 0.1;
const cubeSize = size + gap;
const rotationIcon = document.getElementById('rotationIcon');
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let selectedFace = null;
let isAnimating = false;

const faceColors = [
    0xff0000, // 빨강 (오른쪽)
    0xff8000, // 주황 (왼쪽)
    0xffff00, // 노랑 (위)
    0xffffff, // 하양 (아래)
    0x00ff00, // 초록 (앞)
    0x0000ff  // 파랑 (뒤)
];

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('cubeCanvas'), antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    camera.position.set(4, 4, 4);
    camera.lookAt(0, 0, 0);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.enableZoom = true;

    createRubiksCube();
    animate();

    window.addEventListener('mousemove', onMouseMove, false);
    window.addEventListener('click', onMouseClick, false);
    window.addEventListener('resize', onWindowResize, false);
}

function createRubiksCube() {
    for (let x = -1; x <= 1; x++) {
        for (let y = -1; y <= 1; y++) {
            for (let z = -1; z <= 1; z++) {
                const geometry = new THREE.BoxGeometry(size, size, size);
                const materials = [];
                
                materials.push(new THREE.MeshBasicMaterial({ color: x === 1 ? faceColors[0] : 0x282828 }));
                materials.push(new THREE.MeshBasicMaterial({ color: x === -1 ? faceColors[1] : 0x282828 }));
                materials.push(new THREE.MeshBasicMaterial({ color: y === 1 ? faceColors[2] : 0x282828 }));
                materials.push(new THREE.MeshBasicMaterial({ color: y === -1 ? faceColors[3] : 0x282828 }));
                materials.push(new THREE.MeshBasicMaterial({ color: z === 1 ? faceColors[4] : 0x282828 }));
                materials.push(new THREE.MeshBasicMaterial({ color: z === -1 ? faceColors[5] : 0x282828 }));

                const cube = new THREE.Mesh(geometry, materials);
                cube.position.set(x * cubeSize, y * cubeSize, z * cubeSize);
                cube.userData.originalPosition = cube.position.clone();
                scene.add(cube);
                cubes.push(cube);
            }
        }
    }
}

function rotateFace(axis, layer, direction) {
    if (isAnimating) return;
    isAnimating = true;

    const angle = Math.PI / 2 * direction;  // 90도 회전
    const rotationMatrix = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(...axis), angle);

    // 회전할 블록들을 그룹화
    const cubesToRotate = cubes.filter(cube => {
        return Math.round(cube.userData.originalPosition[layer]) === Math.round(selectedFace.object.position[layer]);
    });

    // 그룹 생성
    const group = new THREE.Group();
    cubesToRotate.forEach(cube => group.add(cube));
    scene.add(group);

    const animationDuration = 300; // milliseconds
    const startTime = performance.now();

    function animate(time) {
        const elapsedTime = time - startTime;
        const progress = Math.min(elapsedTime / animationDuration, 1);
        const currentAngle = angle * progress;

        // 그룹 회전
        group.rotation[axis[0] === 1 ? 'x' : axis[1] === 1 ? 'y' : 'z'] = currentAngle;

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            // 최종 회전 및 위치 조정
            group.rotation[axis[0] === 1 ? 'x' : axis[1] === 1 ? 'y' : 'z'] = angle;
            group.updateMatrixWorld(true);

            // 그룹에서 큐브를 씬으로 옮기기 전, 각 큐브의 최종 회전 및 위치 설정
            while (group.children.length > 0) {
                const cube = group.children[0];
                
                // 그룹의 변환을 적용하여 최종 위치와 회전을 큐브에 설정
                cube.applyMatrix4(group.matrixWorld);
                
                // 정확한 회전을 위해 행렬을 다시 설정
                cube.rotation.setFromRotationMatrix(cube.matrix);

                // 원래 위치 정보 업데이트
                cube.userData.originalPosition.copy(cube.position);

                // 큐브를 그룹에서 제거하고 씬으로 다시 추가
                group.remove(cube);
                scene.attach(cube);
            }

            scene.remove(group); // 빈 그룹을 씬에서 제거
            isAnimating = false;
        }

        renderer.render(scene, camera);
    }

    requestAnimationFrame(animate);
}

function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(cubes);

    if (intersects.length > 0) {
        selectedFace = intersects[0];
        rotationIcon.style.display = 'block';
        rotationIcon.style.left = `${event.clientX}px`;
        rotationIcon.style.top = `${event.clientY}px`;
    } else {
        selectedFace = null;
        rotationIcon.style.display = 'none';
    }
}

function onMouseClick(event) {
    if (selectedFace && !isAnimating) {
        const normal = selectedFace.face.normal.clone();
        normal.transformDirection(selectedFace.object.matrixWorld);
        
        let axis, layer, direction;
        if (Math.abs(normal.x) > 0.9) {
            axis = [1, 0, 0];
            layer = 'x';
            direction = normal.x > 0 ? 1 : -1;
        } else if (Math.abs(normal.y) > 0.9) {
            axis = [0, 1, 0];
            layer = 'y';
            direction = normal.y > 0 ? 1 : -1;
        } else if (Math.abs(normal.z) > 0.9) {
            axis = [0, 0, 1];
            layer = 'z';
            direction = normal.z > 0 ? 1 : -1;
        }

        if (axis) {
            rotateFace(axis, layer, direction);
        }
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

init();