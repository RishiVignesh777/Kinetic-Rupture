/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  ArenaConfig,
  ArenaId,
  PlayerStats,
  RuptureGrade,
  StyleScoreState,
} from './types.ts';
import {
  calculateKineticMomentumCharge,
  calculateMeleeDamage,
  calculateRailCannonDamage,
  calculateRuptureGrade,
  calculateVanguardHit,
  canDeflectProjectile,
  canExecuteOverdrive,
  decayComboTimer,
  updateStyleScore,
} from './logic.ts';
import { soundEngine } from './audio.ts';
import {
  createBossModel,
  createCyberMaterials,
  createDroneModel,
  createNeonBuildingTexture,
  createPlayerModel,
  createVanguardMechModel,
} from './models.ts';
import { ParticleSystem } from './particles.ts';
import { PlayerTrailSystem } from './trail.ts';

export const ARENAS: Record<ArenaId, ArenaConfig> = {
  'neon-roofs': {
    id: 'neon-roofs',
    name: 'Neon Skyscraper Roofs',
    subtitle: 'Sector 07 Apex Horizon',
    description: 'High-altitude rooftop arena with massive chasms, vertical billboard walls, and hover-car traffic.',
    themeColor: '#00f0ff',
    gravityY: -28,
    enemyWaveTotal: 12,
    hasBoss: false,
  },
  'orbital-shaft': {
    id: 'orbital-shaft',
    name: 'Orbital Elevator Shaft',
    subtitle: 'Exo-Atmospheric Drop Tube',
    description: 'Mile-long vertical descent chamber with floating gravity platforms and aerial drone swarms.',
    themeColor: '#9d00ff',
    gravityY: -20,
    enemyWaveTotal: 18,
    hasBoss: false,
  },
  'cyber-forge': {
    id: 'cyber-forge',
    name: 'Cyber-Forge Assembly',
    subtitle: 'Heavy Mech Foundry & Apex Boss Arena',
    description: 'Industrial foundry with velocity conveyor strips, laser hazards, and the Vanguard Prime mech boss.',
    themeColor: '#ff0055',
    gravityY: -30,
    enemyWaveTotal: 14,
    hasBoss: true,
  },
};

export interface GameEngineCallbacks {
  onStyleUpdate: (state: StyleScoreState) => void;
  onPlayerStatsUpdate: (stats: PlayerStats) => void;
  onBossStatsUpdate: (stats: { active: boolean; name: string; hp: number; maxHp: number }) => void;
  onStatusChange: (status: 'title' | 'playing' | 'paused' | 'victory' | 'gameover') => void;
  onExecutionTargetAvailable: (target: { id: string; x: number; y: number } | null) => void;
}

export class GameEngine {
  private container: HTMLElement;
  private callbacks: GameEngineCallbacks;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private particles: ParticleSystem;
  private playerTrail: PlayerTrailSystem;
  private materials: ReturnType<typeof createCyberMaterials>;

  // Game state
  private status: 'title' | 'playing' | 'paused' | 'victory' | 'gameover' = 'title';
  private currentArena: ArenaConfig = ARENAS['neon-roofs'];
  private styleState: StyleScoreState = {
    score: 0,
    grade: 'D',
    multiplier: 1.0,
    comboCount: 0,
    comboTimer: 0,
  };
  private playerStats: PlayerStats = {
    maxHp: 150,
    hp: 150,
    kineticCharge: 0,
    isOvercharged: false,
    speedKmh: 0,
    overdriveTargetsAvailable: 0,
  };

  // Timing & hitstop
  private clock = new THREE.Clock();
  private hitstopTimer = 0;
  private cameraTrauma = 0;
  private animFrameId: number | null = null;
  private lastHudUpdateTime = 0;

  // Player Entity & Physics
  private playerGroup: THREE.Group;
  private rightArmGroup: THREE.Group;
  private bladeGroup: THREE.Group;
  private playerPos = new THREE.Vector3(0, 5, 0);
  private playerVel = new THREE.Vector3(0, 0, 0);
  private playerYaw = Math.PI; // Face forward into arena
  private isGrounded = false;
  private isWallRunning = false;
  private wallNormal = new THREE.Vector3();
  private isDashing = false;
  private dashTimer = 0;
  private jumpCount = 0;
  private maxJumps = 2;

  // Slash attack
  private isSlashing = false;
  private slashTimer = 0;
  private slashDuration = 0.28;

  // Tether
  private tetherTarget: THREE.Vector3 | null = null;
  private tetherEntityId: string | null = null;
  private isTethering = false;

  // Environment & Colliders
  private arenaObjects: THREE.Object3D[] = [];
  private wallColliders: { box: THREE.Box3; normal: THREE.Vector3 }[] = [];
  private floorColliders: THREE.Box3[] = [];
  private hoverCars: THREE.Mesh[] = [];

  // Enemies
  private enemies: {
    id: string;
    type: 'drone' | 'vanguard' | 'boss';
    mesh: THREE.Group;
    hp: number;
    maxHp: number;
    shieldMesh?: THREE.Mesh;
    reactorCore?: THREE.Mesh;
    pos: THREE.Vector3;
    vel: THREE.Vector3;
    isStaggered: boolean;
    staggerTimer: number;
    attackTimer: number;
    telegraphTimer: number;
  }[] = [];

  // Projectiles (lasers/plasma)
  private projectiles: {
    id: string;
    mesh: THREE.Mesh;
    pos: THREE.Vector3;
    vel: THREE.Vector3;
    isDeflected: boolean;
    damage: number;
    life: number;
  }[] = [];

  // Input state
  private keysHeld = new Set<string>();
  private mouseX = 0;
  private mouseY = 0;
  private isMouseDown = false;

