import {
	Scene,
	PerspectiveCamera,
	WebGLRenderer,
	Group,
	SphereGeometry,
	MeshBasicMaterial,
	Mesh,
	BufferGeometry,
	Float32BufferAttribute,
	Points,
	Vector2,
	AdditiveBlending,
	MathUtils,
	Color,
	ShaderMaterial,
	CanvasTexture,
	LinearFilter,
	ClampToEdgeWrapping,
} from "three";

import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

import starVert from "../assets/shaders/star.vert";
import starFrag from "../assets/shaders/star.frag";
import diskVert from "../assets/shaders/disk.vert";
import diskFrag from "../assets/shaders/disk.frag";

const canvas = document.querySelector("canvas") as HTMLCanvasElement;

const scene = new Scene();
const camera = new PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);

let renderer = new WebGLRenderer({
	canvas: canvas,
	antialias: false,
	powerPreference: "high-performance",
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(new Vector2(window.innerWidth / 2.5, window.innerHeight / 2.5), 0.025, 0.5, 0.75);
composer.addPass(bloomPass);

function createSoftGlowTexture() {
	const size = 128;
	const canvas = document.createElement("canvas");
	canvas.width = size;
	canvas.height = size;

	const ctx = canvas.getContext("2d");
	if (!ctx) return null;

	const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
	gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
	gradient.addColorStop(0.4, "rgba(255, 255, 255, 0.4)");
	gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

	ctx.fillStyle = gradient;
	ctx.fillRect(0, 0, size, size);

	const texture = new CanvasTexture(canvas);

	texture.minFilter = LinearFilter;
	texture.magFilter = LinearFilter;

	texture.wrapS = texture.wrapT = ClampToEdgeWrapping;

	return texture;
}

const softGlowTexture = createSoftGlowTexture();

function createStars(count: number) {
	const geo = new BufferGeometry();
	const pos = new Float32Array(count * 3),
		col = new Float32Array(count * 3),
		siz = new Float32Array(count),
		rnd = new Float32Array(count);
	const cols = [new Color(0xaaccff), new Color(0xffffff), new Color(0xffcc88)];
	for (let i = 0; i < count; i++) {
		pos[i * 3] = (Math.random() - 0.5) * 500;
		pos[i * 3 + 1] = (Math.random() - 0.5) * 500;
		pos[i * 3 + 2] = (Math.random() - 0.5) * 500;
		const bc = cols[Math.floor(Math.random() * cols.length)];
		col[i * 3] = bc.r;
		col[i * 3 + 1] = bc.g;
		col[i * 3 + 2] = bc.b;
		siz[i] = Math.random() > 0.95 ? Math.random() * 2 + 2 : Math.random() * 0.8 + 0.2;
		rnd[i] = Math.random();
	}
	geo.setAttribute("position", new Float32BufferAttribute(pos, 3));
	geo.setAttribute("color", new Float32BufferAttribute(col, 3));
	geo.setAttribute("size", new Float32BufferAttribute(siz, 1));
	geo.setAttribute("aRandom", new Float32BufferAttribute(rnd, 1));
	const mat = new ShaderMaterial({
		uniforms: { uTime: { value: 0 }, pointTexture: { value: softGlowTexture } },
		vertexShader: starVert,
		fragmentShader: starFrag,
		transparent: true,
		depthWrite: false,
		blending: AdditiveBlending,
	});
	return new Points(geo, mat);
}

function createDisk(innerR: number, outerR: number, count: number, cIn: Color, cOut: Color, speed: number) {
	const geo = new BufferGeometry();
	const pos = new Float32Array(count * 3),
		col = new Float32Array(count * 3),
		siz = new Float32Array(count),
		rnd = new Float32Array(count);
	for (let i = 0; i < count; i++) {
		const a = Math.random() * Math.PI * 2;
		const r = innerR + Math.pow(Math.random(), 0.8) * (outerR - innerR);
		pos[i * 3] = Math.cos(a) * r;
		pos[i * 3 + 1] = (Math.random() - 0.5) * 0.3 * (r / innerR);
		pos[i * 3 + 2] = Math.sin(a) * r;
		const mc = cIn.clone().lerp(cOut, (r - innerR) / (outerR - innerR));
		col[i * 3] = mc.r;
		col[i * 3 + 1] = mc.g;
		col[i * 3 + 2] = mc.b;
		siz[i] = Math.random() * 1.5 + 0.5;
		rnd[i] = Math.random();
	}
	geo.setAttribute("position", new Float32BufferAttribute(pos, 3));
	geo.setAttribute("color", new Float32BufferAttribute(col, 3));
	geo.setAttribute("size", new Float32BufferAttribute(siz, 1));
	geo.setAttribute("aRandom", new Float32BufferAttribute(rnd, 1));
	const mat = new ShaderMaterial({
		uniforms: {
			uTime: { value: 0 },
			pointTexture: { value: softGlowTexture },
			uSpeed: { value: speed.toFixed(1) },
		},
		vertexShader: diskVert,
		fragmentShader: diskFrag,
		transparent: true,
		depthWrite: false,
		blending: AdditiveBlending,
	});
	return new Points(geo, mat);
}

const group = new Group();
scene.add(group);
group.rotation.x = 0.35;
group.rotation.z = 0.15;
group.position.y = 1;
group.add(new Mesh(new SphereGeometry(0.85, 16, 16), new MeshBasicMaterial({ color: 0x000000 })));

const diskInner = createDisk(1.2, 2.8, 9000, new Color(0xffeebb), new Color(0xff5500), 2.75);
const diskOuter = createDisk(2.5, 4.5, 9000, new Color(0xff5500), new Color(0x550000), 0.75);
group.add(diskInner, diskOuter);

const starMesh = createStars(15500);
scene.add(starMesh);

function updateCameraForScreenSize() {
	const aspect = window.innerWidth / window.innerHeight;
	const fovRad = MathUtils.degToRad(camera.fov);
	const visW = 2 * Math.tan(fovRad / 2) * aspect;
	const targetZ = 14.0 / 0.95 / visW;
	camera.position.z = Math.max(targetZ, 8);
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
	composer.setSize(window.innerWidth, window.innerHeight);
}

let mouseX = 0;
let mouseY = 0;
const baseRotX = 0.35;
const baseRotZ = 0.15;
const sensitivity = 0.04;

document.addEventListener("mousemove", (event) => {
	mouseX = (event.clientX / window.innerWidth) * 2 - 1;
	mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
});

function animate() {
	requestAnimationFrame(animate);
	const time = performance.now() * 0.001;

	diskInner.material.uniforms.uTime.value = time;
	diskOuter.material.uniforms.uTime.value = time;
	starMesh.material.uniforms.uTime.value = time;

	const targetX = baseRotX + mouseY * sensitivity;
	const targetZ = baseRotZ + mouseX * sensitivity;

	group.rotation.x += (targetX - group.rotation.x) * 0.1;
	group.rotation.z += (targetZ - group.rotation.z) * 0.1;

	starMesh.rotation.x += (targetX * 0.4 - starMesh.rotation.x) * 0.05;
	starMesh.rotation.z += (targetZ * 0.4 - starMesh.rotation.z) * 0.05;

	starMesh.rotation.y += 0.00005;

	composer.render();
}

animate();

const menuButton = document.getElementById("menu-btn") as HTMLAnchorElement;
const navButtons = document.querySelectorAll(".nav-btn:not(:last-of-type)") as NodeListOf<HTMLAnchorElement>;
let visible = false;

menuButton.addEventListener("click", () => {
	visible = !visible;
	navButtons.forEach((e) => ((e.style.display as any) = visible ? "flex" : null));
});

window.addEventListener("resize", () => {
	camera.aspect = window.innerWidth / window.innerHeight;
	updateCameraForScreenSize();
});

window.addEventListener("orientationchange", () => {
	camera.aspect = window.innerWidth / window.innerHeight;
	updateCameraForScreenSize();
});

updateCameraForScreenSize();
