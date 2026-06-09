/**
 * MULINO DI QUERCEGROSSA — Biglietto Regalo Digitale
 * script.js
 *
 * Gestisce:
 *  - Navigazione SPA tra schermate
 *  - Fase 1: Anagramma
 *  - Fase 2: Memory Game (card matching)
 *  - Fase 3: Quiz a scelta multipla
 *  - Animazione coriandoli finale
 *  - Barra di progresso
 *
 * Struttura:
 *  1. Utility & Costanti
 *  2. Navigazione Schermate
 *  3. Barra di Progresso
 *  4. Fase 1 — Anagramma
 *  5. Fase 2 — Memory Game
 *  6. Fase 3 — Indovinello
 *  7. Reveal Finale + Coriandoli
 *  8. Init
 */

/* =====================================================
   1. UTILITY & COSTANTI
   ===================================================== */

/**
 * Normalizza una stringa: maiuscolo, niente spazi/accenti.
 * Usata per confrontare le risposte agli anagrammi.
 */
function normalize(str) {
  return str
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Mischia un array in-place (Fisher-Yates shuffle).
 * @param {Array} arr
 * @returns {Array}
 */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Mostra un messaggio di feedback.
 * @param {string} id       - id dell'elemento .feedback
 * @param {string} msg      - testo da mostrare
 * @param {'success'|'error'} type
 */
function showFeedback(id, msg, type) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.className = `feedback ${type}`;
  el.classList.remove('hidden');
}

function hideFeedback(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
}

/* =====================================================
   2. NAVIGAZIONE SCHERMATE
   ===================================================== */

/**
 * Transizione fluida tra due schermate SPA.
 * @param {string} fromId  - id schermata attiva
 * @param {string} toId    - id schermata di destinazione
 */
function goToScreen(fromId, toId) {
  const from = document.getElementById(fromId);
  const to   = document.getElementById(toId);

  if (!from || !to) return;

  // 1. Nascondi la schermata corrente
  from.classList.remove('active');
  from.classList.add('hidden');

  // 2. Mostra la nuova schermata con animazione
  to.classList.remove('hidden');
  to.classList.add('active', 'entering');

  // 3. Rimuovi la classe 'entering' al termine dell'animazione
  to.addEventListener('animationend', () => {
    to.classList.remove('entering');
  }, { once: true });

  // 4. Scroll in cima
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* =====================================================
   3. BARRA DI PROGRESSO
   ===================================================== */

/**
 * Aggiorna la barra di progresso in cima alla pagina.
 * @param {number} currentStep - 1, 2 o 3
 */
function updateProgress(currentStep) {
  const bar = document.getElementById('progress-bar');
  bar.classList.remove('hidden');

  const steps = document.querySelectorAll('.progress-step');
  const lines = document.querySelectorAll('.progress-line');

  steps.forEach((step, idx) => {
    const stepNum = idx + 1;
    step.classList.remove('active', 'done');
    if (stepNum < currentStep)  step.classList.add('done');
    if (stepNum === currentStep) step.classList.add('active');
  });

  lines.forEach((line, idx) => {
    line.classList.remove('done');
    if (idx + 1 < currentStep) line.classList.add('done');
  });
}

/* =====================================================
   4. FASE 1 — ANAGRAMMA
   ===================================================== */

function initPhase1() {
  const btn = document.getElementById('btn-check1');
  if (!btn) return;

  btn.addEventListener('click', checkAnagrams);

  // Permetti anche di inviare con Enter
  document.querySelectorAll('.anagram-input').forEach(input => {
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') checkAnagrams();
    });
  });
}

function checkAnagrams() {
  const inputs  = document.querySelectorAll('.anagram-input');
  let allCorrect = true;

  inputs.forEach(input => {
    const answer   = normalize(input.dataset.answer);
    const userVal  = normalize(input.value);

    // Rimuovi classi precedenti
    input.classList.remove('correct', 'wrong');

    if (userVal === answer) {
      input.classList.add('correct');
    } else {
      input.classList.add('wrong');
      allCorrect = false;
    }
  });

  if (allCorrect) {
    hideFeedback('feedback1');
    revealClue('clue1', 'enigma1');
  } else {
    showFeedback('feedback1', '⚠️ Alcune risposte non sono corrette. Riprova!', 'error');
  }
}

/* =====================================================
   5. FASE 2 — MEMORY GAME
   ===================================================== */

/**
 * Dati delle carte: ogni coppia è definita da id, emoji e label.
 * L'array contiene 4 coppie = 8 carte totali.
 */
const MEMORY_PAIRS = [
  { id: 'pool',    emoji: '🏊',  label: 'Piscina Aqualis' },
  { id: 'wine',    emoji: '🍷',  label: 'Vigneti del Chianti' },
  { id: 'food',    emoji: '🍽️', label: 'Cucina di Nonna Wilma' },
  { id: 'olive',   emoji: '🫒',  label: 'Uliveti Toscani' },
];

