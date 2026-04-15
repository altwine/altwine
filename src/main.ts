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
	TextureLoader,
	Color,
	ShaderMaterial,
} from "three";

import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { getReposList } from "./repos";

let renderer: WebGLRenderer;

const canvasContainer = document.getElementById("canvas-container")!;
const scrollContent = document.getElementById("virtual-scroll-content")!;
const projGrid = document.getElementById("projects-grid")!;

const holeStartY = 16.25;

const scene = new Scene();
const camera = new PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);

renderer = new WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
canvasContainer.appendChild(renderer.domElement);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(new Vector2(window.innerWidth / 1.5, window.innerHeight / 1.5), 0.025, 0.5, 0.75);
composer.addPass(bloomPass);

function createSoftGlowTexture() {
	const c = document.createElement("canvas");
	c.width = 128;
	c.height = 128;
	const ctx = c.getContext("2d")!;
	const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
	g.addColorStop(0, "rgba(255,255,255,1)");
	g.addColorStop(0.4, "rgba(255,255,255,0.4)");
	g.addColorStop(1, "rgba(255,255,255,0)");
	ctx.fillStyle = g;
	ctx.fillRect(0, 0, 128, 128);
	return new TextureLoader().load(c.toDataURL());
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
		vertexShader: `attribute float size; attribute vec3 color; attribute float aRandom; varying vec3 vColor; varying float vAlpha; uniform float uTime;
			void main() { vColor=color; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_Position=projectionMatrix*mv; gl_PointSize=size*(300.0/-mv.z); float t=1.0; if(size>1.5)t=0.7+0.3*sin(uTime*3.0+aRandom*20.0); vAlpha=t; }`,
		fragmentShader: `uniform sampler2D pointTexture; varying vec3 vColor; varying float vAlpha; void main() { gl_FragColor=vec4(vColor,vAlpha); gl_FragColor*=texture2D(pointTexture,gl_PointCoord); }`,
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
		uniforms: { uTime: { value: 0 }, pointTexture: { value: softGlowTexture } },
		vertexShader: `attribute float size; attribute vec3 color; attribute float aRandom; varying vec3 vColor; varying float vAlpha; uniform float uTime;
			void main() { vColor=color; float angle=uTime*(0.2*${speed.toFixed(1)}+aRandom*0.05); float x=position.x*cos(angle)-position.z*sin(angle); float z=position.x*sin(angle)+position.z*cos(angle); vec4 mv=modelViewMatrix*vec4(x,position.y,z,1.0); gl_Position=projectionMatrix*mv; gl_PointSize=size*(300.0/-mv.z); vAlpha=0.4+0.6*sin(uTime*3.0+aRandom*10.0); }`,
		fragmentShader: `uniform sampler2D pointTexture; varying vec3 vColor; varying float vAlpha; void main() { gl_FragColor=vec4(vColor,vAlpha); gl_FragColor*=texture2D(pointTexture,gl_PointCoord); }`,
		transparent: true,
		depthWrite: false,
		blending: AdditiveBlending,
	});
	return new Points(geo, mat);
}

document.addEventListener("DOMContentLoaded", async () => {
	canvasContainer.style.opacity = "0";
	canvasContainer.style.transition = "opacity 1.5s ease-in-out";
	setTimeout(() => {
		canvasContainer.style.opacity = "1";
	}, 300);

	const group = new Group();
	scene.add(group);
	group.position.y = holeStartY;
	group.rotation.x = 0.35;
	group.rotation.z = 0.15;
	group.add(new Mesh(new SphereGeometry(0.85, 16, 16), new MeshBasicMaterial({ color: 0x000000 })));

	const diskInner = createDisk(1.2, 2.8, 8800, new Color(0xffeebb), new Color(0xff5500), 2.75);
	const diskOuter = createDisk(2.5, 4.5, 8500, new Color(0xff5500), new Color(0x550000), 0.75);
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

	let scrollY = 0;
	let currentScrollY = 0;

	const maxScroll = window.innerHeight * 1.5;

	let mouseX = 0;
	let mouseY = 0;
	const baseRotX = 0.35;
	const baseRotZ = 0.15;
	const sensitivity = 0.08;

	document.addEventListener("mousemove", (event) => {
		mouseX = (event.clientX / window.innerWidth) * 2 - 1;
		mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
	});

	window.addEventListener(
		"wheel",
		(e) => {
			scrollY += Math.floor(e.deltaY / 1);
			scrollY = Math.max(0, Math.min(scrollY, maxScroll));
		},
		{ passive: true },
	);

	let touchStartY = 0;
	window.addEventListener(
		"touchstart",
		(e) => {
			touchStartY = e.touches[0].clientY;
		},
		{ passive: true },
	);
	window.addEventListener(
		"touchmove",
		(e) => {
			const touchY = e.touches[0].clientY;
			const delta = touchStartY - touchY;
			scrollY += delta * 1.5;
			scrollY = Math.max(0, Math.min(scrollY, maxScroll));
			touchStartY = touchY;
		},
		{ passive: true },
	);

	const hint = document.querySelector(".scroll-hint");

	function animate() {
		requestAnimationFrame(animate);
		const time = performance.now() * 0.001;

		diskInner.material.uniforms.uTime.value = time;
		diskOuter.material.uniforms.uTime.value = time;
		starMesh.material.uniforms.uTime.value = time;

		currentScrollY += (scrollY - currentScrollY) * 0.05;

		scrollContent.style.transform = `translate3d(0, -${Math.max(currentScrollY, 0.01)}px, 0)`;

		const scrollPercent = Math.min(currentScrollY / maxScroll, 1);

		const endY = 15.4;
		const startY = -25;

		const easedScroll = Math.pow(scrollPercent, 0.6);

		camera.position.y = startY + (endY - startY) * easedScroll;

		if (hint && currentScrollY > 100) hint.classList.add("hidden");

		const targetX = baseRotX + mouseY * sensitivity;
		const targetZ = baseRotZ + mouseX * sensitivity;

		group.rotation.x += (targetX - group.rotation.x) * 0.1;
		group.rotation.z += (targetZ - group.rotation.z) * 0.1;

		starMesh.rotation.y += 0.00005;
		composer.render();
	}
	animate();

	window.addEventListener("resize", () => {
		camera.aspect = window.innerWidth / window.innerHeight;
		updateCameraForScreenSize();
	});
	updateCameraForScreenSize();

	const repos = await getReposList();
	for (const repo of repos) {
		projGrid.innerHTML += `
		<div class="project-card">
			<h3>${repo.name}</h3>
			<p>${repo.description ?? ""}</p>
			<a href="${repo.html_url}" class="link">Посмотреть →</a>
		</div>
		`;
	}
});
