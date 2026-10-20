/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';

// Reusable procedural materials to avoid excessive allocations
export function createCyberMaterials() {
  const darkMetal = new THREE.MeshStandardMaterial({
    color: 0x181a24,
    metalness: 0.85,
    roughness: 0.25,
  });

  const armorPlate = new THREE.MeshStandardMaterial({
    color: 0x242a38,
    metalness: 0.6,
    roughness: 0.45,
  });

  const cyanEmissive = new THREE.MeshStandardMaterial({
    color: 0x00f0ff,
    emissive: 0x00d4ff,
    emissiveIntensity: 1.4,
    roughness: 0.2,
    metalness: 0.1,
  });

  const bladeGlow = new THREE.MeshStandardMaterial({
    color: 0x00ffff,
    emissive: 0x00f0ff,
    emissiveIntensity: 2.2,
    transparent: true,
    opacity: 0.88,
    roughness: 0.1,
  });

  const redEmissive = new THREE.MeshStandardMaterial({
    color: 0xff1040,
    emissive: 0xff0033,
    emissiveIntensity: 1.8,
    roughness: 0.2,
  });

  const shieldGlow = new THREE.MeshStandardMaterial({
    color: 0xffaa00,
    emissive: 0xff8800,
    emissiveIntensity: 1.5,
    transparent: true,
    opacity: 0.65,
    side: THREE.DoubleSide,
  });

  const reactorCore = new THREE.MeshStandardMaterial({
    color: 0xffdd00,
    emissive: 0xffaa00,
    emissiveIntensity: 2.5,
    roughness: 0.2,
  });

  const bossCrimson = new THREE.MeshStandardMaterial({
    color: 0x8a051d,
    metalness: 0.9,
    roughness: 0.2,
  });

  return {
    darkMetal,
    armorPlate,
    cyanEmissive,
    bladeGlow,
    redEmissive,
    shieldGlow,
    reactorCore,
    bossCrimson,
  };
}

// 1. Player Character: Augmented Kinetic Warrior (Composite 10-part procedural model)
export function createPlayerModel(mats: ReturnType<typeof createCyberMaterials>) {
  const root = new THREE.Group();
  root.name = 'player';

  // Torso / Chassis (Primary)
  const torsoGeo = new THREE.BoxGeometry(0.7, 0.9, 0.45);
  const torso = new THREE.Mesh(torsoGeo, mats.armorPlate);
  torso.position.y = 1.35;
  root.add(torso);

  // Cybernetic Spine (Accent)
  const spineGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.8, 8);
  const spine = new THREE.Mesh(spineGeo, mats.cyanEmissive);
  spine.position.set(0, 1.35, -0.24);
  root.add(spine);

  // Helmet / Visor (Secondary)
  const headGeo = new THREE.BoxGeometry(0.38, 0.42, 0.4);
  const head = new THREE.Mesh(headGeo, mats.darkMetal);
  head.position.y = 1.95;
  root.add(head);

  const visorGeo = new THREE.BoxGeometry(0.34, 0.12, 0.12);
  const visor = new THREE.Mesh(visorGeo, mats.cyanEmissive);
  visor.position.set(0, 1.98, 0.18);
  root.add(visor);

  // Shoulder Pauldrons
  const leftPauldron = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.4), mats.armorPlate);
  leftPauldron.position.set(-0.52, 1.7, 0);
  root.add(leftPauldron);

  const rightPauldron = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.4), mats.armorPlate);
  rightPauldron.position.set(0.52, 1.7, 0);
  root.add(rightPauldron);

  // Arms with Energy Blades
  const leftArmGroup = new THREE.Group();
  leftArmGroup.position.set(-0.5, 1.45, 0);
  const leftArmMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.7, 8), mats.darkMetal);
  leftArmMesh.position.y = -0.3;
  leftArmGroup.add(leftArmMesh);
  root.add(leftArmGroup);

  const rightArmGroup = new THREE.Group();
  rightArmGroup.name = 'rightArm';
  rightArmGroup.position.set(0.5, 1.45, 0);
  const rightArmMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.7, 8), mats.darkMetal);
  rightArmMesh.position.y = -0.3;
  rightArmGroup.add(rightArmMesh);

  // Kinetic Blade attached to Right Arm (Primary Weapon)
  const bladeGroup = new THREE.Group();
  bladeGroup.name = 'kineticBlade';
  bladeGroup.position.set(0, -0.6, 0.15);

  const bladeHilt = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.35, 8), mats.darkMetal);
  bladeHilt.rotation.x = Math.PI / 2;
  bladeGroup.add(bladeHilt);

  // Curved energy blade beam
  const bladeGeo = new THREE.BoxGeometry(0.06, 0.14, 1.6);
  bladeGeo.translate(0, 0, 0.7);
  const bladeMesh = new THREE.Mesh(bladeGeo, mats.bladeGlow);
  bladeGroup.add(bladeMesh);
  rightArmGroup.add(bladeGroup);
  root.add(rightArmGroup);

  // Legs & Gravity Boots (Pivoted at bottom-center)
  const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.85, 0.28), mats.darkMetal);
  leftLeg.position.set(-0.22, 0.45, 0);
  root.add(leftLeg);

  const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.85, 0.28), mats.darkMetal);
  rightLeg.position.set(0.22, 0.45, 0);
  root.add(rightLeg);

  // Gravity Boot Thrusters (Accent cyan glow)
  const leftBoot = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.14, 0.38), mats.cyanEmissive);
  leftBoot.position.set(-0.22, 0.07, 0.05);
  root.add(leftBoot);

  const rightBoot = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.14, 0.38), mats.cyanEmissive);
  rightBoot.position.set(0.22, 0.07, 0.05);
  root.add(rightBoot);

  // Soft contact shadow circle beneath player
  const shadowGeo = new THREE.CircleGeometry(0.65, 16);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  });
  const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
  contactShadow.position.y = 0.015;
  root.add(contactShadow);

  return { root, rightArmGroup, bladeGroup };
}

