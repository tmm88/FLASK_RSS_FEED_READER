import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RGBShiftShader } from 'three/addons/shaders/RGBShiftShader.js';
import { FilmPass } from 'three/addons/postprocessing/FilmPass.js';

export function createQuantumParticles(container) {
    if (!container || !(container instanceof HTMLElement)) {
        console.error('Invalid container element provided');
        return () => {};
    }

    // 1. Scene Setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.015);

    // 2. Camera Configuration
    const camera = new THREE.PerspectiveCamera(
        75,
        container.clientWidth / container.clientHeight,
        0.1,
        1000
    );
    camera.position.set(0, 0, 20);

    // 3. WebGL Renderer
    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap pixel ratio for performance
        renderer.outputEncoding = THREE.sRGBEncoding;
        container.appendChild(renderer.domElement);
    } catch (error) {
        console.error('Failed to initialize WebGLRenderer:', error);
        return () => {};
    }

    // 4. Post-Processing Pipeline
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(container.clientWidth, container.clientHeight),
        1.2, // Reduced strength for subtler effect
        0.5,
        0.8
    );
    bloomPass.threshold = 0.1;
    bloomPass.strength = 1.5;
    bloomPass.radius = 0.6;
    composer.addPass(bloomPass);

    const rgbShiftPass = new ShaderPass(RGBShiftShader);
    rgbShiftPass.uniforms['amount'].value = 0.002;
    composer.addPass(rgbShiftPass);

    const filmPass = new FilmPass(0.25, 0.4, 2048, false);
    composer.addPass(filmPass);

    // 5. Quantum Particle System
    const PARTICLE_COUNT = 10000; // Reduced for better performance
    const particlesGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);
    const velocities = new Float32Array(PARTICLE_COUNT * 3); // Added for dynamic movement

    const colorPalette = [
        new THREE.Color(0x00f7ff), // Neon blue
        new THREE.Color(0xff00f7), // Neon pink
        new THREE.Color(0x8a2be2), // Blue violet
        new THREE.Color(0x00ff88), // Electric green
        new THREE.Color(0xff7700)  // Orange
    ];

    // Initialize particles
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const radius = 15 * Math.pow(Math.random(), 0.5);
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = radius * Math.cos(phi);

        velocities[i * 3] = (Math.random() - 0.5) * 0.1;
        velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.1;
        velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.1;

        const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;

        sizes[i] = 0.03 + Math.random() * 0.06;
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particlesGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const particlesMaterial = new THREE.PointsMaterial({
        size: 0.04,
        vertexColors: true,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const particleSystem = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particleSystem);

    // 6. Mouse Interaction
    const mouse = new THREE.Vector2(0, 0);
    function onMouseMove(event) {
        const rect = container.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }
    window.addEventListener('mousemove', onMouseMove);

    // 7. Animation System
    const clock = new THREE.Clock();
    let isRunning = true;

    function animate() {
        if (!isRunning) return;

        requestAnimationFrame(animate);
        const delta = clock.getDelta();
        const time = clock.getElapsedTime();

        const positions = particleSystem.geometry.attributes.position.array;
        const sizes = particleSystem.geometry.attributes.size.array;

        // Update particles with velocity and mouse interaction
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const i3 = i * 3;

            // Apply velocities
            positions[i3] += velocities[i3];
            positions[i3 + 1] += velocities[i3 + 1];
            positions[i3 + 2] += velocities[i3 + 2];

            // Mouse influence
            const dx = positions[i3] - mouse.x * 15;
            const dy = positions[i3 + 1] - mouse.y * 15;
            const dz = positions[i3 + 2];
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (distance < 5) {
                velocities[i3] += (Math.random() - 0.5) * 0.02;
                velocities[i3 + 1] += (Math.random() - 0.5) * 0.02;
                velocities[i3 + 2] += (Math.random() - 0.5) * 0.02;
            }

            // Boundary check to keep particles in sphere
            const radius = Math.sqrt(positions[i3] ** 2 + positions[i3 + 1] ** 2 + positions[i3 + 2] ** 2);
            if (radius > 15) {
                const scale = 15 / radius;
                positions[i3] *= scale;
                positions[i3 + 1] *= scale;
                positions[i3 + 2] *= scale;
                velocities[i3] *= -0.5;
                velocities[i3 + 1] *= -0.5;
                velocities[i3 + 2] *= -0.5;
            }

            // Pulsing effect
            sizes[i] = 0.03 + 0.06 * (Math.sin(time * (0.5 + Math.random()) * 2) * 0.5 + 0.5);
        }

        particleSystem.geometry.attributes.position.needsUpdate = true;
        particleSystem.geometry.attributes.size.needsUpdate = true;
        particleSystem.rotation.y = time * 0.03;

        // Dynamic post-processing
        bloomPass.strength = 1.5 + Math.sin(time * 0.5) * 0.2;
        composer.render();
    }

    // 8. Window Resize Handler
    function handleResize() {
        const width = container.clientWidth;
        const height = container.clientHeight;

        camera.aspect = width / height;
        camera.updateProjectionMatrix();

        renderer.setSize(width, height);
        composer.setSize(width, height);
    }

    window.addEventListener('resize', handleResize);
    animate();

    // 9. Cleanup Function
    return () => {
        isRunning = false;
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('mousemove', onMouseMove);
        scene.traverse(object => {
            if (object.geometry) object.geometry.dispose();
            if (object.material) object.material.dispose();
        });
        renderer.dispose();
        if (container.contains(renderer.domElement)) {
            container.removeChild(renderer.domElement);
        }
    };
}