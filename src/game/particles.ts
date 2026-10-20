/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';

const MAX_PARTICLES = 400;

interface Particle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  size: number;
  r: number;
  g: number;
  b: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private instancedMesh: THREE.InstancedMesh;
  private dummy = new THREE.Object3D();
  private color = new THREE.Color();

  // Rail Cannon Beam helper
  private beamMesh: THREE.Mesh;
  private beamLife: number = 0;

  // Tether Cable line helper
  private tetherLine: THREE.Line;
  private tetherActive: boolean = false;

  constructor(scene: THREE.Scene) {
    // 1. Instanced Mesh for sparks & debris
    const geo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
    });
    this.instancedMesh = new THREE.InstancedMesh(geo, mat, MAX_PARTICLES);
    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(this.instancedMesh);

    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 1,
        size: 0.1,
        r: 1,
        g: 1,
        b: 1,
      });
      this.dummy.position.set(0, -999, 0);
      this.dummy.scale.set(0, 0, 0);
      this.dummy.updateMatrix();
      this.instancedMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.instancedMesh.instanceMatrix.needsUpdate = true;

    // 2. Rail Cannon Beam
    const beamGeo = new THREE.CylinderGeometry(0.2, 0.2, 1, 8);
    beamGeo.rotateX(Math.PI / 2);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.85,
    });
    this.beamMesh = new THREE.Mesh(beamGeo, beamMat);
    this.beamMesh.visible = false;
    scene.add(this.beamMesh);

    // 3. Tether Line
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 0),
    ]);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, linewidth: 2 });
    this.tetherLine = new THREE.Line(lineGeo, lineMat);
    this.tetherLine.visible = false;
    scene.add(this.tetherLine);
  }

  public emitSparks(
    x: number,
    y: number,
    z: number,
    count: number = 16,
    colorHex: number = 0x00f0ff,
    speedFactor: number = 1.0
  ) {
    this.color.setHex(colorHex);
    let spawned = 0;
    for (let i = 0; i < MAX_PARTICLES && spawned < count; i++) {
      const p = this.particles[i];
      if (!p.active) {
        p.active = true;
        p.x = x;
        p.y = y;
        p.z = z;
        const theta = Math.random() * Math.PI * 2;
        const phi = (Math.random() - 0.5) * Math.PI;
        const spd = (4 + Math.random() * 8) * speedFactor;
        p.vx = Math.cos(phi) * Math.cos(theta) * spd;
        p.vy = Math.sin(phi) * spd + 2.0;
        p.vz = Math.cos(phi) * Math.sin(theta) * spd;
        p.life = 0;
        p.maxLife = 0.25 + Math.random() * 0.35;
        p.size = 0.12 + Math.random() * 0.16;
        p.r = this.color.r;
        p.g = this.color.g;
        p.b = this.color.b;
        spawned++;
      }
    }
  }

  public fireRailCannonBeam(start: THREE.Vector3, end: THREE.Vector3) {
    this.beamLife = 0.22;
    this.beamMesh.visible = true;

    const dist = start.distanceTo(end);
    this.beamMesh.scale.set(1, 1, dist);
    this.beamMesh.position.copy(start).lerp(end, 0.5);
    this.beamMesh.lookAt(end);

    // Also blast impact sparks along the beam
    this.emitSparks(end.x, end.y, end.z, 28, 0x00ffff, 1.8);
  }

  public setTether(from: THREE.Vector3, to: THREE.Vector3 | null) {
    if (!to) {
      this.tetherLine.visible = false;
      this.tetherActive = false;
      return;
    }
    this.tetherLine.visible = true;
    this.tetherActive = true;
    const positions = this.tetherLine.geometry.attributes.position.array as Float32Array;
    positions[0] = from.x;
    positions[1] = from.y;
    positions[2] = from.z;
    positions[3] = to.x;
    positions[4] = to.y;
    positions[5] = to.z;
    this.tetherLine.geometry.attributes.position.needsUpdate = true;
  }

  public update(dt: number) {
    let needsUpdate = false;

    // Beam decay
    if (this.beamLife > 0) {
      this.beamLife -= dt;
      if (this.beamLife <= 0) {
        this.beamMesh.visible = false;
      }
    }

    // Particle update
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.particles[i];
      if (p.active) {
        p.life += dt;
        if (p.life >= p.maxLife) {
          p.active = false;
          this.dummy.position.set(0, -999, 0);
          this.dummy.scale.set(0, 0, 0);
          this.dummy.updateMatrix();
          this.instancedMesh.setMatrixAt(i, this.dummy.matrix);
          needsUpdate = true;
          continue;
        }

        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        p.vy -= 16.0 * dt; // gravity on particles

        const progress = p.life / p.maxLife;
        const scale = p.size * (1 - progress);

        this.dummy.position.set(p.x, p.y, p.z);
        this.dummy.scale.set(scale, scale, scale);
        this.dummy.updateMatrix();
        this.instancedMesh.setMatrixAt(i, this.dummy.matrix);

        this.color.setRGB(p.r, p.g, p.b);
        this.instancedMesh.setColorAt(i, this.color);
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      this.instancedMesh.instanceMatrix.needsUpdate = true;
      if (this.instancedMesh.instanceColor) {
        this.instancedMesh.instanceColor.needsUpdate = true;
      }
    }
  }

  public dispose() {
    this.instancedMesh.geometry.dispose();
    (this.instancedMesh.material as THREE.Material).dispose();
    this.beamMesh.geometry.dispose();
    (this.beamMesh.material as THREE.Material).dispose();
    this.tetherLine.geometry.dispose();
    (this.tetherLine.material as THREE.Material).dispose();
  }
}
