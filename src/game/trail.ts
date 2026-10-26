/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';

export interface TrailPoint {
  pos: THREE.Vector3;
  width: number;
  alpha: number;
  r: number;
  g: number;
  b: number;
  time: number;
}

export interface TrailConfig {
  maxPoints: number;
  minDistance: number;
  baseWidth: number;
  lifetime: number; // in seconds
}

export function calculateTrailColor(
  speedKmh: number,
  isDashing: boolean,
  isWallRunning: boolean,
  isOvercharged: boolean
): { r: number; g: number; b: number } {
  if (isOvercharged) {
    // Scorching molten gold & plasma amber
    return { r: 1.0, g: 0.78, b: 0.1 };
  }
  if (isDashing) {
    // Explosive chromatic hyper-magenta / hot neon pink
    return { r: 1.0, g: 0.05, b: 0.55 };
  }
  if (isWallRunning) {
    // Electric ultraviolet / violet vector shift
    return { r: 0.65, g: 0.12, b: 1.0 };
  }
  if (speedKmh > 65) {
    // Blinding white-cyan velocity streak
    return { r: 0.5, g: 0.98, b: 1.0 };
  }
  // Standard vibrant neon cyan
  return { r: 0.0, g: 0.9, b: 1.0 };
}

export function calculateTrailWidth(
  baseWidth: number,
  speedKmh: number,
  isDashing: boolean,
  isWallRunning: boolean
): number {
  if (speedKmh < 6 && !isDashing) return 0;
  let mult = Math.max(0.6, Math.min(2.5, speedKmh / 30));
  if (isDashing) mult *= 2.6;
  if (isWallRunning) mult *= 1.6;
  return baseWidth * mult;
}

/**
 * Procedural Neon Ribbon Trail Renderer
 * Generates an animated, fading neon quad-strip following an emitter point (e.g. boots, weapon, or waist).
 */
export class RibbonTrail {
  public mesh: THREE.Mesh;
  private geometry: THREE.BufferGeometry;
  private material: THREE.MeshBasicMaterial;

  private points: TrailPoint[] = [];
  private maxPoints: number;
  private minDistance: number;
  private lifetime: number;
  private baseWidth: number;

  private positions: Float32Array;
  private colors: Float32Array;
  private uvs: Float32Array;
  private indices: Uint16Array;

  private lastAddedPos = new THREE.Vector3(9999, 9999, 9999);

  constructor(scene: THREE.Scene, config: Partial<TrailConfig> = {}) {
    this.maxPoints = config.maxPoints ?? 40;
    this.minDistance = config.minDistance ?? 0.25;
    this.lifetime = config.lifetime ?? 0.4;
    this.baseWidth = config.baseWidth ?? 0.35;

    const numVertices = this.maxPoints * 2;
    const numTriangles = (this.maxPoints - 1) * 2;

    this.positions = new Float32Array(numVertices * 3);
    this.colors = new Float32Array(numVertices * 4); // RGBA
    this.uvs = new Float32Array(numVertices * 2);
    this.indices = new Uint16Array(numTriangles * 3);

    // Initialize indices for continuous quad strip
    let idx = 0;
    for (let i = 0; i < this.maxPoints - 1; i++) {
      const v0 = i * 2;
      const v1 = i * 2 + 1;
      const v2 = (i + 1) * 2;
      const v3 = (i + 1) * 2 + 1;

      this.indices[idx++] = v0;
      this.indices[idx++] = v1;
      this.indices[idx++] = v2;

      this.indices[idx++] = v2;
      this.indices[idx++] = v1;
      this.indices[idx++] = v3;
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 4));
    this.geometry.setAttribute('uv', new THREE.BufferAttribute(this.uvs, 2));
    this.geometry.setIndex(new THREE.BufferAttribute(this.indices, 1));

    // Custom Canvas Texture with glowing soft-edged gradient
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 16;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createLinearGradient(0, 0, 0, 16);
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(0.5, 'rgba(255,255,255,1)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 16);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    this.material = new THREE.MeshBasicMaterial({
      map: texture,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
  }

  public addPoint(
    pos: THREE.Vector3,
    speedKmh: number,
    isDashing: boolean,
    isWallRunning: boolean,
    isOvercharged: boolean
  ) {
    if (speedKmh < 8 && !isDashing) return;

    if (this.points.length > 0) {
      const dist = pos.distanceTo(this.lastAddedPos);
      if (dist < this.minDistance) return;
    }

    const { r, g, b } = calculateTrailColor(speedKmh, isDashing, isWallRunning, isOvercharged);
    const width = calculateTrailWidth(this.baseWidth, speedKmh, isDashing, isWallRunning);

    this.points.unshift({
      pos: pos.clone(),
      width,
      alpha: 1.0,
      r,
      g,
      b,
      time: 0,
    });

    this.lastAddedPos.copy(pos);

    if (this.points.length > this.maxPoints) {
      this.points.pop();
    }
  }