// 2. Drone Swarm Unit (Composite 7-part model)
export function createDroneModel(mats: ReturnType<typeof createCyberMaterials>) {
  const root = new THREE.Group();
  root.name = 'drone';

  // Core Chassis (Primary)
  const coreGeo = new THREE.DodecahedronGeometry(0.48, 1);
  const core = new THREE.Mesh(coreGeo, mats.darkMetal);
  core.position.y = 0.6;
  root.add(core);

  // Red Optical Eye / Targeting Sensor (Accent)
  const eyeGeo = new THREE.SphereGeometry(0.2, 12, 12);
  const eye = new THREE.Mesh(eyeGeo, mats.redEmissive);
  eye.position.set(0, 0.6, 0.35);
  root.add(eye);

  // 4 Outrigger Thruster Pylons (Secondary)
  const pylonMat = mats.armorPlate;
  const thrusterMat = mats.redEmissive;

  const angles = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4];
  angles.forEach((angle) => {
    const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.55), pylonMat);
    pylon.position.set(Math.cos(angle) * 0.35, 0.6, Math.sin(angle) * 0.35);
    pylon.rotation.y = angle;
    root.add(pylon);

    // Thruster ring at end of pylon
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.06, 8), thrusterMat);
    ring.position.set(Math.cos(angle) * 0.65, 0.6, Math.sin(angle) * 0.65);
    root.add(ring);
  });

  // Dual Laser Barrels under chassis
  const barrelGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.35, 6);
  barrelGeo.rotateX(Math.PI / 2);
  const leftBarrel = new THREE.Mesh(barrelGeo, mats.darkMetal);
  leftBarrel.position.set(-0.16, 0.32, 0.2);
  root.add(leftBarrel);

  const rightBarrel = new THREE.Mesh(barrelGeo, mats.darkMetal);
  rightBarrel.position.set(0.16, 0.32, 0.2);
  root.add(rightBarrel);

  // Soft contact shadow
  const shadowGeo = new THREE.CircleGeometry(0.4, 12);
  shadowGeo.rotateX(-Math.PI / 2);
  const contactShadow = new THREE.Mesh(
    shadowGeo,
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false })
  );
  contactShadow.position.y = 0.02;
  root.add(contactShadow);

  return root;
}

// 3. Heavy Vanguard Mech (Composite 9-part model with Frontal Energy Shield & Rear Power Core)
export function createVanguardMechModel(mats: ReturnType<typeof createCyberMaterials>) {
  const root = new THREE.Group();
  root.name = 'vanguard';

  // Heavy Chassis Hull (Primary)
  const hullGeo = new THREE.BoxGeometry(1.6, 1.4, 1.2);
  const hull = new THREE.Mesh(hullGeo, mats.armorPlate);
  hull.position.y = 1.8;
  root.add(hull);

  // Armored Cockpit Head
  const headGeo = new THREE.BoxGeometry(0.8, 0.5, 0.7);
  const head = new THREE.Mesh(headGeo, mats.darkMetal);
  head.position.set(0, 2.6, 0.15);
  root.add(head);

  // Head Visor (Telegraph flashable)
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.14, 0.1), mats.redEmissive);
  visor.position.set(0, 2.62, 0.52);
  root.add(visor);

  // Frontal Kinetic Shield (Secondary - blocks frontal attacks!)
  const shieldGeo = new THREE.PlaneGeometry(2.2, 2.0);
  const shield = new THREE.Mesh(shieldGeo, mats.shieldGlow);
  shield.name = 'frontShield';
  shield.position.set(0, 1.8, 0.95);
  root.add(shield);

  // Rear Fusion Reactor Core (Critical Weakspot!)
  const coreGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.6, 12);
  const rearCore = new THREE.Mesh(coreGeo, mats.reactorCore);
  rearCore.name = 'reactorCore';
  rearCore.position.set(0, 1.8, -0.68);
  rearCore.rotation.x = Math.PI / 2;
  root.add(rearCore);

  // Heavy Autocannon on Right Arm
  const cannonArm = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 1.4), mats.darkMetal);
  cannonArm.position.set(1.1, 1.8, 0.4);
  root.add(cannonArm);

  const cannonBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.8, 8), mats.redEmissive);
  cannonBarrel.position.set(1.1, 1.8, 1.3);
  cannonBarrel.rotation.x = Math.PI / 2;
  root.add(cannonBarrel);

  // Bipedal Hydraulic Legs
  const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.2, 0.5), mats.darkMetal);
  leftLeg.position.set(-0.65, 0.6, 0);
  root.add(leftLeg);

  const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.2, 0.5), mats.darkMetal);
  rightLeg.position.set(0.65, 0.6, 0);
  root.add(rightLeg);

  // Contact shadow
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(1.2, 16).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45, depthWrite: false })
  );
  shadow.position.y = 0.02;
  root.add(shadow);

  return { root, shield, rearCore };
}

