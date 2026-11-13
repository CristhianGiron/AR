import * as THREE from "three";
import { $ } from "../ui/dom.js";

export function createEngine(app) {
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(46, 1, 0.1, 100),
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });

  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

  $("stage").appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x49617d, 2.6));

  const sun = new THREE.DirectionalLight(0xffffff, 2);

  sun.position.set(4, 7, 5);

  scene.add(sun);

  const grid = new THREE.GridHelper(12, 24, 0x7773b8, 0x39395f);

  grid.material.transparent = true;

  grid.material.opacity = 0.26;

  grid.visible = false;
  scene.add(grid);

  const canvas = renderer.domElement;
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-describedby", "scene-text-alternative");

  return { scene, camera, renderer, canvas, grid };
}
