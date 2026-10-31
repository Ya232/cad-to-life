"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

export function StlViewer({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#eef3f8");
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 10000);
    camera.position.set(1, 1, 1);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const ambient = new THREE.HemisphereLight("#ffffff", "#94a3b8", 2.4);
    scene.add(ambient);
    const keyLight = new THREE.DirectionalLight("#ffffff", 2.8);
    keyLight.position.set(4, 6, 8);
    scene.add(keyLight);

    const grid = new THREE.GridHelper(180, 18, "#cbd5e1", "#dbe4ee");
    grid.position.y = -0.02;
    scene.add(grid);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 0.2;
    controls.maxDistance = 1000;

    let mesh: THREE.Mesh | null = null;
    let disposed = false;
    const loader = new STLLoader();
    loader.load(
      url,
      (geometry) => {
        if (disposed) {
          geometry.dispose();
          return;
        }
        geometry.computeVertexNormals();
        geometry.center();
        geometry.computeBoundingSphere();
        const material = new THREE.MeshStandardMaterial({
          color: "#8acb32",
          metalness: 0.12,
          roughness: 0.65,
        });
        mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);
        const radius = geometry.boundingSphere?.radius ?? 1;
        camera.position.set(radius * 1.8, radius * 1.35, radius * 1.8);
        camera.near = Math.max(radius / 1000, 0.01);
        camera.far = Math.max(radius * 100, 100);
        camera.updateProjectionMatrix();
        controls.target.set(0, 0, 0);
        controls.update();
      },
      undefined,
      () => {
        if (!disposed) container.dataset.error = "true";
      },
    );

    const resizeObserver = new ResizeObserver(() => {
      if (!container.clientWidth || !container.clientHeight) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    });
    resizeObserver.observe(container);

    let frame = 0;
    const render = () => {
      if (disposed) return;
      frame = requestAnimationFrame(render);
      controls.update();
      renderer.render(scene, camera);
    };
    render();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      controls.dispose();
      geometryCleanup(mesh, grid, renderer);
      renderer.domElement.remove();
    };
  }, [url]);

  return <div className="stl-viewer" ref={containerRef} aria-label="3D STL preview" />;
}

function geometryCleanup(
  mesh: THREE.Mesh | null,
  grid: THREE.GridHelper,
  renderer: THREE.WebGLRenderer,
) {
  if (mesh) {
    mesh.geometry.dispose();
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach((material) => material.dispose());
    } else {
      mesh.material.dispose();
    }
  }
  grid.geometry.dispose();
  if (Array.isArray(grid.material)) {
    grid.material.forEach((material) => material.dispose());
  } else {
    grid.material.dispose();
  }
  renderer.dispose();
}