let memoryState = {
  flipped:    [],   // carte attualmente girate (max 2)
  matched:    [],   // id delle coppie trovate
  moves:      0,    // numero di tentativi
  locked:     false // blocca il click durante controllo
};

/**
 * Costruisce e inietta le carte nel DOM.
 */
function buildMemoryGrid() {
  const grid  = document.getElementById('memory-grid');
  if (!grid) return;

  grid.innerHTML = '';

  // Duplica le coppie e mischia
  const cards = shuffle([...MEMORY_PAIRS, ...MEMORY_PAIRS]);

  cards.forEach((card, index) => {
    const el = document.createElement('div');
    el.className   = 'memory-card';
    el.dataset.id  = card.id;
    el.dataset.idx = index;

    el.innerHTML = `
      <div class="memory-card-inner">
        <div class="memory-card-front" aria-hidden="true">?</div>
        <div class="memory-card-back">
          <span class="card-emoji" role="img" aria-label="${card.label}">${card.emoji}</span>
          <span class="card-label">${card.label}</span>
        </div>
      </div>
    `;

    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', `Carta ${index + 1}, coperta`);
    el.setAttribute('tabindex', '0');

    el.addEventListener('click', () => handleCardClick(el));
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleCardClick(el);
      }
    });

    grid.appendChild(el);
  });
}

/**
 * Gestisce il click su una carta del memory.
 * @param {HTMLElement} card
 */
function handleCardClick(card) {
  if (memoryState.locked) return;
  if (card.classList.contains('flipped')) return;
  if (card.classList.contains('matched')) return;
  if (memoryState.flipped.length >= 2) return;

  // Gira la carta
  card.classList.add('flipped');
  card.setAttribute('aria-label', `Carta ${card.dataset.emoji || card.dataset.id}, girata`);
  memoryState.flipped.push(card);

  if (memoryState.flipped.length === 2) {
    memoryState.moves++;
    document.getElementById('move-count').textContent = memoryState.moves;
    memoryState.locked = true;
    checkMemoryMatch();
  }
}

/**
 * Verifica se le due carte girate formano una coppia.
 */
function checkMemoryMatch() {
  const [a, b] = memoryState.flipped;

  if (a.dataset.id === b.dataset.id) {
    // Coppia trovata!
    a.classList.add('matched');
    b.classList.add('matched');
    memoryState.matched.push(a.dataset.id);

    const pairCount = document.getElementById('pair-count');
    pairCount.textContent = memoryState.matched.length;

    memoryState.flipped = [];
    memoryState.locked  = false;

    // Controlla se il gioco è completato
    if (memoryState.matched.length === MEMORY_PAIRS.length) {
      setTimeout(() => {
        showFeedback('feedback2', `🎉 Perfetto! Hai trovato tutte le coppie in ${memoryState.moves} mosse!`, 'success');
        setTimeout(() => {
          hideFeedback('feedback2');
          revealClue('clue2', null);
        }, 1200);
      }, 400);
    }
  } else {
    // Nessuna coppia: rigira le carte dopo un ritardo
    setTimeout(() => {
      a.classList.remove('flipped');
      b.classList.remove('flipped');
      memoryState.flipped = [];
      memoryState.locked  = false;
    }, 1000);
  }
}

/* =====================================================
   6. FASE 3 — INDOVINELLO A SCELTA MULTIPLA
   ===================================================== */

function initPhase3() {
  const options = document.querySelectorAll('.riddle-btn');
  options.forEach(btn => {
    btn.addEventListener('click', () => handleRiddleAnswer(btn));
    btn.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleRiddleAnswer(btn);
      }
    });
  });
}

/**
 * Gestisce la scelta dell'utente nell'indovinello.
 * @param {HTMLElement} btn - bottone cliccato
 */
function handleRiddleAnswer(btn) {
  // Evita doppie risposte
  const options = document.querySelectorAll('.riddle-btn');
  options.forEach(b => b.disabled = true);

  if (btn.dataset.value === 'torre') {
    // Risposta corretta
    btn.classList.add('correct');
    hideFeedback('feedback3');
    setTimeout(() => revealClue('clue3', 'enigma3'), 500);
  } else {
    // Risposta errata — evidenzia in rosso e riabilita dopo un secondo
    btn.classList.add('wrong');
    showFeedback('feedback3', '❌ Non esatto. Rileggi l\'indizio e riprova!', 'error');
    setTimeout(() => {
      btn.classList.remove('wrong');
      options.forEach(b => {
        b.disabled = false;
      });
      hideFeedback('feedback3');
    }, 1500);
  }
}

/* =====================================================
   7. REVEAL FINALE + CORIANDOLI
   ===================================================== */