// 4. Apex Boss: "Vanguard Prime" (Composite 12-part model)
export function createBossModel(mats: ReturnType<typeof createCyberMaterials>) {
  const root = new THREE.Group();
  root.name = 'vanguardPrime';

  // Massive Torso / Core (Primary)
  const chestGeo = new THREE.BoxGeometry(2.4, 2.2, 1.5);
  const chest = new THREE.Mesh(chestGeo, mats.bossCrimson);
  chest.position.y = 3.2;
  root.add(chest);

  // Pulsing Core in Chest
  const bossCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.55), mats.reactorCore);
  bossCore.name = 'bossCore';
  bossCore.position.set(0, 3.2, 0.8);
  root.add(bossCore);

  // Head with Crown Horns (Secondary)
  const headGeo = new THREE.BoxGeometry(1.1, 0.8, 0.9);
  const head = new THREE.Mesh(headGeo, mats.darkMetal);
  head.position.set(0, 4.4, 0.1);
  root.add(head);

  // Crown Horns
  const hornLeft = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.9, 6), mats.bossCrimson);
  hornLeft.position.set(-0.55, 5.0, 0);
  hornLeft.rotation.z = -0.35;
  root.add(hornLeft);

  const hornRight = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.9, 6), mats.bossCrimson);
  hornRight.position.set(0.55, 5.0, 0);
  hornRight.rotation.z = 0.35;
  root.add(hornRight);

  // Swept-Back Vector Wings
  const wingLeft = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.25, 0.8), mats.bossCrimson);
  wingLeft.position.set(-1.8, 3.8, -0.6);
  wingLeft.rotation.z = -0.4;
  wingLeft.rotation.y = 0.3;
  root.add(wingLeft);

  const wingRight = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.25, 0.8), mats.bossCrimson);
  wingRight.position.set(1.8, 3.8, -0.6);
  wingRight.rotation.z = 0.4;
  wingRight.rotation.y = -0.3;
  root.add(wingRight);

  // Giant High-Frequency Blades on both arms
  const leftBladeGroup = new THREE.Group();
  leftBladeGroup.position.set(-1.8, 2.8, 0.3);
  const leftBlade = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.35, 3.2), mats.redEmissive);
  leftBlade.position.set(0, 0, 1.2);
  leftBladeGroup.add(leftBlade);
  root.add(leftBladeGroup);

  const rightBladeGroup = new THREE.Group();
  rightBladeGroup.position.set(1.8, 2.8, 0.3);
  const rightBlade = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.35, 3.2), mats.redEmissive);
  rightBlade.position.set(0, 0, 1.2);
  rightBladeGroup.add(rightBlade);
  root.add(rightBladeGroup);

  // Massive Legs
  const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.7, 2.2, 0.8), mats.darkMetal);
  leftLeg.position.set(-0.9, 1.1, 0);
  root.add(leftLeg);

  const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.7, 2.2, 0.8), mats.darkMetal);
  rightLeg.position.set(0.9, 1.1, 0);
  root.add(rightLeg);

  // Boss contact shadow
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(2.0, 20).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.5, depthWrite: false })
  );
  shadow.position.y = 0.02;
  root.add(shadow);

  return { root, leftBladeGroup, rightBladeGroup, bossCore };
}

// Procedural Canvas Neon Texture Generator for Skyscrapers
export function createNeonBuildingTexture(baseHue: number = 190): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Dark skyscraper background
  ctx.fillStyle = '#0c0e18';
  ctx.fillRect(0, 0, 256, 512);

  // Glowing neon window grid
  const cols = 8;
  const rows = 24;
  const padX = 8;
  const padY = 6;
  const cellW = (256 - (cols + 1) * padX) / cols;
  const cellH = (512 - (rows + 1) * padY) / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (Math.random() > 0.45) {
        const x = padX + c * (cellW + padX);
        const y = padY + r * (cellH + padY);
        const isCyan = Math.random() > 0.3;
        ctx.fillStyle = isCyan ? `hsl(${baseHue}, 90%, 65%)` : `hsl(340, 95%, 65%)`;
        ctx.fillRect(x, y, cellW, cellH);
      }
    }
  }

  // Neon advertising stripe
  ctx.fillStyle = `hsl(${baseHue}, 100%, 55%)`;
  ctx.fillRect(0, 240, 256, 12);
  ctx.fillStyle = '#ff0055';
  ctx.fillRect(0, 256, 256, 6);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