  public update(dt: number, camera: THREE.Camera) {
    // Age and prune points
    for (let i = this.points.length - 1; i >= 0; i--) {
      this.points[i].time += dt;
      this.points[i].alpha = Math.max(0, 1 - this.points[i].time / this.lifetime);
      if (this.points[i].time >= this.lifetime) {
        this.points.splice(i, 1);
      }
    }

    const count = this.points.length;
    if (count < 2) {
      this.geometry.setDrawRange(0, 0);
      return;
    }

    const camPos = camera.position;
    const forward = new THREE.Vector3();
    const toCam = new THREE.Vector3();
    const normal = new THREE.Vector3();

    for (let i = 0; i < count; i++) {
      const p = this.points[i];
      const pNext = this.points[Math.min(i + 1, count - 1)];

      // Direction along trail
      forward.subVectors(p.pos, pNext.pos);
      if (forward.lengthSq() < 0.0001) {
        forward.set(0, 0, 1);
      } else {
        forward.normalize();
      }

      // Camera view direction
      toCam.subVectors(camPos, p.pos).normalize();

      // Normal perpendicular to both trail direction and camera
      normal.crossVectors(forward, toCam).normalize();

      const halfW = p.width * 0.5 * (1 - (p.time / this.lifetime) * 0.4);

      // Left vertex
      const v0Idx = i * 2;
      const lx = p.pos.x - normal.x * halfW;
      const ly = p.pos.y - normal.y * halfW;
      const lz = p.pos.z - normal.z * halfW;

      this.positions[v0Idx * 3] = lx;
      this.positions[v0Idx * 3 + 1] = ly;
      this.positions[v0Idx * 3 + 2] = lz;

      // Right vertex
      const v1Idx = i * 2 + 1;
      const rx = p.pos.x + normal.x * halfW;
      const ry = p.pos.y + normal.y * halfW;
      const rz = p.pos.z + normal.z * halfW;

      this.positions[v1Idx * 3] = rx;
      this.positions[v1Idx * 3 + 1] = ry;
      this.positions[v1Idx * 3 + 2] = rz;

      // Colors with fading alpha
      const a = p.alpha;
      this.colors[v0Idx * 4] = p.r;
      this.colors[v0Idx * 4 + 1] = p.g;
      this.colors[v0Idx * 4 + 2] = p.b;
      this.colors[v0Idx * 4 + 3] = a;

      this.colors[v1Idx * 4] = p.r;
      this.colors[v1Idx * 4 + 1] = p.g;
      this.colors[v1Idx * 4 + 2] = p.b;
      this.colors[v1Idx * 4 + 3] = a;

      // UVs
      const u = i / (this.maxPoints - 1);
      this.uvs[v0Idx * 2] = u;
      this.uvs[v0Idx * 2 + 1] = 0;
      this.uvs[v1Idx * 2] = u;
      this.uvs[v1Idx * 2 + 1] = 1;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.uv.needsUpdate = true;
    this.geometry.setDrawRange(0, (count - 1) * 6);
  }

  public clear() {
    this.points = [];
    this.geometry.setDrawRange(0, 0);
  }

  public dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}

/**
 * Composite Trail Renderer Component for Player
 * Manages twin gravity boot streaks, spine vector streak, and dash afterimage echoes.
 */
export class PlayerTrailSystem {
  private leftBootTrail: RibbonTrail;
  private rightBootTrail: RibbonTrail;
  private spineTrail: RibbonTrail;
  private bladeTrail: RibbonTrail;

  // Afterimage ghost meshes
  private ghostMeshes: { mesh: THREE.Group; life: number; maxLife: number }[] = [];
  private ghostSpawnTimer = 0;
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    // Left & Right Boot Trails (sharp aerodynamic jet ribbons)
    this.leftBootTrail = new RibbonTrail(scene, {
      maxPoints: 50,
      baseWidth: 0.32,
      minDistance: 0.12,
      lifetime: 0.6,
    });
    this.rightBootTrail = new RibbonTrail(scene, {
      maxPoints: 50,
      baseWidth: 0.32,
      minDistance: 0.12,
      lifetime: 0.6,
    });