/**
 * Mostra l'indizio sbloccato e nasconde l'enigma.
 * @param {string} clueId   - id dell'elemento .clue-reveal
 * @param {string|null} enigmaId - id dell'enigma da nascondere (o null)
 */
function revealClue(clueId, enigmaId) {
  if (enigmaId) {
    const enigma = document.getElementById(enigmaId);
    if (enigma) {
      enigma.style.transition = 'opacity 0.4s ease';
      enigma.style.opacity = '0';
      setTimeout(() => enigma.classList.add('hidden'), 400);
    }
  }

  const clue = document.getElementById(clueId);
  if (!clue) return;
  clue.classList.remove('hidden');

  // Forza animazione
  clue.style.opacity = '0';
  clue.style.transform = 'translateY(20px)';
  clue.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      clue.style.opacity = '1';
      clue.style.transform = 'translateY(0)';
    });
  });
}

/**
 * Avvia l'animazione di coriandoli canvas.
 */
function launchConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;

  const ctx    = canvas.getContext('2d');
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  // Rispetta prefers-reduced-motion
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return;

  // Palette colori coriandoli
  const COLORS = [
    '#B8933A', '#D4AA55', '#C05A3A', '#4A5C3A',
    '#6B7D58', '#7A5230', '#F5F0E8', '#D4714F'
  ];

  const PARTICLE_COUNT = 140;
  const particles = [];

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push({
      x:      Math.random() * canvas.width,
      y:      Math.random() * canvas.height - canvas.height,
      w:      6 + Math.random() * 8,
      h:      4 + Math.random() * 4,
      color:  COLORS[Math.floor(Math.random() * COLORS.length)],
      angle:  Math.random() * Math.PI * 2,
      spin:   (Math.random() - 0.5) * 0.25,
      vx:     (Math.random() - 0.5) * 2,
      vy:     2 + Math.random() * 4,
      opacity:  0.7 + Math.random() * 0.3,
    });
  }

  let frame;
  let elapsed = 0;
  const DURATION = 5000; // ms

  function draw(ts) {
    elapsed += 16;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach(p => {
      p.x    += p.vx;
      p.y    += p.vy;
      p.vy   *= 1.008; // accelerazione gravitazionale lieve
      p.angle += p.spin;

      // Fade out verso la fine dell'animazione
      if (elapsed > DURATION * 0.6) {
        p.opacity = Math.max(0, p.opacity - 0.008);
      }

      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();

      // Riporta in cima se esce dal basso
      if (p.y > canvas.height + 20) {
        p.y = -20;
        p.x = Math.random() * canvas.width;
      }
    });

    if (elapsed < DURATION) {
      frame = requestAnimationFrame(draw);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.style.display = 'none';
    }
  }

  frame = requestAnimationFrame(draw);

  // Ridimensionamento canvas responsive
  function resizeCanvas() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeCanvas, { once: true });
}

/* =====================================================
   8. INIT — Collegamento eventi e avvio
   ===================================================== */

document.addEventListener('DOMContentLoaded', () => {

  /* ——— INTRO → FASE 1 ——— */
  document.getElementById('btn-start').addEventListener('click', () => {
    goToScreen('screen-intro', 'screen-phase1');
    updateProgress(1);
  });

  /* ——— FASE 1 init ——— */
  initPhase1();

  /* ——— FASE 1 → FASE 2 ——— */
  document.getElementById('btn-next1').addEventListener('click', () => {
    goToScreen('screen-phase1', 'screen-phase2');
    updateProgress(2);
    // Inizializza il memory solo ora (così si può giocare "fresco")
    buildMemoryGrid();
    memoryState = { flipped: [], matched: [], moves: 0, locked: false };
    document.getElementById('move-count').textContent = '0';
    document.getElementById('pair-count').textContent = '0';
  });

  /* ——— FASE 2 → FASE 3 ——— */
  document.getElementById('btn-next2').addEventListener('click', () => {
    goToScreen('screen-phase2', 'screen-phase3');
    updateProgress(3);
  });

  /* ——— FASE 3 init ——— */
  initPhase3();

  /* ——— FASE 3 → SVELAMENTO ——— */
  document.getElementById('btn-reveal').addEventListener('click', () => {
    goToScreen('screen-phase3', 'screen-reveal');
    // Nascondi progress bar nella schermata finale
    const bar = document.getElementById('progress-bar');
    if (bar) bar.classList.add('hidden');
    // Lancia coriandoli dopo un breve ritardo (aspetta che la schermata sia visibile)
    setTimeout(launchConfetti, 400);
  });

  /* ——— Accessibilità: focus trap non necessario (SPA lineare),
         ma aggiungiamo tabindex e aria alle card dinamiche ——— */

  /* ——— Resize gestione canvas ——— */
  window.addEventListener('resize', () => {
    const canvas = document.getElementById('confetti-canvas');
    if (canvas && canvas.style.display !== 'none') {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    }
  });

});
