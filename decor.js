// decor.js — Décor de rue : colline de maisons de favela construites en code.
// À charger APRÈS le script principal (il utilise scene, renderer et THREE).
// Aucune image ni modèle à télécharger : tout est généré ici.
(function () {
  'use strict';

  // ---------- Réglages faciles ----------
  const HOUSE_W = 12, HOUSE_D = 9, FLOOR_H = 6.2; // taille d'une maison et d'un étage
  const ROWS = 3;            // rangées de maisons vers le fond
  const ROW_GAP = 11;        // distance entre les rangées
  const FRONT0 = -34;        // z de la façade de la 1re rangée
  const HILL_START = -30;    // z où la colline commence
  const SLOPE = 0.4;         // pente de la colline (0.4 = 40 cm de haut pour 1 m)
  const BUMP = 1.5;          // relief des murs (0 = désactivé)
  const FOG_NEAR = 75, FOG_FAR = 200; // brume : plus grand = décor plus net

  // Couleurs de murs (délavées, comme sous le soleil) et de portes
  const WALLS = ['#c8935f', '#b8603f', '#d6b463', '#6f97b8', '#c77f93', '#7fa886', '#c9b8a0'];
  const DOORS = ['#b23a3a', '#2f6f8f', '#3f7f4f', '#c9a13a', '#6a4a3a'];
  const FRAME = '#d2cabb';

  // Hasard reproductible : le décor est le même à chaque lancement
  let seed = 20260920;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const pick = a => a[Math.floor(rnd() * a.length)];

  const maxAniso = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  const hillY = z => (z < HILL_START ? SLOPE * (HILL_START - z) : 0);

  // ---------- Texture de mur (couleur + relief), dessinée par le code ----------
  function wallTexture(hex, floors, wUnits, front) {
    const U = front ? 20 : 12; // pixels par unité 3D
    const W = Math.round(wUnits * U), PH = Math.round(FLOOR_H * U), H = PH * floors;
    const cc = document.createElement('canvas'), cb = document.createElement('canvas');
    cc.width = cb.width = W; cc.height = cb.height = H;
    const g = cc.getContext('2d'), b = cb.getContext('2d');
    const box = (x, y, w, h, col, bump) => {
      if (col) { g.fillStyle = col; g.fillRect(x, y, w, h); }
      if (bump) { b.fillStyle = bump; b.fillRect(x, y, w, h); }
    };

    // Crépi : fond + grain
    box(0, 0, W, H, hex, '#808080');
    const n = Math.round(W * H / 40);
    for (let i = 0; i < n; i++) {
      const x = rnd() * W, y = rnd() * H, s = 1 + rnd() * 2.5, dark = rnd() < 0.5;
      const a = 0.04 + rnd() * 0.09;
      box(x, y, s, s,
        dark ? 'rgba(50,30,15,' + a + ')' : 'rgba(255,240,220,' + a + ')',
        dark ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.18)');
    }
    // Traînées d'humidité
    for (let i = 0; i < 4 * floors; i++) {
      const x = rnd() * W, y = rnd() * H * 0.6, w = U * (0.3 + rnd()), h = U * (2 + rnd() * 4);
      const gr = g.createLinearGradient(0, y, 0, y + h);
      gr.addColorStop(0, 'rgba(40,25,15,0.22)'); gr.addColorStop(1, 'rgba(40,25,15,0)');
      box(x, y, w, h, gr, null);
    }
    // Crépi écaillé : la brique apparaît
    for (let i = 0; i < 1 + floors; i++) {
      const bw = U * (1.2 + rnd() * 1.6), bh = U * (0.8 + rnd() * 1.2);
      const bx = rnd() * (W - bw), by = rnd() * Math.max(1, H - bh - U * 1.5);
      box(bx, by, bw, bh, '#a4553a', '#5a5a5a');
      const rowH = Math.max(3, U * 0.22);
      g.fillStyle = 'rgba(210,190,170,0.5)';
      for (let yy = by, k = 0; yy < by + bh; yy += rowH, k++) {
        g.fillRect(bx, yy, bw, 1);
        for (let xx = bx + (k % 2) * U * 0.3; xx < bx + bw; xx += U * 0.6) g.fillRect(xx, yy, 1, rowH);
      }
    }
    // Dalles entre les étages et socle en béton
    const band = Math.max(3, Math.round(U * 0.3));
    for (let r = 1; r < floors; r++) box(0, r * PH - band / 2, W, band, '#b3ab9c', '#b0b0b0');
    const baseH = Math.round(U * 0.9);
    box(0, H - baseH, W, baseH, '#a9a599', '#a8a8a8');
    box(0, H - baseH, W, 2, 'rgba(0,0,0,0.25)', null);

    // Fenêtre : cadre en relief, vitre en retrait, croisillons, appui
    const win = (x, y, w, h) => {
      const f = Math.max(3, U * 0.25);
      box(x - f, y - f, w + 2 * f, h + 2 * f, FRAME, '#dcdcdc');
      const gl = g.createLinearGradient(x, y, x + w, y + h);
      gl.addColorStop(0, '#4f6f91'); gl.addColorStop(0.5, '#9dbad4'); gl.addColorStop(1, '#3f566f');
      box(x, y, w, h, gl, '#262626');
      box(x, y, w, Math.max(2, h * 0.1), 'rgba(0,0,0,0.4)', null);
      box(x, y, Math.max(2, w * 0.06), h, 'rgba(0,0,0,0.3)', null);
      g.strokeStyle = '#6d2a20'; g.lineWidth = Math.max(1, U * 0.1);
      g.beginPath();
      g.moveTo(x + w / 2, y); g.lineTo(x + w / 2, y + h);
      g.moveTo(x, y + h / 2); g.lineTo(x + w, y + h / 2);
      g.stroke();
      box(x - f * 1.6, y + h + f, w + f * 3.2, f, '#a49c8d', '#f0f0f0');
    };
    // Porte en tôle ondulée
    const door = (x, yFloor, w, h) => {
      const f = Math.max(3, U * 0.3), y = yFloor - h, step = Math.max(3, U * 0.28);
      box(x - f, y - f, w + 2 * f, h + f, FRAME, '#dcdcdc');
      box(x, y, w, h, pick(DOORS), '#3c3c3c');
      for (let i = 0, k = 0; i < w; i += step, k++) {
        const hi = k % 2 === 0;
        box(x + i, y, Math.max(1, U * 0.12), h,
          hi ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.24)', hi ? '#5a5a5a' : '#2c2c2c');
      }
      box(x, y + h * 0.72, w, h * 0.28, 'rgba(60,25,10,0.3)', null);
      box(x, y, w, Math.max(2, h * 0.05), 'rgba(0,0,0,0.4)', null);
      box(x + w * 0.82, y + h * 0.5, Math.max(2, U * 0.2), Math.max(3, U * 0.5), '#1e1e1e', null);
    };
    // Balcon : rambarde en fer sur une dalle
    const rail = (x, yBottom, w) => {
      const hgt = U * 1.0;
      g.strokeStyle = '#25272b'; g.lineWidth = Math.max(1, U * 0.09);
      g.beginPath();
      g.moveTo(x, yBottom - hgt); g.lineTo(x + w, yBottom - hgt);
      for (let i = 0; i <= w; i += U * 0.35) { g.moveTo(x + i, yBottom - hgt); g.lineTo(x + i, yBottom); }
      g.stroke();
      box(x - 2, yBottom - 2, w + 4, Math.max(3, U * 0.2), '#8d887c', '#cfcfcf');
    };

    const dw = U * 2.6, dh = U * 4.7, ww = U * 3.2, wh = U * 2.4;
    const slotA = W * 0.14, slotB = W * 0.58;
    const doorLeft = rnd() < 0.5;
    for (let r = 0; r < floors; r++) {
      const ground = r === floors - 1;
      const yFloor = r * PH + PH - (ground ? baseH : band / 2);
      if (front) {
        if (ground) {
          door(doorLeft ? slotA : slotB, yFloor, dw, dh);
          win(doorLeft ? slotB : slotA, yFloor - U * 3.6, ww, wh);
        } else {
          for (const sx of [slotA, slotB]) {
            if (rnd() < 0.85) {
              win(sx, yFloor - U * 3.7, ww, wh);
              if (rnd() < 0.4) rail(sx - U * 0.2, yFloor - U * 0.3, ww + U * 0.4);
            }
          }
        }
      } else if (rnd() < 0.6) {
        win(W / 2 - U * 0.9, yFloor - U * 3.6, U * 1.8, U * 2.0);
      }
    }

    const tex = new THREE.CanvasTexture(cc);
    tex.anisotropy = maxAniso;
    let bump = null;
    if (BUMP > 0) { bump = new THREE.CanvasTexture(cb); bump.anisotropy = maxAniso; }
    return { tex, bump };
  }

  // Matériaux partagés : un jeu par couleur et par nombre d'étages
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x3b3b40, roughness: 1 });
  const matCache = {};
  function houseMats(ci, floors) {
    const key = ci + '_' + floors;
    if (matCache[key]) return matCache[key];
    const make = (front, wUnits) => {
      const t = wallTexture(WALLS[ci], floors, wUnits, front);
      const o = { map: t.tex, roughness: 1, metalness: 0 };
      if (t.bump) { o.bumpMap = t.bump; o.bumpScale = BUMP; }
      return new THREE.MeshStandardMaterial(o);
    };
    const front = make(true, HOUSE_W), side = make(false, HOUSE_D);
    // ordre des faces : +x, -x, dessus, dessous, avant (+z, côté terrain), arrière
    return (matCache[key] = [side, side, roofMat, roofMat, front, side]);
  }

  // ---------- Pièces partagées ----------
  const boxGeos = {};
  const boxGeo = floors => boxGeos[floors] || (boxGeos[floors] = new THREE.BoxGeometry(HOUSE_W, FLOOR_H * floors, HOUSE_D));
  const slabGeo = new THREE.BoxGeometry(HOUSE_W + 0.6, 0.5, HOUSE_D + 0.6);
  const slabMats = [0x8d887c, 0x77746c, 0xa39f92].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 1 }));
  const tankGeo = new THREE.CylinderGeometry(0.9, 0.9, 1.5, 12);
  const tankMats = [0x2e6f9e, 0x8a8a8a, 0x1f1f1f].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 }));
  const rebarGeo = new THREE.CylinderGeometry(0.07, 0.07, 2, 5);
  const rebarMat = new THREE.MeshStandardMaterial({ color: 0x6b4a3a, roughness: 1 });

  let houseCount = 0;
  function addHouse(cx, front, floors, ci) {
    const h = FLOOR_H * floors;
    const g = new THREE.Group();
    g.position.set(cx, hillY(front) - 0.3, front - HOUSE_D / 2);
    g.scale.x = (rnd() < 0.5 ? -1 : 1) * (0.85 + rnd() * 0.3); // miroir + largeur variable

    const body = new THREE.Mesh(boxGeo(floors), houseMats(ci, floors));
    body.position.y = h / 2;
    g.add(body);

    const slab = new THREE.Mesh(slabGeo, pick(slabMats)); // dalle de toit qui déborde
    slab.position.y = h + 0.25;
    g.add(slab);

    const r = rnd();
    if (r < 0.4) { // citerne d'eau
      const tank = new THREE.Mesh(tankGeo, pick(tankMats));
      tank.position.set((rnd() - 0.5) * 6, h + 0.5 + 0.75, (rnd() - 0.5) * 3);
      g.add(tank);
    } else if (r < 0.65) { // fers à béton : étage en construction
      for (const sx of [-5.4, 5.4]) for (const sz of [-3.6, 3.6]) {
        const p = new THREE.Mesh(rebarGeo, rebarMat);
        p.position.set(sx, h + 0.5 + 1, sz);
        g.add(p);
      }
    }
    scene.add(g);
    houseCount++;
  }

  // ---------- Colline ----------
  function hillTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#7b6248'; g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 1400; i++) {
      const s = 1 + rnd() * 3;
      g.fillStyle = rnd() < 0.5 ? 'rgba(45,30,15,0.18)' : 'rgba(200,170,130,0.15)';
      g.fillRect(rnd() * 128, rnd() * 128, s, s);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(50, 20);
    return t;
  }
  const L = 160, th = Math.atan(SLOPE);
  const hill = new THREE.Mesh(
    new THREE.PlaneGeometry(420, L),
    new THREE.MeshStandardMaterial({ map: hillTexture(), roughness: 1 })
  );
  hill.rotation.x = -Math.PI / 2 + th;
  hill.position.set(0, (L / 2) * Math.sin(th), HILL_START - (L / 2) * Math.cos(th));
  scene.add(hill);

  // ---------- Rangées de maisons ----------
  for (let r = 0; r < ROWS; r++) {
    const front = FRONT0 - r * ROW_GAP;
    const half = 105 + r * 15;
    let x = -half + rnd() * 6;
    while (x < half) {
      const wv = 0.85 + rnd() * 0.3;
      const floors = 1 + Math.floor(rnd() * 3);
      addHouse(x + HOUSE_W * wv / 2, front + (rnd() - 0.5) * 3, floors, Math.floor(rnd() * WALLS.length));
      x += HOUSE_W * wv + 0.4 + rnd() * 2.2;
    }
  }

  // ---------- Retirer les anciens immeubles « crayons de couleur » ----------
  scene.children.slice().forEach(o => {
    if (o.isMesh && o.geometry && o.geometry.type === 'BoxGeometry' &&
        (o.position.z === -45 || o.position.z === -85)) scene.remove(o);
  });

  // Brume moins épaisse : les maisons gardent leurs couleurs
  if (scene.fog) { scene.fog.near = FOG_NEAR; scene.fog.far = FOG_FAR; }

  console.log('decor.js : ' + houseCount + ' maisons créées');
})();