import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RGBShiftShader } from 'three/addons/shaders/RGBShiftShader.js';
import { FilmPass } from 'three/addons/postprocessing/FilmPass.js';

export function createQuantumParticles(container) {
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
    const renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputEncoding = THREE.sRGBEncoding;
    container.appendChild(renderer.domElement);

    // 4. Post-Processing Pipeline
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(container.clientWidth, container.clientHeight),
        1.5, 0.6, 0.9
    );
    bloomPass.threshold = 0.1;
    bloomPass.strength = 1.8;
    bloomPass.radius = 0.8;
    composer.addPass(bloomPass);

    const rgbShiftPass = new ShaderPass(RGBShiftShader);
    rgbShiftPass.uniforms['amount'].value = 0.0025;
    composer.addPass(rgbShiftPass);

    const filmPass = new FilmPass(0.35, 0.5, 2048, false);
    composer.addPass(filmPass);

    // 5. Quantum Particle System
    const PARTICLE_COUNT = 15000;
    const particlesGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);

    const colorPalette = [
        new THREE.Color(0x00f7ff), // Neon blue
        new THREE.Color(0xff00f7), // Neon pink
        new THREE.Color(0x8a2be2), // Blue violet
        new THREE.Color(0x00ff88), // Electric green
        new THREE.Color(0xff7700)  // Orange
    ];

    // Initialize particles in spherical distribution
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const radius = 15 * Math.pow(Math.random(), 0.5);
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        
        positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = radius * Math.cos(phi);
        
        const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
        
        sizes[i] = 0.02 + Math.random() * 0.08;
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particlesGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const particlesMaterial = new THREE.PointsMaterial({
        size: 0.05,
        vertexColors: true,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const particleSystem = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particleSystem);

    // 6. Animation System
    const clock = new THREE.Clock();
    let time = 0;
    const speedFactors = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        speedFactors[i] = 0.2 + Math.random() * 0.8;
    }

    function animate() {
        requestAnimationFrame(animate);
        
        const delta = clock.getDelta();
        time += delta * 0.5;
        
        const positions = particleSystem.geometry.attributes.position.array;
        
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const i3 = i * 3;
            const speed = speedFactors[i];
            const angle = time * speed;
            
            positions[i3] = positions[i3] * Math.cos(angle * 0.01) - positions[i3 + 2] * Math.sin(angle * 0.01);
            positions[i3 + 1] = positions[i3 + 1] * Math.cos(angle * 0.015) - positions[i3] * Math.sin(angle * 0.015);
            positions[i3 + 2] = positions[i3 + 2] * Math.cos(angle * 0.02) - positions[i3 + 1] * Math.sin(angle * 0.02);
            
            const pulse = Math.sin(time * speed * 2) * 0.2 + 1;
            positions[i3] *= pulse;
            positions[i3 + 1] *= pulse;
            positions[i3 + 2] *= pulse;
        }
        
        particleSystem.geometry.attributes.position.needsUpdate = true;
        particleSystem.rotation.y = time * 0.05;
        composer.render();
    }

    // 7. Window Resize Handler
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

    // Cleanup function
    return () => {
        window.removeEventListener('resize', handleResize);
        container.removeChild(renderer.domElement);
    };
}