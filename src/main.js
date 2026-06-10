
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

console.log("Iniciando Escena de Soldadura 3D...");

// 1. VERIFICACIÓN DEL CANVAS
const canvas = document.querySelector('#lienzo3d');
if (!canvas) {
    console.error("ERROR: No se encontró el elemento #lienzo3d en tu HTML");
}
const scene = new THREE.Scene();
// Cambia el color para que sea exactamente igual al fondo de la web
scene.background = new THREE.Color(0x00163a);
// 1. ELIMINA O COMENTA EL FONDO (para que sea transparente y se vea tu azul #00163A del CSS)
// scene.background = new THREE.Color(0x12141c); 

// 2. BUSCAMOS EL CONTENEDOR 3D PARA MEDIRLO
const contenedor3D = document.querySelector('#contenedor-3d');
let width = contenedor3D.clientWidth;
let height = contenedor3D.clientHeight;

const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
const esMovil = window.innerWidth < 768;
camera.position.set(0, 2, esMovil ? 20 : 12); 
camera.lookAt(0, 0, 0);

// 3. ACTIVAMOS ALPHA (Transparencia) EN EL RENDERER
const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
renderer.setSize(width, height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 5;
controls.maxDistance = 25;
controls.autoRotate = true;
controls.autoRotateSpeed = 1.5;

// Bloom (resplandor para las chispas y el visor)
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.2,   // strength alto para que las chispas brillen mucho
    0.5,   // radius
    0.6    // threshold
);
composer.addPass(bloomPass);

// Seguimiento del mouse
const mouse = new THREE.Vector2(0, 0);
window.addEventListener('mousemove', e => {
    mouse.x = (e.clientX / window.innerWidth  - 0.5) * 2;
    mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
});

// 2. CONSTRUCCIÓN DE LA CARETA DE SOLDADOR
// 2. CONSTRUCCIÓN DE LA CARETA DE SOLDADOR
const grupoCasco = new THREE.Group();
scene.add(grupoCasco);

// Materiales del casco
const matCasco = new THREE.MeshStandardMaterial({ 
    color: 0x1a1a1a, // Negro mate/gris oscuro industrial
    roughness: 0.7, 
    metalness: 0.4,
    side: THREE.DoubleSide
});

// Ángulo de cobertura (243 grados) y cálculo para centrar el hueco en la nuca
const aperturaAngulo = Math.PI * 1.35; 
const rotacionCentrada = -aperturaAngulo / 2;

// --- Cuerpo principal (Escudo curvo) ---
// Se crea desde 0 y se rota la malla completa para evitar glitches
const geoCuerpo = new THREE.CylinderGeometry(2.5, 2.5, 5, 32, 1, true, 0, aperturaAngulo);
const meshCuerpo = new THREE.Mesh(geoCuerpo, matCasco);
meshCuerpo.rotation.y = rotacionCentrada; 
grupoCasco.add(meshCuerpo);

// --- Tapa superior ---
// --- Tapa superior ---
const geoTapa = new THREE.SphereGeometry(2.5, 32, 16, 0, aperturaAngulo, 0, Math.PI / 2);
const meshTapa = new THREE.Mesh(geoTapa, matCasco);
meshTapa.position.y = 2.5;
meshTapa.scale.set(1, 0.4, 1); // Aplastar la esfera

// Restamos Math.PI / 2 (90 grados) para compensar la diferencia de ejes en Three.js
meshTapa.rotation.y = rotacionCentrada - Math.PI / -0.4; 

grupoCasco.add(meshTapa);

// --- Marco del Visor ---
const matMarco = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.9 });
const geoMarco = new THREE.BoxGeometry(3.0, 1.6, 0.4);
const meshMarco = new THREE.Mesh(geoMarco, matMarco);
meshMarco.position.set(0, 0.8, 2.45);
grupoCasco.add(meshMarco);

// --- Cristal del Visor ---
const matCristal = new THREE.MeshStandardMaterial({ 
    color: 0x0a1a0a, 
    roughness: 0.1, 
    metalness: 0.9,
    emissive: 0x00ff00, 
    emissiveIntensity: 0.15 
});
const geoCristal = new THREE.BoxGeometry(2.6, 1.1, 0.5);
const meshCristal = new THREE.Mesh(geoCristal, matCristal);
meshCristal.position.set(0, 0.8, 2.5);
grupoCasco.add(meshCristal);

// Inclinación hacia abajo (postura de trabajo)
grupoCasco.rotation.x = 0.15;
// Un toque extra: inclinamos el casco ligeramente hacia abajo, simulando la postura al soldar
grupoCasco.rotation.x = 0.15;
// 3. SISTEMA DE CHISPAS DE SOLDADURA
const PART_COUNT = 300;
const partGeo = new THREE.BufferGeometry();
const posArr = new Float32Array(PART_COUNT * 3);
const colArr = new Float32Array(PART_COUNT * 3);
const velArr = new Float32Array(PART_COUNT * 3);
const lifeArr = new Float32Array(PART_COUNT); // Tiempo de vida de cada chispa

