/* MI BOWLING · Perfiles locales LAB P1
 * Selector y almacenamiento aislado SIN servidores, contraseñas ni cuentas remotas.
 * El PIN es una barrera de comodidad; NO cifra datos ni garantiza acceso seguro. */
(function (root) {
  'use strict';
  const META = 'mi-bowling-local-profiles-v1';
  const TAB = 'mi-bowling-local-selected-v1';
  const PREFIX = 'mi-bowling-profile:';
  const LEGACY = 'legacy';
  const LEGACY_KEYS = [
    'mi-bowling-analitica-v2',
    'mi-bowling-v1',
    'mi-bowling-liga-v1',
    'mi-bowling-liga-acta-v32',
    'mi-bowling-liga-rosters-v33',
    'mi-bowling-quick-layout',
    'mi-bowling-ball-selection-v1'
  ];
  const PIN_ITERATIONS = 160000;
  let catalog = null;
  let activeId = null;
  let pendingId = null;
  let booted = false;
  const doc = root.document;
  const APP_SRC = doc?.currentScript?.dataset.appSrc || 'app.js?v=3310cat1';

  function safe(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
  }
  function storageKey(base, id) {
    const resolved = id || activeId;
    if (!resolved || !/^(legacy|p-[a-zA-Z0-9-]+)$/.test(resolved)) {
      throw new Error('Selecciona un jugador antes de acceder al almacenamiento');
    }
    return PREFIX + resolved + ':' + base;
  }
  function pdfDatabase() {
    if (!activeId) throw new Error('No hay jugador activo');
    return 'mi-bowling-patrones-pdf-' + activeId;
  }
  function current() {
    const p = catalog?.profiles?.find(x => x.id === activeId);
    return p ? { id: p.id, name: p.name, legacy: p.id === LEGACY } : null;
  }
  function isLegacy() { return activeId === LEGACY; }
  function profiles() {
    return (catalog?.profiles || []).map(x => ({
      id: x.id, name: x.name, hasPin: !!x.pin, legacy: x.id === LEGACY
    }));
  }
  function persist(c) {
    root.localStorage.setItem(META, JSON.stringify(c));
    catalog = c;
  }
  function read() {
    const raw = root.localStorage.getItem(META);
    if (raw === null) return null;
    const data = JSON.parse(raw);
    if (!data || data.version !== 1 || !Array.isArray(data.profiles) ||
        data.profiles.some(p => !p || !/^(legacy|p-[a-zA-Z0-9-]+)$/.test(p.id) ||
          typeof p.name !== 'string' || !p.name || p.name.length > 40) ||
        new Set(data.profiles.map(p => p.id)).size !== data.profiles.length) {
      throw new Error('El catálogo de jugadores no tiene un formato válido. No se ha sobrescrito.');
    }
    return data;
  }
  function recoverLegacy() {
    const entries = LEGACY_KEYS.flatMap(key => {
      const value = root.localStorage.getItem(key);
      return value === null ? [] : [[key, value]];
    });
    // Los originales NO se borran ni se sobrescriben. Se copian literalmente.
    const hasHistory = entries.some(([key]) => key !== 'mi-bowling-quick-layout');
    const c = { version: 1, profiles: hasHistory ? [{
      id: LEGACY, name: 'Jugador principal · datos anteriores',
      createdAt: new Date().toISOString(), legacy: true
    }] : [] };
    const written = [];
    try {
      if (hasHistory) for (const [key, value] of entries) {
        const dest = storageKey(key, LEGACY);
        if (root.localStorage.getItem(dest) !== null) {
          throw new Error('Ya existe una copia parcial anterior; se requiere revisión');
        }
        root.localStorage.setItem(dest, value);
        if (root.localStorage.getItem(dest) !== value) {
          throw new Error('No se ha podido verificar la copia de los datos anteriores');
        }
        written.push(dest);
      }
      persist(c);
    } catch (error) {
      for (const key of written) root.localStorage.removeItem(key);
      throw new Error('No hay espacio suficiente para duplicar los datos anteriores o completar la copia: ' + error.message);
    }
    return c;
  }
  function randomId() {
    if (root.crypto && typeof root.crypto.randomUUID === 'function') {
      return 'p-' + root.crypto.randomUUID();
    }
    const bytes = new Uint8Array(16);
    if (!root.crypto || !root.crypto.getRandomValues) {
      throw new Error('Este navegador no permite crear identificadores de forma segura');
    }
    root.crypto.getRandomValues(bytes);
    return 'p-' + Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  }
  function bytesToHex(bytes) {
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  }
  function hexToBytes(hex) {
    if (!/^(?:[0-9a-f]{2})+$/i.test(hex)) throw new Error('Formato de PIN inválido');
    return Uint8Array.from(hex.match(/.{2}/g), value => parseInt(value, 16));
  }
  async function derive(pin, salt, iterations) {
    if (!root.crypto?.subtle || !root.crypto.getRandomValues) {
      throw new Error('El PIN requiere un navegador seguro (HTTPS)');
    }
    const bytes = new TextEncoder().encode(pin);
    const secret = await root.crypto.subtle.importKey(
      'raw', bytes, 'PBKDF2', false, ['deriveBits']
    );
    const bits = await root.crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
      secret, 256
    );
    return bytesToHex(new Uint8Array(bits));
  }
  async function makePin(pin) {
    if (!/^\d{4,8}$/.test(pin)) throw new Error('El PIN debe tener entre 4 y 8 dígitos');
    const salt = root.crypto.getRandomValues(new Uint8Array(16));
    return { salt: bytesToHex(salt), hash: await derive(pin, salt, PIN_ITERATIONS),
      iterations: PIN_ITERATIONS };
  }
  async function verifyPin(profile, pin) {
    if (!profile.pin) return true;
    if (!/^\d{4,8}$/.test(pin)) return false;
    const actual = await derive(pin, hexToBytes(profile.pin.salt), profile.pin.iterations);
    const expected = profile.pin.hash;
    if (!/^[0-9a-f]{64}$/.test(expected) || actual.length !== expected.length) return false;
    let different = 0;
    for (let i = 0; i < expected.length; i++) different |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
    return different === 0;
  }
  function gateHTML() {
    const buttons = profiles().map(p =>
      '<button class="player-tile" type="button" data-open-profile="' + safe(p.id) + '">' +
      '<span class="player-avatar" aria-hidden="true">🎳</span>' +
      '<span class="player-tile-copy"><strong>' + safe(p.name) + '</strong>' +
      '<small>' + (p.legacy ? 'Partidas anteriores conservadas' : 'Partidas y estadísticas propias') +
      (p.hasPin ? ' · PIN' : '') + '</small></span><span aria-hidden="true">›</span></button>'
    ).join('');
    return '<section class="player-screen" aria-label="Seleccionar jugador">' +
      '<div class="player-panel"><div class="player-heading">' +
      '<span class="player-eyebrow">MI BOWLING · PERFILES LOCALES</span>' +
      '<h1>¿Quién va a jugar?</h1><p>Las partidas, las bolas y las estadísticas se mantienen separadas en este dispositivo.</p></div>' +
      '<div class="player-tiles">' + buttons + '</div>' +
      '<button class="player-add" id="player-show-create" type="button">＋ Crear nuevo jugador</button>' +
      '<form id="player-create-form" class="player-form" hidden>' +
      '<h2>Nuevo jugador</h2><label>Nombre<input required id="player-name" type="text" maxlength="40" autocomplete="off" placeholder="Ej. Jugador 2"></label>' +
      '<label>PIN opcional (4–8 dígitos)<input id="player-pin" type="password" inputmode="numeric" pattern="[0-9]{4,8}" autocomplete="new-password" placeholder="Opcional"></label>' +
      '<label>Repetir PIN<input id="player-pin-check" type="password" inputmode="numeric" autocomplete="new-password" placeholder="Solo si eliges PIN"></label>' +
      '<div class="player-actions"><button class="player-primary" type="submit">Crear jugador vacío</button>' +
      '<button type="button" id="player-cancel-create">Cancelar</button></div></form>' +
      '<form class="player-form" id="player-unlock-form" hidden>' +
      '<h2 id="player-unlock-title">Introducir PIN</h2>' +
      '<label>PIN local<input id="player-unlock-pin" type="password" inputmode="numeric" autocomplete="off" maxlength="8" required></label>' +
      '<div class="player-actions"><button class="player-primary" type="submit">Entrar</button>' +
      '<button id="player-cancel-unlock" type="button">Cancelar</button></div>' +
      '<p class="player-note">El PIN no cifra los datos ni protege frente a quien acceda al almacenamiento del navegador.</p></form>' +
      '<p id="player-error" class="player-error" role="alert" aria-live="assertive"></p>' +
      '<p class="player-note">Sin nube ni cuentas online. Los datos no viajan a otros dispositivos. No borres los datos del navegador sin una copia de seguridad.</p>' +
      '</div></section>';
  }
  function showError(message) {
    const node = doc.getElementById('player-error');
    if (node) node.textContent = String(message);
  }
  function showGate() {
    doc.body.classList.add('player-gated');
    const area = doc.getElementById('profile-gate');
    if (!area) throw new Error('Falta la pantalla de jugadores');
    area.hidden = false;
    area.innerHTML = gateHTML();
    const createForm = doc.getElementById('player-create-form');
    const unlockForm = doc.getElementById('player-unlock-form');
    doc.getElementById('player-show-create').addEventListener('click', () => {
      createForm.hidden = false; unlockForm.hidden = true;
      doc.getElementById('player-name').focus();
    });
    doc.getElementById('player-cancel-create').addEventListener('click', () => { createForm.hidden = true; showError(''); });
    doc.getElementById('player-cancel-unlock').addEventListener('click', () => {
      pendingId = null; unlockForm.hidden = true; showError('');
    });
    area.querySelectorAll('[data-open-profile]').forEach(button => {
      button.addEventListener('click', () => choose(button.getAttribute('data-open-profile')));
    });
    createForm.addEventListener('submit', async event => {
      event.preventDefault();
      const name = doc.getElementById('player-name').value.trim();
      const pin = doc.getElementById('player-pin').value.trim();
      const confirm = doc.getElementById('player-pin-check').value.trim();
      const button = createForm.querySelector('[type="submit"]');
      button.disabled = true;
      try { await create(name, pin, confirm); }
      catch (err) { showError(err.message); button.disabled = false; }
    });
    unlockForm.addEventListener('submit', async event => {
      event.preventDefault();
      const pin = doc.getElementById('player-unlock-pin').value;
      const button = unlockForm.querySelector('[type="submit"]');
      button.disabled = true;
      try {
        const p = catalog.profiles.find(x => x.id === pendingId);
        if (!p || !(await verifyPin(p, pin))) throw new Error('PIN incorrecto');
        unlockForm.hidden = true; pendingId = null; enter(p.id);
      } catch (err) { showError(err.message); button.disabled = false; }
    });
  }
  async function create(name, pin, confirmation) {
    name = String(name || '').trim();
    pin = String(pin || '').trim();
    if (name.length < 1 || name.length > 40) throw new Error('Indica un nombre de 1 a 40 caracteres');
    if (catalog.profiles.some(p => p.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      throw new Error('Ya existe otro jugador con ese nombre');
    }
    if (pin !== String(confirmation || '').trim()) throw new Error('Los dos PIN no coinciden');
    const id = randomId();
    const player = { id, name, createdAt: new Date().toISOString() };
    if (pin) player.pin = await makePin(pin);
    // No se importa ni asigna ninguna sesión: empieza con 0.
    persist({version: 1, profiles: [...catalog.profiles, player]});
    enter(id);
    return player;
  }
  function choose(id) {
    const p = catalog?.profiles.find(x => x.id === id);
    if (!p) return showError('El jugador seleccionado no existe');
    showError('');
    if (!p.pin) { enter(id); return; }
    pendingId = id;
    doc.getElementById('player-create-form').hidden = true;
    doc.getElementById('player-unlock-form').hidden = false;
    doc.getElementById('player-unlock-title').textContent = 'PIN de ' + p.name;
    doc.getElementById('player-unlock-pin').value = '';
    doc.getElementById('player-unlock-pin').focus();
  }
  function enter(id) {
    if (!catalog?.profiles.some(p => p.id === id)) throw new Error('Jugador inexistente');
    root.sessionStorage.setItem(TAB, id);
    activeId = id;
    const gate = doc.getElementById('profile-gate');
    if (gate) { gate.hidden = true; gate.replaceChildren(); }
    doc.body.classList.remove('player-gated');
    const player = current();
    const label = doc.getElementById('player-current');
    if (label) label.textContent = '👤 ' + player.name;
    const button = doc.getElementById('player-switch');
    if (button) { button.hidden = false; button.setAttribute('aria-label', 'Cambiar jugador, actual: ' + player.name); }
    const script = doc.createElement('script');
    script.src = APP_SRC;
    script.onerror = () => {
      doc.getElementById('app').textContent = 'No ha sido posible abrir MI BOWLING LAB. Recarga la página.';
    };
    doc.body.appendChild(script);
  }
  function leave() {
    root.sessionStorage.removeItem(TAB);
    root.location.reload();
  }
  function init() {
    if (booted) return;
    booted = true;
    try {
      catalog = read() || recoverLegacy();
      const last = root.sessionStorage.getItem(TAB);
      if (last && catalog.profiles.some(p => p.id === last)) enter(last);
      else { root.sessionStorage.removeItem(TAB); showGate(); }
    } catch (err) {
      doc.body.classList.add('player-gated');
      const area = doc.getElementById('profile-gate');
      if (area) {
        area.hidden = false;
        area.innerHTML = '<section class="player-screen"><div class="player-panel">' +
          '<h1>No es seguro iniciar los perfiles</h1><p id="player-fatal"></p>' +
          '<p>Los datos originales no se han borrado. Conserva la aplicación publicada y realiza una copia antes de reintentar.</p></div></section>';
        doc.getElementById('player-fatal').textContent = String(err.message);
      }
    }
  }
  root.MiBowlingProfiles = Object.freeze({
    init, current, profiles, storageKey, pdfDatabase, isLegacy, leave,
    // Métodos de prueba. No sustituyen la validación de la interfaz.
    create, verifyPin, getCatalog: () => catalog,
    metadataKey: META, selectedKey: TAB, legacyKeys: LEGACY_KEYS.slice()
  });
})(window);
