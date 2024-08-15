document.addEventListener('DOMContentLoaded', () => {
    // CubeState class to represent and manage cube's state
    class CubeState {
        constructor() {
            this.faces = {
                'U': Array(9).fill(0xffffff), // White
                'D': Array(9).fill(0xffff00), // Yellow
                'L': Array(9).fill(0x00ff00), // Green
                'R': Array(9).fill(0x0000ff), // Blue
                'F': Array(9).fill(0xff0000), // Red
                'B': Array(9).fill(0xff8000), // Orange
            };
        }

        toString() {
            return `U: ${this.faces['U']}\nD: ${this.faces['D']}\nL: ${this.faces['L']}\nR: ${this.faces['R']}\nF: ${this.faces['F']}\nB: ${this.faces['B']}`;
        }

        getFaceColors(faceName) {
            return this.faces[faceName] || [];
        }

        updateFaceColors(faceName, colors) {
            if (this.faces[faceName]) {
                this.faces[faceName] = colors;
            }
        }
    }

    // Variables
    let scene, camera, renderer, controls;
    let cubes = [];
    const size = 0.9;
    const gap = 0.1;
    const cubeSize = size + gap;
    let isAnimating = false;
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let selectedFace = null;

    // Face colors for each cube
    const faceColors = [
        0xff0000, // Red (Right)
        0xff8000, // Orange (Left)
        0xffff00, // Yellow (Up)
        0xffffff, // White (Down)
        0x00ff00, // Green (Front)
        0x0000ff  // Blue (Back)
    ];

    // Initialize the scene
    function initScene() {
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

    // Create a Rubik's cube
    function createRubiksCube() {
        for (let x = -1; x <= 1; x++) {
            for (let y = -1; y <= 1; y++) {
                for (let z = -1; z <= 1; z++) {
                    const geometry = new THREE.BoxGeometry(size, size, size);
                    const materials = [
                        new THREE.MeshBasicMaterial({ color: x === 1 ? faceColors[0] : 0x282828 }),
                        new THREE.MeshBasicMaterial({ color: x === -1 ? faceColors[1] : 0x282828 }),
                        new THREE.MeshBasicMaterial({ color: y === 1 ? faceColors[2] : 0x282828 }),
                        new THREE.MeshBasicMaterial({ color: y === -1 ? faceColors[3] : 0x282828 }),
                        new THREE.MeshBasicMaterial({ color: z === 1 ? faceColors[4] : 0x282828 }),
                        new THREE.MeshBasicMaterial({ color: z === -1 ? faceColors[5] : 0x282828 }),
                    ];

                    const cube = new THREE.Mesh(geometry, materials);
                    cube.position.set(x * cubeSize, y * cubeSize, z * cubeSize);
                    cube.userData.originalPosition = cube.position.clone();
                    scene.add(cube);
                    cubes.push(cube);
                }
            }
        }
    }

    // Rotate a face of the cube
    function rotateFace(axis, layer, direction) {
        if (isAnimating) return;
        isAnimating = true;

        const angle = Math.PI / 2 * direction;  // 90 degrees rotation
        const rotationMatrix = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(...axis), angle);

        const cubesToRotate = cubes.filter(cube => {
            return Math.round(cube.userData.originalPosition[layer]) === Math.round(selectedFace.object.position[layer]);
        });

        const group = new THREE.Group();
        cubesToRotate.forEach(cube => group.add(cube));
        scene.add(group);

        const animationDuration = 300; // milliseconds
        const startTime = performance.now();

        function animate(time) {
            const elapsedTime = time - startTime;
            const progress = Math.min(elapsedTime / animationDuration, 1);
            const currentAngle = angle * progress;

            group.rotation[axis[0] === 1 ? 'x' : axis[1] === 1 ? 'y' : 'z'] = currentAngle;

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                group.rotation[axis[0] === 1 ? 'x' : axis[1] === 1 ? 'y' : 'z'] = angle;
                group.updateMatrixWorld(true);

                while (group.children.length > 0) {
                    const cube = group.children[0];

                    cube.applyMatrix4(group.matrixWorld);
                    cube.rotation.setFromRotationMatrix(cube.matrix);
                    cube.userData.originalPosition.copy(cube.position);

                    group.remove(cube);
                    scene.attach(cube);
                }

                scene.remove(group);
                isAnimating = false;
            }

            renderer.render(scene, camera);
        }

        requestAnimationFrame(animate);
    }

    // Mouse move event handler
    function onMouseMove(event) {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(cubes);

        if (intersects.length > 0) {
            selectedFace = intersects[0];
        } else {
            selectedFace = null;
        }
    }

    // Mouse click event handler
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

    // Window resize event handler
    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }

    // Solve cube algorithm
    function solveCube(cubeState) {
        // Placeholder for the cube solving logic
        const moves = [
            { axis: 'x', layer: 1, direction: 1 },
            { axis: 'y', layer: 1, direction: -1 },
            { axis: 'z', layer: 1, direction: 1 }
        ];

        let solution = '';

        moves.forEach(move => {
            rotateFace([1, 0, 0], move.layer, move.direction);
            solution += `Rotate ${move.axis} layer ${move.layer} ${move.direction === 1 ? 'clockwise' : 'counterclockwise'}\n`;
        });

        document.getElementById('solutionOutput').innerText = solution;
    }

    // Initialize the scene
    initScene();

    // Solution button click event
    document.getElementById('solutionButton').addEventListener('click', () => {
        const cubeState = getCurrentCubeState();
        updateCubeState(cubeState);
        solveCube(cubeState);
    });

    // Get current cube state
    function getCurrentCubeState() {
        const cubeState = new CubeState();
        // This is a placeholder logic for obtaining the current state of the cube
        return cubeState;
    }

    // Update the cube state with the colors from the screen
    function updateCubeState(cubeState) {
        ['U', 'D', 'L', 'R', 'F', 'B'].forEach(face => {
            const colors = getFaceColorsFromScreen(face);
            cubeState.updateFaceColors(face, colors);
        });
    }

    // Placeholder function for getting face colors from the screen
    function getFaceColorsFromScreen(faceName) {
        // This function would normally use raycasting and intersections to determine the face colors.
        // Placeholder logic for demonstration purposes.
        return Array(9).fill(0xffffff);
    }
});