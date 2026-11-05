import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);

/**
 * Tô màu đỉnh (vertex color) và dời hình.
 * Mọi phần ghép khi merge phải có cùng thuộc tính color.
 */
export function part(
  geo: THREE.BufferGeometry,
  hex: number,
  pos: [number, number, number] = [0, 0, 0],
  rotX = 0,
  rotY = 0,
  rotZ = 0,
): THREE.BufferGeometry {
  if (rotX) geo.rotateX(rotX);
  if (rotY) geo.rotateY(rotY);
  if (rotZ) geo.rotateZ(rotZ);
  geo.translate(pos[0], pos[1], pos[2]);

  const c = new THREE.Color(hex);
  const n = geo.getAttribute('position').count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

export function merge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const g = mergeGeometries(parts);
  if (!g) throw new Error('Không ghép được hình khối buffer geometry');
  return g;
}

export const lambertMat = (color: number) => new THREE.MeshLambertMaterial({ color });
export const basicMat = (color: number) => new THREE.MeshBasicMaterial({ color });