    // Central Spine Vector Ribbon (broader, energetic trail visualizing momentum shifts)
    this.spineTrail = new RibbonTrail(scene, {
      maxPoints: 60,
      baseWidth: 0.65,
      minDistance: 0.14,
      lifetime: 0.75,
    });

    // Kinetic Blade Arc Trail (swirling light ribbon on melee slashes)
    this.bladeTrail = new RibbonTrail(scene, {
      maxPoints: 40,
      baseWidth: 0.45,
      minDistance: 0.08,
      lifetime: 0.38,
    });
  }

  public update(
    playerPos: THREE.Vector3,
    playerYaw: number,
    speedKmh: number,
    isDashing: boolean,
    isWallRunning: boolean,
    isOvercharged: boolean,
    playerMesh: THREE.Group,
    isSlashing: boolean,
    bladeGroup: THREE.Group,
    dt: number,
    camera: THREE.Camera
  ) {
    // Calculate boot emitter positions in world space
    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), playerYaw);
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), playerYaw);

    const leftBootPos = playerPos.clone().addScaledVector(right, -0.28).add(new THREE.Vector3(0, 0.15, 0));
    const rightBootPos = playerPos.clone().addScaledVector(right, 0.28).add(new THREE.Vector3(0, 0.15, 0));
    const spinePos = playerPos.clone().add(new THREE.Vector3(0, 1.4, 0)).addScaledVector(forward, -0.2);

    this.leftBootTrail.addPoint(leftBootPos, speedKmh, isDashing, isWallRunning, isOvercharged);
    this.rightBootTrail.addPoint(rightBootPos, speedKmh, isDashing, isWallRunning, isOvercharged);
    this.spineTrail.addPoint(spinePos, speedKmh, isDashing, isWallRunning, isOvercharged);

    // Blade tip trail when slashing or dashing
    if (isSlashing || isDashing) {
      const bladeTip = new THREE.Vector3();
      bladeGroup.getWorldPosition(bladeTip);
      const bladeForward = new THREE.Vector3(0, 0, 1.2).applyQuaternion(bladeGroup.quaternion);
      bladeTip.add(bladeForward);
      this.bladeTrail.addPoint(bladeTip, Math.max(speedKmh, 80), true, isWallRunning, isOvercharged);
    }

    this.leftBootTrail.update(dt, camera);
    this.rightBootTrail.update(dt, camera);
    this.spineTrail.update(dt, camera);
    this.bladeTrail.update(dt, camera);

    // Dashing Hologram / Afterimage Echoes
    if (isDashing || speedKmh > 90) {
      this.ghostSpawnTimer += dt;
      if (this.ghostSpawnTimer > 0.05) {
        this.ghostSpawnTimer = 0;
        this.spawnGhost(playerMesh, isOvercharged);
      }
    } else {
      this.ghostSpawnTimer = 0;
    }

    // Update existing ghosts
    for (let i = this.ghostMeshes.length - 1; i >= 0; i--) {
      const g = this.ghostMeshes[i];
      g.life -= dt;
      const progress = g.life / g.maxLife;

      if (g.life <= 0) {
        this.scene.remove(g.mesh);
        this.ghostMeshes.splice(i, 1);
      } else {
        // Fade opacity on all child meshes
        g.mesh.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material) {
            child.material.opacity = progress * 0.45;
          }
        });
      }
    }
  }

  private spawnGhost(playerMesh: THREE.Group, isOvercharged: boolean) {
    if (this.ghostMeshes.length >= 8) return;

    const ghost = playerMesh.clone(true);
    const ghostColor = isOvercharged ? 0xffcc00 : 0x00f0ff;
    const ghostMat = new THREE.MeshBasicMaterial({
      color: ghostColor,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      wireframe: true,
      depthWrite: false,
    });

    ghost.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = ghostMat;
      }
    });

    ghost.position.copy(playerMesh.position);
    ghost.rotation.copy(playerMesh.rotation);
    this.scene.add(ghost);

    this.ghostMeshes.push({
      mesh: ghost,
      life: 0.22,
      maxLife: 0.22,
    });
  }

  public clear() {
    this.leftBootTrail.clear();
    this.rightBootTrail.clear();
    this.spineTrail.clear();
    this.bladeTrail.clear();
    for (const g of this.ghostMeshes) {
      this.scene.remove(g.mesh);
    }
    this.ghostMeshes = [];
  }

  public dispose() {
    this.leftBootTrail.dispose();
    this.rightBootTrail.dispose();
    this.spineTrail.dispose();
    this.bladeTrail.dispose();
    for (const g of this.ghostMeshes) {
      this.scene.remove(g.mesh);
    }
    this.ghostMeshes = [];
  }
}