const coloresSparks = [
    new THREE.Color(0xffaa00), // Naranja
    new THREE.Color(0xffff00), // Amarillo
    new THREE.Color(0xffffff), // Blanco incandescente
    new THREE.Color(0xff6600)  // Naranja oscuro
];

for (let i = 0; i < PART_COUNT; i++) {
    // Esconder partículas inicialmente
    posArr[i*3] = 0; posArr[i*3+1] = -10; posArr[i*3+2] = 0;
    velArr[i*3] = 0; velArr[i*3+1] = 0; velArr[i*3+2] = 0;
    
    const c = coloresSparks[Math.floor(Math.random() * coloresSparks.length)];
    colArr[i*3] = c.r; colArr[i*3+1] = c.g; colArr[i*3+2] = c.b;
    lifeArr[i] = Math.random() * 60; 
}

partGeo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
partGeo.setAttribute('color', new THREE.BufferAttribute(colArr, 3));

const chispasMaterial = new THREE.PointsMaterial({
    size: 0.15,
    vertexColors: true,
    transparent: true,
    opacity: 1,
    blending: THREE.AdditiveBlending, // Hace que los colores se sumen y brillen
    depthWrite: false
});
const chispas = new THREE.Points(partGeo, chispasMaterial);
scene.add(chispas);


// 4. ILUMINACIÓN (Luz de ambiente e impacto de soldadura)
const luzAmb = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(luzAmb);

// Luz azul/blanca intermitente simulando el arco de soldadura
const luzArco = new THREE.PointLight(0xaaddff, 0, 15);
luzArco.position.set(0, -1.5, 3); // Posicionada debajo y frente al casco
scene.add(luzArco);

const luzRelleno = new THREE.DirectionalLight(0xffffff, 1);
luzRelleno.position.set(5, 5, -5);
scene.add(luzRelleno);


// 5. ANIMACIÓN
function animar() {
    requestAnimationFrame(animar);

    // --- Física de las chispas ---
    const pos = partGeo.attributes.position.array;
    for (let i = 0; i < PART_COUNT; i++) {
        lifeArr[i] -= 1;

        if (lifeArr[i] <= 0) {
            // Reiniciar chispa en el punto de soldadura (debajo del casco)
            pos[i*3]   = (Math.random() - 0.5) * 1.5;      // X
            pos[i*3+1] = -1.5 + (Math.random() - 0.5) * 0.5; // Y
            pos[i*3+2] = 2.5 + (Math.random() * 0.5);      // Z

            // Darles una velocidad explosiva hacia adelante y abajo
            velArr[i*3]   = (Math.random() - 0.5) * 0.15;
            velArr[i*3+1] = (Math.random() - 0.2) * 0.15; // Salto ligero y luego caída
            velArr[i*3+2] = (Math.random()) * 0.15 + 0.05;

            lifeArr[i] = 30 + Math.random() * 40; // Nueva vida
        } else {
            // Aplicar velocidad y gravedad
            pos[i*3]   += velArr[i*3];
            pos[i*3+1] += velArr[i*3+1];
            pos[i*3+2] += velArr[i*3+2];
            
            velArr[i*3+1] -= 0.008; // Gravedad tirando hacia abajo
        }
    }
    partGeo.attributes.position.needsUpdate = true;

    // --- Parpadeo del Arco de Soldadura ---
    // Genera destellos aleatorios muy brillantes
    if (Math.random() > 0.4) {
        luzArco.intensity = 50 + Math.random() * 150;
    } else {
        luzArco.intensity = 0;
    }

    // Reacción al mouse: rotar suavemente el casco hacia el cursor
    grupoCasco.rotation.x += (mouse.y * 0.2 - grupoCasco.rotation.x) * 0.05;
    grupoCasco.rotation.y += (mouse.x * 0.2 - grupoCasco.rotation.y) * 0.05;

    controls.update();
    composer.render();
}
animar();

window.addEventListener('resize', () => {
    // Medimos el div nuevamente por si el usuario cambió el tamaño de la ventana
    let newWidth = contenedor3D.clientWidth;
    let newHeight = contenedor3D.clientHeight;

    camera.aspect = newWidth / newHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(newWidth, newHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    composer.setSize(newWidth, newHeight);

    if (window.innerWidth < 768) {
        camera.position.z = 20; 
    } else {
        camera.position.z = 12; 
    }
});

// ==========================================
// CONFIGURACIÓN DE LA API DE GOOGLE MAPS
// ==========================================