  constructor(container: HTMLElement, callbacks: GameEngineCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    // 1. Scene & Camera
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x060810);
    this.scene.fog = new THREE.FogExp2(0x060810, 0.012);

    this.camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 8, 14);

    // 2. Renderer
    const isHeadless =
      navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent);
    this.renderer = new THREE.WebGLRenderer({
      antialias: !isHeadless,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(isHeadless ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = !isHeadless;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    // 3. Studio Environment Reflection
    try {
      const pmrem = new THREE.PMREMGenerator(this.renderer);
      this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      pmrem.dispose();
    } catch {
      // Fallback
    }

    // 4. Lighting Rig (Warm Key + Cool Fill + Rim)
    const keyLight = new THREE.DirectionalLight(0xfff0dd, 2.0);
    keyLight.position.set(25, 40, 20);
    keyLight.castShadow = !isHeadless;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -40;
    keyLight.shadow.camera.right = 40;
    keyLight.shadow.camera.top = 40;
    keyLight.shadow.camera.bottom = -40;
    keyLight.shadow.bias = -0.0005;
    this.scene.add(keyLight);

    const hemiLight = new THREE.HemisphereLight(0x00f0ff, 0x110022, 1.2);
    this.scene.add(hemiLight);

    // 5. Materials, Particles & Player Trails
    this.materials = createCyberMaterials();
    this.particles = new ParticleSystem(this.scene);
    this.playerTrail = new PlayerTrailSystem(this.scene);

    // 6. Player Model
    const playerModelData = createPlayerModel(this.materials);
    this.playerGroup = playerModelData.root;
    this.rightArmGroup = playerModelData.rightArmGroup;
    this.bladeGroup = playerModelData.bladeGroup;
    this.scene.add(this.playerGroup);

    // 7. Setup inputs and listeners
    this.bindInputs();

    // 8. Load Arena
    this.buildArena(this.currentArena);

    // 9. Pre-warm shaders
    this.renderer.compile(this.scene, this.camera);

    // 10. Start render loop
    this.tick();
  }

  // --- Input Management ---
  private bindInputs() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
    window.addEventListener('resize', this.handleResize);

    const canvas = this.renderer.domElement;
    canvas.addEventListener('mousedown', this.handleMouseDown);
    canvas.addEventListener('mouseup', this.handleMouseUp);
    canvas.addEventListener('mousemove', this.handleMouseMove);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    this.keysHeld.add(e.code);

    if (e.code === 'KeyP' || e.code === 'Escape') {
      this.togglePause();
      return;
    }

    if (e.code === 'KeyM') {
      soundEngine.toggleMute();
      return;
    }

    if (this.status !== 'playing') {
      if (e.code === 'Enter' || e.code === 'Space') {
        if (this.status === 'title' || this.status === 'victory' || this.status === 'gameover') {
          this.startGame();
        }
      }
      return;
    }

    // Action triggers
    if (e.code === 'Space') {
      this.triggerJump();
    } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      this.triggerDash();
    } else if (e.code === 'KeyE') {
      this.triggerTether();
    } else if (e.code === 'KeyQ') {
      this.triggerRailCannon();
    } else if (e.code === 'KeyF' || e.code === 'KeyR') {
      this.triggerOverdriveExecution();
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keysHeld.delete(e.code);
  };

  private handleBlur = () => {
    this.keysHeld.clear();
    this.isMouseDown = false;
  };

  private handleMouseDown = (e: MouseEvent) => {
    if (this.status !== 'playing') return;
    this.isMouseDown = true;
    if (e.button === 0) {
      // Left Click: Kinetic Blade Slash
      this.triggerSlash();
    } else if (e.button === 2) {
      // Right Click: Particle Rail Cannon or Tether
      if (this.playerStats.kineticCharge >= 25) {
        this.triggerRailCannon();
      } else {
        this.triggerTether();
      }
    }
  };

  private handleMouseUp = () => {
    this.isMouseDown = false;
  };

  private handleMouseMove = (e: MouseEvent) => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  };

  private handleResize = () => {
    if (!this.container) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  // --- Arena Generation ---
  public setArena(arenaId: ArenaId) {
    if (ARENAS[arenaId]) {
      this.currentArena = ARENAS[arenaId];
      this.buildArena(this.currentArena);
    }
  }

  private buildArena(config: ArenaConfig) {
    // Clear old arena objects & enemies
    this.arenaObjects.forEach((obj) => this.scene.remove(obj));
    this.arenaObjects = [];
    this.wallColliders = [];
    this.floorColliders = [];
    this.hoverCars = [];
    this.enemies.forEach((en) => this.scene.remove(en.mesh));
    this.enemies = [];
    this.projectiles.forEach((p) => this.scene.remove(p.mesh));
    this.projectiles = [];
    this.playerTrail?.clear();

    // Reset player position
    this.playerPos.set(0, 4, 0);
    this.playerVel.set(0, 0, 0);
    this.playerStats.hp = 100;
    this.playerStats.kineticCharge = 20;

    const buildingMat = new THREE.MeshStandardMaterial({
      color: 0x111625,
      roughness: 0.35,
      metalness: 0.8,
      map: createNeonBuildingTexture(config.id === 'cyber-forge' ? 340 : 190),
    });

    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0a0d16,
      roughness: 0.6,
      metalness: 0.4,
    });

    if (config.id === 'neon-roofs') {
      // Map 1: Skyscraper Roofs (Main central rooftop + satellite towers)
      // Main rooftop platform
      const mainRoof = new THREE.Mesh(new THREE.BoxGeometry(40, 4, 40), floorMat);
      mainRoof.position.set(0, -2, 0);
      mainRoof.receiveShadow = true;
      this.scene.add(mainRoof);
      this.arenaObjects.push(mainRoof);
      this.floorColliders.push(new THREE.Box3().setFromObject(mainRoof));

      // Neon grid runway on floor for motion parallax
      const gridHelper = new THREE.GridHelper(38, 19, 0x00f0ff, 0x182436);
      gridHelper.position.y = 0.02;
      this.scene.add(gridHelper);
      this.arenaObjects.push(gridHelper);

      // Neon Wall-running skyscrapers flanking the arena
      const wallConfigs = [
        { x: -22, z: 0, w: 6, h: 45, d: 35, norm: new THREE.Vector3(1, 0, 0) },
        { x: 22, z: 0, w: 6, h: 45, d: 35, norm: new THREE.Vector3(-1, 0, 0) },
        { x: 0, z: -22, w: 35, h: 45, d: 6, norm: new THREE.Vector3(0, 0, 1) },
      ];

      wallConfigs.forEach((wc) => {
        const tower = new THREE.Mesh(new THREE.BoxGeometry(wc.w, wc.h, wc.d), buildingMat);
        tower.position.set(wc.x, wc.h / 2 - 2, wc.z);
        tower.castShadow = true;
        tower.receiveShadow = true;
        this.scene.add(tower);
        this.arenaObjects.push(tower);
        this.wallColliders.push({
          box: new THREE.Box3().setFromObject(tower),
          normal: wc.norm,
        });

        // Add bright neon accent trims
        const trim = new THREE.Mesh(
          new THREE.BoxGeometry(wc.w * 1.02, 0.4, wc.d * 1.02),
          this.materials.cyanEmissive
        );
        trim.position.set(wc.x, 14, wc.z);
        this.scene.add(trim);
        this.arenaObjects.push(trim);
      });

      // Hover-cars cruising along neon skyway
      for (let i = 0; i < 4; i++) {
        const car = new THREE.Mesh(new THREE.BoxGeometry(3, 1.2, 5), this.materials.armorPlate);
        car.position.set(-15 + i * 10, 16 + i * 2, -35);
        this.scene.add(car);
        this.hoverCars.push(car);
        this.arenaObjects.push(car);
      }

      // Spawn opening wave of Drones and 1 Heavy Vanguard Mech
      this.spawnWave(6, 2, false);
    } else if (config.id === 'orbital-shaft') {
      // Map 2: Orbital Elevator Shaft (Vertical circular platforms & tube)
      const centerPlatform = new THREE.Mesh(new THREE.CylinderGeometry(18, 18, 3, 24), floorMat);
      centerPlatform.position.set(0, -1.5, 0);
      centerPlatform.receiveShadow = true;
      this.scene.add(centerPlatform);
      this.arenaObjects.push(centerPlatform);
      this.floorColliders.push(new THREE.Box3().setFromObject(centerPlatform));

      // 4 High Wall Pillars for vertical wall-running
      const angles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
      angles.forEach((a) => {
        const x = Math.cos(a) * 20;
        const z = Math.sin(a) * 20;
        const pillar = new THREE.Mesh(new THREE.BoxGeometry(6, 60, 6), buildingMat);
        pillar.position.set(x, 25, z);
        this.scene.add(pillar);
        this.arenaObjects.push(pillar);
        const norm = new THREE.Vector3(-Math.cos(a), 0, -Math.sin(a));
        this.wallColliders.push({
          box: new THREE.Box3().setFromObject(pillar),
          normal: norm,
        });
      });

      // Floating energy rings
      for (let i = 0; i < 3; i++) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(16, 0.4, 8, 32),
          this.materials.cyanEmissive
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 8 + i * 12;
        this.scene.add(ring);
        this.arenaObjects.push(ring);
      }

      this.spawnWave(8, 3, false);
    } else if (config.id === 'cyber-forge') {
      // Map 3: Cyber-Forge Assembly Plant & Vanguard Prime Boss Arena!
      const floor = new THREE.Mesh(new THREE.BoxGeometry(50, 4, 50), floorMat);
      floor.position.set(0, -2, 0);
      floor.receiveShadow = true;
      this.scene.add(floor);
      this.arenaObjects.push(floor);
      this.floorColliders.push(new THREE.Box3().setFromObject(floor));

      // Velocity Conveyor Strip (accelerates player speed to extreme levels!)
      const conveyor = new THREE.Mesh(new THREE.BoxGeometry(10, 0.2, 38), this.materials.bladeGlow);
      conveyor.position.set(0, 0.05, 0);
      this.scene.add(conveyor);
      this.arenaObjects.push(conveyor);

      // Arena Perimeter Walls
      const walls = [
        { x: -26, z: 0, w: 4, h: 30, d: 52, norm: new THREE.Vector3(1, 0, 0) },
        { x: 26, z: 0, w: 4, h: 30, d: 52, norm: new THREE.Vector3(-1, 0, 0) },
        { x: 0, z: -26, w: 52, h: 30, d: 4, norm: new THREE.Vector3(0, 0, 1) },
        { x: 0, z: 26, w: 52, h: 30, d: 4, norm: new THREE.Vector3(0, 0, -1) },
      ];
      walls.forEach((w) => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w.w, w.h, w.d), buildingMat);
        mesh.position.set(w.x, w.h / 2 - 2, w.z);
        this.scene.add(mesh);
        this.arenaObjects.push(mesh);
        this.wallColliders.push({ box: new THREE.Box3().setFromObject(mesh), normal: w.norm });
      });

      // Spawn Wave with Apex Boss!
      this.spawnWave(4, 2, true);
    }
  }

  // --- Spawning System ---
  private spawnWave(droneCount: number, vanguardCount: number, includeBoss: boolean) {
    // Drones
    for (let i = 0; i < droneCount; i++) {
      const droneMesh = createDroneModel(this.materials);
      const angle = (i / droneCount) * Math.PI * 2;
      const dist = 12 + Math.random() * 8;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const y = 4 + Math.random() * 5;
      droneMesh.position.set(x, y, z);
      this.scene.add(droneMesh);

      this.enemies.push({
        id: `drone_${Date.now()}_${i}`,
        type: 'drone',
        mesh: droneMesh,
        hp: 120,
        maxHp: 120,
        pos: droneMesh.position,
        vel: new THREE.Vector3(),
        isStaggered: false,
        staggerTimer: 0,
        attackTimer: 5.0 + Math.random() * 2.5,
        telegraphTimer: 0,
      });
    }

    // Heavy Vanguard Mechs
    for (let i = 0; i < vanguardCount; i++) {
      const mechData = createVanguardMechModel(this.materials);
      const angle = (i / vanguardCount) * Math.PI + Math.PI / 4;
      const x = Math.cos(angle) * 15;
      const z = Math.sin(angle) * 15;
      mechData.root.position.set(x, 0, z);
      this.scene.add(mechData.root);

      this.enemies.push({
        id: `vanguard_${Date.now()}_${i}`,
        type: 'vanguard',
        mesh: mechData.root,
        hp: 450,
        maxHp: 450,
        shieldMesh: mechData.shield,
        reactorCore: mechData.rearCore,
        pos: mechData.root.position,
        vel: new THREE.Vector3(),
        isStaggered: false,
        staggerTimer: 0,
        attackTimer: 6.0 + Math.random() * 2.5,
        telegraphTimer: 0,
      });
    }

    // Apex Boss Vanguard Prime
    if (includeBoss) {
      const bossData = createBossModel(this.materials);
      bossData.root.position.set(0, 0, -16);
      this.scene.add(bossData.root);

      this.enemies.push({
        id: 'boss_vanguard_prime',
        type: 'boss',
        mesh: bossData.root,
        hp: 1800,
        maxHp: 1800,
        pos: bossData.root.position,
        vel: new THREE.Vector3(),
        isStaggered: false,
        staggerTimer: 0,
        attackTimer: 6.5,
        telegraphTimer: 0,
      });

      this.callbacks.onBossStatsUpdate({
        active: true,
        name: 'APEX VANGUARD PRIME',
        hp: 1800,
        maxHp: 1800,
      });
    }
  }

  // --- Core Player Actions ---
  public triggerJump() {
    if (this.isGrounded || this.jumpCount < this.maxJumps) {
      this.playerVel.y = 16.5;
      this.jumpCount++;
      this.isGrounded = false;
      this.isWallRunning = false;
      this.particles.emitSparks(
        this.playerPos.x,
        this.playerPos.y,
        this.playerPos.z,
        14,
        0x00f0ff
      );
    } else if (this.isWallRunning) {
      // Wall-jump launch off wall normal!
      this.playerVel.copy(this.wallNormal).multiplyScalar(18);
      this.playerVel.y = 15;
      this.isWallRunning = false;
      this.jumpCount = 1;
      this.particles.emitSparks(
        this.playerPos.x,
        this.playerPos.y,
        this.playerPos.z,
        20,
        0x00ffff,
        1.5
      );
      soundEngine.playWallRunBoost();
    }
  }

  public triggerDash() {
    if (this.isDashing) return;
    this.isDashing = true;
    this.dashTimer = 0.22;

    // Dash in movement direction or forward
    const moveDir = new THREE.Vector3(0, 0, -1).applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      this.playerYaw
    );
    this.playerVel.copy(moveDir).multiplyScalar(35);
    this.playerVel.y = 2; // slight lift
    this.cameraTrauma = Math.min(1.0, this.cameraTrauma + 0.35);

    this.particles.emitSparks(
      this.playerPos.x,
      this.playerPos.y + 1,
      this.playerPos.z,
      24,
      0x00ffff,
      2.0
    );
    soundEngine.playBladeSlash(false);
  }

  public triggerSlash() {
    if (this.isSlashing) return;
    this.isSlashing = true;
    this.slashTimer = 0;

    const isOvercharged = this.playerStats.isOvercharged;
    soundEngine.playBladeSlash(isOvercharged);

    // Blade swing animation & arc
    this.rightArmGroup.rotation.y = 1.4;
    this.bladeGroup.rotation.x = -Math.PI / 3;

    // Check melee hits against nearby enemies
    const hitOrigin = this.playerPos.clone().add(new THREE.Vector3(0, 1.2, 0));
    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      this.playerYaw
    );

    // Deflect any nearby enemy projectiles in front of player
    this.projectiles.forEach((proj) => {
      if (!proj.isDeflected && proj.pos.distanceTo(hitOrigin) < 3.2) {
        if (canDeflectProjectile(this.isWallRunning || this.isDashing, 0.1)) {
          proj.isDeflected = true;
          proj.vel.reflect(forward).multiplyScalar(1.6);
          soundEngine.playDeflection();
          this.hitstopTimer = 0.05;
          this.cameraTrauma = Math.min(1.0, this.cameraTrauma + 0.4);
          this.particles.emitSparks(proj.pos.x, proj.pos.y, proj.pos.z, 28, 0xffff00, 2.0);
          this.styleState = updateStyleScore(this.styleState, 'deflect_parry');
        }
      }
    });

    let hitAny = false;
    this.enemies.forEach((enemy) => {
      if (enemy.hp <= 0) return;
      const dist = enemy.pos.distanceTo(hitOrigin);
      if (dist < 4.2) {
        // Directional check: is enemy behind their own shield (if Vanguard)?
        let damageResult = calculateMeleeDamage(75, this.playerStats.kineticCharge, isOvercharged);

        if (enemy.type === 'vanguard') {
          // Check if hitting from behind
          const toPlayer = this.playerPos.clone().sub(enemy.pos).normalize();
          const enemyFacing = new THREE.Vector3(0, 0, 1).applyQuaternion(enemy.mesh.quaternion);
          const hitFromBehind = toPlayer.dot(enemyFacing) < -0.25;

          const vanguardHit = calculateVanguardHit(hitFromBehind, damageResult.damage);
          if (vanguardHit.blocked) {
            soundEngine.playDeflection();
            this.particles.emitSparks(enemy.pos.x, enemy.pos.y + 1.8, enemy.pos.z, 16, 0xffaa00);
            return;
          }
          damageResult.damage = vanguardHit.effectiveDamage;
        }

        enemy.hp -= damageResult.damage;
        hitAny = true;
        this.hitstopTimer = damageResult.createsShockwave ? 0.08 : 0.04;
        this.cameraTrauma = Math.min(1.0, this.cameraTrauma + 0.45);
        soundEngine.playHitImpact(damageResult.isCritical);

        this.particles.emitSparks(
          enemy.pos.x,
          enemy.pos.y + 1.2,
          enemy.pos.z,
          damageResult.createsShockwave ? 36 : 20,
          isOvercharged ? 0x00ffff : 0xff0055,
          1.8
        );

        this.styleState = updateStyleScore(this.styleState, 'slash_hit');

        if (enemy.hp <= 0) {
          this.handleEnemyKilled(enemy);
        }
      }
    });

    if (hitAny) {
      soundEngine.setGrade(this.styleState.grade);
    }
  }

  public triggerRailCannon() {
    const railResult = calculateRailCannonDamage(this.playerStats.kineticCharge);
    if (!railResult.canFire) return;

    this.playerStats.kineticCharge -= railResult.chargeConsumed;
    soundEngine.playRailCannon();
    this.hitstopTimer = 0.07;
    this.cameraTrauma = Math.min(1.0, this.cameraTrauma + 0.6);

    const start = this.playerPos.clone().add(new THREE.Vector3(0, 1.4, 0));
    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      this.playerYaw
    );
    const end = start.clone().add(forward.clone().multiplyScalar(45));

    this.particles.fireRailCannonBeam(start, end);

    // Pierce through enemies along the ray
    const ray = new THREE.Ray(start, forward);
    let pierced = 0;

    this.enemies.forEach((enemy) => {
      if (enemy.hp <= 0 || pierced >= railResult.pierceCount) return;
      const sphere = new THREE.Sphere(enemy.pos.clone().add(new THREE.Vector3(0, 1.2, 0)), 2.2);
      if (ray.intersectsSphere(sphere)) {
        pierced++;
        enemy.hp -= railResult.damage;
        soundEngine.playHitImpact(true);
        this.particles.emitSparks(enemy.pos.x, enemy.pos.y + 1.2, enemy.pos.z, 30, 0x00ffff, 2.2);

        if (enemy.hp <= 0) {
          this.handleEnemyKilled(enemy);
        }
      }
    });

    if (pierced > 0) {
      this.styleState = updateStyleScore(this.styleState, 'rail_cannon_pierce');
      soundEngine.setGrade(this.styleState.grade);
    }
  }

  public triggerTether() {
    // Slingshot toward targeted Drone or nearest wall / hovercar
    let bestTarget: THREE.Vector3 | null = null;
    let closestDist = 40;

    // Prioritize flying drones as grapple slingshot anchors!
    this.enemies.forEach((enemy) => {
      if (enemy.hp > 0 && enemy.type === 'drone') {
        const d = this.playerPos.distanceTo(enemy.pos);
        if (d < closestDist) {
          closestDist = d;
          bestTarget = enemy.pos;
          this.tetherEntityId = enemy.id;
        }
      }
    });

    // Fallback to hover cars or wall anchors
    if (!bestTarget && this.hoverCars.length > 0) {
      bestTarget = this.hoverCars[0].position;
    }

    if (bestTarget) {
      this.tetherTarget = (bestTarget as THREE.Vector3).clone();
      this.isTethering = true;
      soundEngine.playTetherLaunch();

      // Launch velocity toward tether
      const tetherDir = this.tetherTarget.clone().sub(this.playerPos).normalize();
      this.playerVel.copy(tetherDir).multiplyScalar(42);
      this.isGrounded = false;
      this.isWallRunning = false;

      this.styleState = updateStyleScore(this.styleState, 'tether_slingshot');
    }
  }

  public triggerOverdriveExecution() {
    // Find nearest low HP or staggered enemy
    const executionCandidate = this.enemies.find((en) =>
      canExecuteOverdrive(en.hp, en.maxHp, en.isStaggered)
    );

    if (!executionCandidate) return;

    soundEngine.playExecutionSlash();
    this.hitstopTimer = 0.25; // Bullet-time dramatic freeze
    this.cameraTrauma = 1.0;

    // Teleport player adjacent to enemy and instant-kill
    this.playerPos.copy(executionCandidate.pos).add(new THREE.Vector3(0, 0.5, 1.8));
    this.particles.emitSparks(
      executionCandidate.pos.x,
      executionCandidate.pos.y + 1,
      executionCandidate.pos.z,
      50,
      0xff0055,
      2.5
    );

    executionCandidate.hp = 0;
    this.handleEnemyKilled(executionCandidate);

    this.styleState = updateStyleScore(this.styleState, 'overdrive_execution');
    soundEngine.setGrade(this.styleState.grade);
  }

  private handleEnemyKilled(enemy: (typeof this.enemies)[0]) {
    this.particles.emitSparks(enemy.pos.x, enemy.pos.y + 1, enemy.pos.z, 40, 0xffaa00, 2.0);
    this.scene.remove(enemy.mesh);

    // Check victory condition
    const aliveCount = this.enemies.filter((e) => e.hp > 0).length;
    if (aliveCount === 0) {
      this.handleVictory();
    }
  }

  private handleVictory() {
    this.status = 'victory';
    document.body.dataset.state = 'gameover';
    this.callbacks.onStatusChange('victory');
    soundEngine.stopMusic();
  }

  public handleDefeat() {
    this.status = 'gameover';
    document.body.dataset.state = 'gameover';
    this.callbacks.onStatusChange('gameover');
    soundEngine.stopMusic();
  }

  // --- Main Update Loop ---
  private tick = () => {
    this.animFrameId = requestAnimationFrame(this.tick);

    const rawDt = this.clock.getDelta();
    const dt = Math.min(rawDt, 0.05); // Clamped dt

    // Update particles regardless of pause
    this.particles.update(dt);

    if (this.status !== 'playing') {
      // Atmospheric title orbit camera
      if (this.status === 'title') {
        const time = this.clock.getElapsedTime() * 0.35;
        this.camera.position.x = Math.sin(time) * 24;
        this.camera.position.z = Math.cos(time) * 24;
        this.camera.position.y = 12 + Math.sin(time * 0.5) * 3;
        this.camera.lookAt(0, 3, 0);
      }
      this.renderer.render(this.scene, this.camera);
      return;
    }

    // Hitstop freeze timer
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      this.updateCamera(dt);
      this.renderer.render(this.scene, this.camera);
      return;
    }

    // 1. Player Physics & Vector Shift
    this.updatePlayerMovement(dt);

    // Update Player Neon Light Streak Trails & Dash Afterimages
    this.playerTrail.update(
      this.playerPos,
      this.playerYaw,
      this.playerStats.speedKmh,
      this.isDashing,
      this.isWallRunning,
      this.playerStats.isOvercharged,
      this.playerGroup,
      this.isSlashing,
      this.bladeGroup,
      dt,
      this.camera
    );

    // 2. Weapon & Combat Timers
    if (this.isSlashing) {
      this.slashTimer += dt;
      const progress = this.slashTimer / this.slashDuration;
      // Arm swing arc
      this.rightArmGroup.rotation.y = THREE.MathUtils.lerp(1.4, -1.2, progress);
      if (this.slashTimer >= this.slashDuration) {
        this.isSlashing = false;
        this.rightArmGroup.rotation.y = 0;
        this.bladeGroup.rotation.x = 0;
      }
    }

    if (this.isDashing) {
      this.dashTimer -= dt;
      if (this.dashTimer <= 0) {
        this.isDashing = false;
      }
    }

    if (this.isTethering && this.tetherTarget) {
      const dist = this.playerPos.distanceTo(this.tetherTarget);
      this.particles.setTether(
        this.playerPos.clone().add(new THREE.Vector3(0, 1.2, 0)),
        this.tetherTarget
      );
      if (dist < 3.0) {
        this.isTethering = false;
        this.tetherTarget = null;
        this.particles.setTether(this.playerPos, null);
      }
    } else {
      this.particles.setTether(this.playerPos, null);
    }

    // 3. Enemies AI & Boss
    this.updateEnemies(dt);

    // 4. Projectiles
    this.updateProjectiles(dt);

    // 5. Hover Cars
    this.hoverCars.forEach((car, idx) => {
      car.position.x += 18 * dt;
      if (car.position.x > 40) {
        car.position.x = -40;
      }
    });

    // 6. Style Score decay
    this.styleState = decayComboTimer(this.styleState, dt);

    // 7. Kinetic Momentum update
    const speedMps = this.playerVel.length();
    const chargeResult = calculateKineticMomentumCharge(
      this.playerStats.kineticCharge,
      speedMps,
      this.isWallRunning,
      dt
    );
    this.playerStats.kineticCharge = chargeResult.charge;
    this.playerStats.isOvercharged = chargeResult.isOvercharged;
    this.playerStats.speedKmh = Math.round(speedMps * 3.6);

    // 8. Overdrive Target Scan for HUD prompt
    const candidate = this.enemies.find((e) => canExecuteOverdrive(e.hp, e.maxHp, e.isStaggered));
    if (candidate) {
      // Project to 2D screen coordinate
      const screenPos = candidate.pos.clone().add(new THREE.Vector3(0, 1.4, 0)).project(this.camera);
      if (screenPos.z >= -1 && screenPos.z <= 1) {
        const x = ((screenPos.x + 1) * this.container.clientWidth) / 2;
        const y = ((-screenPos.y + 1) * this.container.clientHeight) / 2;
        this.callbacks.onExecutionTargetAvailable({ id: candidate.id, x, y });
      } else {
        this.callbacks.onExecutionTargetAvailable(null);
      }
    } else {
      this.callbacks.onExecutionTargetAvailable(null);
    }

    // 9. Throttled React HUD Updates
    const now = performance.now();
    if (now - this.lastHudUpdateTime > 100) {
      this.lastHudUpdateTime = now;
      this.callbacks.onStyleUpdate({ ...this.styleState });
      this.callbacks.onPlayerStatsUpdate({ ...this.playerStats });

      const boss = this.enemies.find((e) => e.type === 'boss');
      if (boss) {
        this.callbacks.onBossStatsUpdate({
          active: boss.hp > 0,
          name: 'APEX VANGUARD PRIME',
          hp: boss.hp,
          maxHp: boss.maxHp,
        });
      }
    }

    // 10. Camera Follow & Screen Shake
    this.updateCamera(dt);

    // 11. Render
    this.renderer.render(this.scene, this.camera);
  };

  private updatePlayerMovement(dt: number) {
    // Rotation from mouse / keyboard
    const rotateSpeed = 2.8;
    if (this.keysHeld.has('KeyA') || this.keysHeld.has('ArrowLeft')) {
      this.playerYaw += rotateSpeed * dt;
    }
    if (this.keysHeld.has('KeyD') || this.keysHeld.has('ArrowRight')) {
      this.playerYaw -= rotateSpeed * dt;
    }

    // Movement forward/back
    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      this.playerYaw
    );
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      this.playerYaw
    );

    const inputDir = new THREE.Vector3();
    if (this.keysHeld.has('KeyW') || this.keysHeld.has('ArrowUp')) inputDir.add(forward);
    if (this.keysHeld.has('KeyS') || this.keysHeld.has('ArrowDown')) inputDir.sub(forward);

    if (inputDir.lengthSq() > 0) {
      inputDir.normalize();
      const targetSpeed = this.isWallRunning ? 28 : 18;
      this.playerVel.x = THREE.MathUtils.damp(this.playerVel.x, inputDir.x * targetSpeed, 10, dt);
      this.playerVel.z = THREE.MathUtils.damp(this.playerVel.z, inputDir.z * targetSpeed, 10, dt);
    } else if (!this.isDashing && !this.isTethering) {
      this.playerVel.x = THREE.MathUtils.damp(this.playerVel.x, 0, 8, dt);
      this.playerVel.z = THREE.MathUtils.damp(this.playerVel.z, 0, 8, dt);
    }

    // Gravity
    if (!this.isGrounded) {
      if (this.isWallRunning) {
        // Reduced gravity while wall-running!
        this.playerVel.y = Math.max(-4, this.playerVel.y + this.currentArena.gravityY * 0.25 * dt);
      } else {
        this.playerVel.y += this.currentArena.gravityY * dt;
      }
    }

    // Apply Velocity to Position
    this.playerPos.addScaledVector(this.playerVel, dt);

    // Floor Collisions
    const playerRadius = 0.6;
    const playerBox = new THREE.Box3(
      new THREE.Vector3(this.playerPos.x - playerRadius, this.playerPos.y, this.playerPos.z - playerRadius),
      new THREE.Vector3(this.playerPos.x + playerRadius, this.playerPos.y + 2.0, this.playerPos.z + playerRadius)
    );

    this.isGrounded = false;
    for (const floor of this.floorColliders) {
      if (playerBox.intersectsBox(floor)) {
        if (this.playerVel.y <= 0 && this.playerPos.y >= floor.max.y - 0.5) {
          this.playerPos.y = floor.max.y;
          this.playerVel.y = 0;
          this.isGrounded = true;
          this.isWallRunning = false;
          this.jumpCount = 0;
          break;
        }
      }
    }

    // Wall-Running Check against Wall Colliders
    let touchingWall = false;
    for (const wall of this.wallColliders) {
      if (playerBox.intersectsBox(wall.box)) {
        touchingWall = true;
        this.wallNormal.copy(wall.normal);

        // Can latch into wall-run if moving and airborne!
        if (!this.isGrounded && this.playerVel.length() > 6) {
          this.isWallRunning = true;
          this.particles.emitSparks(
            this.playerPos.x,
            this.playerPos.y + 0.2,
            this.playerPos.z,
            3,
            0x00f0ff
          );
        }

        // Push player outside wall
        const pushDir = wall.normal.clone().multiplyScalar(0.1);
        this.playerPos.add(pushDir);
        break;
      }
    }

    if (!touchingWall) {
      this.isWallRunning = false;
    }

    // Pit Fall Recovery
    if (this.playerPos.y < -15) {
      this.playerPos.set(0, 6, 0);
      this.playerVel.set(0, 0, 0);
      this.playerStats.hp = Math.max(10, this.playerStats.hp - 20);
      this.styleState = updateStyleScore(this.styleState, 'took_damage');
      soundEngine.playHitImpact(true);
      if (this.playerStats.hp <= 0) {
        this.handleDefeat();
      }
    }

    // Update 3D player mesh transform
    this.playerGroup.position.copy(this.playerPos);
    this.playerGroup.rotation.y = this.playerYaw;

    // Wall run tilt
    if (this.isWallRunning) {
      this.playerGroup.rotation.z = THREE.MathUtils.damp(this.playerGroup.rotation.z, 0.35, 12, dt);
    } else {
      this.playerGroup.rotation.z = THREE.MathUtils.damp(this.playerGroup.rotation.z, 0, 10, dt);
    }
  }

  private updateEnemies(dt: number) {
    this.enemies.forEach((enemy) => {
      if (enemy.hp <= 0) return;

      const toPlayer = this.playerPos.clone().sub(enemy.pos);
      const dist = toPlayer.length();

      // Look at player
      enemy.mesh.lookAt(this.playerPos.x, enemy.pos.y, this.playerPos.z);

      if (enemy.type === 'drone') {
        // Drones hover and strafe around player
        if (dist > 10) {
          enemy.pos.add(toPlayer.normalize().multiplyScalar(6 * dt));
        } else if (dist < 6) {
          enemy.pos.sub(toPlayer.normalize().multiplyScalar(4 * dt));
        }

        // Attack telegraph & plasma shot
        enemy.attackTimer -= dt;
        if (enemy.attackTimer <= 0) {
          enemy.attackTimer = 2.2 + Math.random() * 1.5;
          this.fireEnemyProjectile(enemy.pos, this.playerPos, 12);
        }
      } else if (enemy.type === 'vanguard') {
        // Vanguard advances heavily toward player
        if (dist > 5) {
          enemy.pos.add(toPlayer.normalize().multiplyScalar(4.5 * dt));
        }

        enemy.attackTimer -= dt;
        if (enemy.attackTimer <= 0.6 && enemy.attackTimer > 0) {
          // Visible telegraph flash
          if (enemy.reactorCore) {
            enemy.reactorCore.scale.set(1.3, 1.3, 1.3);
          }
        }
        if (enemy.attackTimer <= 0) {
          enemy.attackTimer = 3.5;
          if (enemy.reactorCore) {
            enemy.reactorCore.scale.set(1, 1, 1);
          }
          // Fires heavy triple spread
          this.fireEnemyProjectile(enemy.pos, this.playerPos, 22);
          soundEngine.playBossTelegraph();
        }
      } else if (enemy.type === 'boss') {
        // Apex Boss: Vanguard Prime
        if (dist > 8) {
          enemy.pos.add(toPlayer.normalize().multiplyScalar(8 * dt));
        }

        enemy.attackTimer -= dt;
        if (enemy.attackTimer <= 0.8 && enemy.attackTimer > 0) {
          soundEngine.playBossTelegraph();
        }
        if (enemy.attackTimer <= 0) {
          enemy.attackTimer = 2.8;
          // Boss shockwave or laser barrage
          this.fireEnemyProjectile(enemy.pos, this.playerPos, 25);
          this.cameraTrauma = Math.min(1.0, this.cameraTrauma + 0.3);
          this.particles.emitSparks(enemy.pos.x, enemy.pos.y + 2, enemy.pos.z, 25, 0xff0055, 1.8);
        }
      }
    });
  }

  private fireEnemyProjectile(from: THREE.Vector3, target: THREE.Vector3, damage: number) {
    const geo = new THREE.SphereGeometry(0.3, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff0055 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(from).add(new THREE.Vector3(0, 1.2, 0));
    this.scene.add(mesh);

    const dir = target.clone().add(new THREE.Vector3(0, 1.0, 0)).sub(mesh.position).normalize();
    const vel = dir.multiplyScalar(22);

    this.projectiles.push({
      id: `proj_${Date.now()}_${Math.random()}`,
      mesh,
      pos: mesh.position,
      vel,
      isDeflected: false,
      damage,
      life: 4.0,
    });
  }

  private updateProjectiles(dt: number) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      p.pos.addScaledVector(p.vel, dt);

      // Hit player
      if (!p.isDeflected) {
        if (p.pos.distanceTo(this.playerPos.clone().add(new THREE.Vector3(0, 1.2, 0))) < 1.4) {
          this.playerStats.hp -= p.damage;
          this.styleState = updateStyleScore(this.styleState, 'took_damage');
          soundEngine.playHitImpact(true);
          this.cameraTrauma = Math.min(1.0, this.cameraTrauma + 0.5);
          this.particles.emitSparks(p.pos.x, p.pos.y, p.pos.z, 20, 0xff0055);

          this.scene.remove(p.mesh);
          this.projectiles.splice(i, 1);

          if (this.playerStats.hp <= 0) {
            this.handleDefeat();
          }
          continue;
        }
      } else {
        // Deflected projectile can damage enemies!
        for (const enemy of this.enemies) {
          if (enemy.hp > 0 && p.pos.distanceTo(enemy.pos) < 2.5) {
            enemy.hp -= p.damage * 2.5; // High deflected damage!
            soundEngine.playHitImpact(true);
            this.particles.emitSparks(enemy.pos.x, enemy.pos.y + 1, enemy.pos.z, 25, 0x00ffff);
            if (enemy.hp <= 0) {
              this.handleEnemyKilled(enemy);
            }
            this.scene.remove(p.mesh);
            this.projectiles.splice(i, 1);
            break;
          }
        }
      }

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
      }
    }
  }

  private updateCamera(dt: number) {
    // Dynamic Camera Follow Rig with FOV kick and trauma shake
    const speedRatio = Math.min(1.0, this.playerVel.length() / 35);
    const targetFov = 75 + speedRatio * 18; // FOV expands at high speed!
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 6, dt);
    this.camera.updateProjectionMatrix();

    // Camera offset behind player with exponential damping
    const followOffset = new THREE.Vector3(0, 3.8, 8.5).applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      this.playerYaw
    );
    const targetCamPos = this.playerPos.clone().add(followOffset);

    // Camera trauma shake
    if (this.cameraTrauma > 0) {
      const shake = this.cameraTrauma * this.cameraTrauma * 0.45;
      targetCamPos.x += (Math.random() - 0.5) * shake;
      targetCamPos.y += (Math.random() - 0.5) * shake;
      targetCamPos.z += (Math.random() - 0.5) * shake;
      this.cameraTrauma = Math.max(0, this.cameraTrauma - 1.8 * dt);
    }

    this.camera.position.lerp(targetCamPos, 1 - Math.exp(-12 * dt));

    const lookTarget = this.playerPos.clone().add(new THREE.Vector3(0, 1.8, 0));
    this.camera.lookAt(lookTarget);
  }

  // --- Game Lifecycle Controls ---
  public startGame() {
    this.status = 'playing';
    document.body.dataset.state = 'playing';
    this.callbacks.onStatusChange('playing');
    soundEngine.init();
    soundEngine.startMusic();
    this.buildArena(this.currentArena);
  }

  public togglePause() {
    if (this.status === 'playing') {
      this.status = 'paused';
      document.body.dataset.state = 'paused';
      this.callbacks.onStatusChange('paused');
    } else if (this.status === 'paused') {
      this.status = 'playing';
      document.body.dataset.state = 'playing';
      this.callbacks.onStatusChange('playing');
    }
  }

  public restartRun() {
    this.startGame();
  }

  public returnToTitle() {
    this.status = 'title';
    document.body.dataset.state = 'title';
    this.callbacks.onStatusChange('title');
    soundEngine.stopMusic();
  }

  public getStatus() {
    return this.status;
  }

  public dispose() {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }
    soundEngine.stopMusic();
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    window.removeEventListener('resize', this.handleResize);

    this.particles.dispose();
    this.playerTrail.dispose();
    this.renderer.dispose();
    if (this.container && this.renderer.domElement) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
