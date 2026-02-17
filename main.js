import { Circuit } from './circuit.js';
import { SoundManager } from './sounds.js';

const canvas = document.getElementById('circuit-canvas');
const ctx = canvas.getContext('2d');
const interactionLayer = document.getElementById('interaction-layer');
const statusIndicator = document.getElementById('circuit-status');
const hintText = document.getElementById('hint-text');

let circuit = new Circuit();
let sounds = new SoundManager();
let currentLevel = 1;
let terminals = []; // { id, x, y, type, label }
let wires = []; // { startId, endId, color }
let switches = []; // { id, state: boolean, t1, t2, is3Way, t3 }
let lightBulb = { inputId: null, outputId: null, lit: false, x: 0, y: 0 };
let dragStart = null;
let mousePos = { x: 0, y: 0 };

const hintCanvas = document.getElementById('hint-canvas');
const hctx = hintCanvas?.getContext('2d');
const toggleHintBtn = document.getElementById('toggle-hint');
const hintVisual = document.getElementById('hint-visual');
const toggleMuteBtn = document.getElementById('toggle-mute');

const COLORS = {
    hot: '#111111',
    neutral: '#eeeeee',
    ground: '#b87333',
    traveler: '#cc0000'
};

function init() {
    resize();
    window.addEventListener('resize', resize);

    // Initialize sounds on first interaction
    const initAudio = () => {
        sounds.init();
        window.removeEventListener('click', initAudio);
        window.removeEventListener('mousedown', initAudio);
    };
    window.addEventListener('click', initAudio);
    window.addEventListener('mousedown', initAudio);

    document.getElementById('reset-circuit').addEventListener('click', () => {
        wires = [];
        sounds.playReset();
        checkCircuit();
    });

    toggleMuteBtn?.addEventListener('click', () => {
        const isMuted = sounds.toggleMute();
        toggleMuteBtn.innerText = isMuted ? '🔇' : '🔊';
        toggleMuteBtn.style.opacity = isMuted ? '0.5' : '1';
    });

    window.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mousePos.x = e.clientX - rect.left;
        mousePos.y = e.clientY - rect.top;
    });

    window.addEventListener('mouseup', () => {
        dragStart = null;
    });

    toggleHintBtn?.addEventListener('click', () => {
        hintVisual.classList.toggle('hidden');
        sounds.playClick();
        if (!hintVisual.classList.contains('hidden')) {
            drawHint();
        }
    });

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            sounds.playClick();
            loadLevel(parseInt(e.target.dataset.level));
        });
    });

    loadLevel(1);
    animate();
}

function resize() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;

    // Also resize hint canvas
    if (hintCanvas) {
        hintCanvas.width = hintCanvas.parentElement.clientWidth;
        hintCanvas.height = 150;
        if (!hintVisual.classList.contains('hidden')) {
            drawHint();
        }
    }
}

function loadLevel(level) {
    currentLevel = level;
    terminals = [];
    wires = [];
    switches = [];
    interactionLayer.innerHTML = '';
    circuit = new Circuit();
    if (hintVisual && !hintVisual.classList.contains('hidden')) {
        drawHint();
    }

    const w = canvas.width;
    const h = canvas.height;

    if (level === 1) {
        hintText.innerText = "Level 1: Standard Single Pole. Switch power to the light.";
        addTerminal(w * 0.1, h * 0.3, 'power-hot', 'Hot (L)');
        addTerminal(w * 0.1, h * 0.7, 'power-neutral', 'Neutral (N)');
        const swY = h * 0.5;
        addTerminal(w * 0.45, swY - 30, 'sw1-t1', 'L1');
        addTerminal(w * 0.45, swY + 30, 'sw1-t2', 'L2');
        addSwitch('sw1', 'sw1-t1', 'sw1-t2', w * 0.45, swY);
        addTerminal(w * 0.8, h * 0.4, 'light-in', 'L');
        addTerminal(w * 0.8, h * 0.6, 'light-out', 'N');
        lightBulb = { inputId: 'light-in', outputId: 'light-out', lit: false, x: w * 0.8, y: h * 0.5 };
    }
    else if (level === 2) {
        hintText.innerText = "Level 2: The Switch Loop. Power enters at the light first.";
        addTerminal(w * 0.8, h * 0.2, 'power-hot', 'Hot (L)');
        addTerminal(w * 0.8, h * 0.3, 'power-neutral', 'Neutral (N)');
        addTerminal(w * 0.8, h * 0.5, 'light-in', 'L');
        addTerminal(w * 0.8, h * 0.7, 'light-out', 'N');
        lightBulb = { inputId: 'light-in', outputId: 'light-out', lit: false, x: w * 0.8, y: h * 0.6 };
        const swY = h * 0.5;
        addTerminal(w * 0.2, swY - 30, 'sw1-t1', 'L1');
        addTerminal(w * 0.2, swY + 30, 'sw1-t2', 'L2');
        addSwitch('sw1', 'sw1-t1', 'sw1-t2', w * 0.2, swY);
    }
    else if (level === 3) {
        hintText.innerText = "Level 3: 3-Way Switching. Two switches, one light.";
        addTerminal(w * 0.05, h * 0.3, 'power-hot', 'Hot (L)');
        addTerminal(w * 0.05, h * 0.7, 'power-neutral', 'Neutral (N)');
        addTerminal(w * 0.3, h * 0.35, 'sw1-com', 'COM');
        addTerminal(w * 0.3, h * 0.5, 'sw1-t1', 'TRAV1');
        addTerminal(w * 0.3, h * 0.65, 'sw1-t2', 'TRAV2');
        addSwitch('sw1', 'sw1-com', 'sw1-t1', w * 0.3, h * 0.5, true);
        addTerminal(w * 0.6, h * 0.35, 'sw2-com', 'COM');
        addTerminal(w * 0.6, h * 0.5, 'sw2-t1', 'TRAV1');
        addTerminal(w * 0.6, h * 0.65, 'sw2-t2', 'TRAV2');
        addSwitch('sw2', 'sw2-com', 'sw2-t1', w * 0.6, h * 0.5, true);
        addTerminal(w * 0.9, h * 0.4, 'light-in', 'L');
        addTerminal(w * 0.9, h * 0.6, 'light-out', 'N');
        lightBulb = { inputId: 'light-in', outputId: 'light-out', lit: false, x: w * 0.9, y: h * 0.5 };
    }

    checkCircuit();
}

function addTerminal(x, y, id, label) {
    const term = document.createElement('div');
    term.className = 'terminal';
    term.id = `term-${id}`;
    term.dataset.id = id;
    term.dataset.label = label || id.split('-').pop().toUpperCase();
    term.style.left = `${x - 12}px`;
    term.style.top = `${y - 12}px`;

    if (id.includes('hot')) term.dataset.type = 'hot';
    else if (id.includes('neutral')) term.dataset.type = 'neutral';
    else if (id.includes('ground')) term.dataset.type = 'ground';
    else if (id.includes('-t') || id.includes('trav') || id.includes('com')) term.dataset.type = 'traveler';

    term.addEventListener('mousedown', (e) => {
        dragStart = { id, x, y };
        sounds.playClick();
        e.stopPropagation();
        e.preventDefault();
    });

    term.addEventListener('mouseup', (e) => {
        if (dragStart && dragStart.id !== id) {
            connect(dragStart.id, id);
        }
        dragStart = null;
        e.stopPropagation();
    });

    interactionLayer.appendChild(term);
    terminals.push({ id, x, y, label: term.dataset.label });
}

function addSwitch(id, t1, t2, x, y, is3Way = false) {
    const swEl = document.createElement('div');
    swEl.className = 'switch-visual' + (is3Way ? ' three-way' : '');
    swEl.style.left = `${x - 30}px`;
    swEl.style.top = `${y - 50}px`;
    swEl.innerHTML = `<div class="toggle"></div><div class="sw-label">${is3Way ? '3-WAY' : 'SPST'}</div>`;

    swEl.addEventListener('click', () => {
        const sw = switches.find(s => s.id === id);
        sw.state = !sw.state;
        swEl.classList.toggle('on', sw.state);
        sounds.playToggle(sw.state);
        checkCircuit();
    });

    interactionLayer.appendChild(swEl);
    switches.push({ id, state: false, t1, t2, is3Way, t3: is3Way ? (id + '-t2') : null });
}

function connect(id1, id2) {
    let color = COLORS.hot;
    if (id1.includes('neutral') || id2.includes('neutral')) color = COLORS.neutral;
    else if (id1.includes('ground') || id2.includes('ground')) color = COLORS.ground;
    else if (id1.includes('trav') || id2.includes('trav') || id1.includes('-t') || id2.includes('-t')) color = COLORS.traveler;

    wires.push({ startId: id1, endId: id2, color });
    sounds.playConnect();
    checkCircuit();
}

function checkCircuit() {
    circuit.reset();
    terminals.forEach(t => circuit.addTerminal(t.id));

    wires.forEach(w => circuit.connect(w.startId, w.endId, w.color));

    switches.forEach(sw => {
        if (!sw.is3Way) {
            if (sw.state) circuit.connect(sw.t1, sw.t2, COLORS.hot);
        } else {
            if (!sw.state) circuit.connect(sw.t1, sw.t2, COLORS.traveler);
            else circuit.connect(sw.t1, sw.t3, COLORS.traveler);
        }
    });

    const loadNodes = new Set();
    if (lightBulb.inputId) loadNodes.add(lightBulb.inputId);
    if (lightBulb.outputId) loadNodes.add(lightBulb.outputId);

    const analysis = circuit.analyzeCircuit(
        'power-hot',
        'power-neutral',
        lightBulb.inputId,
        lightBulb.outputId,
        new Set(),
        loadNodes
    );

    const wasLit = lightBulb.lit;
    lightBulb.lit = analysis.isPowered;

    if (lightBulb.lit && !wasLit && analysis.severity === 'success') {
        sounds.playSuccess();
    } else if (analysis.severity === 'danger') {
        sounds.playDanger();
    }

    updateStatus(analysis);
}

function updateStatus(analysis) {
    statusIndicator.className = `status-indicator ${analysis.severity}`;
    const pulseColor = analysis.severity === 'danger' ? 'red' :
        analysis.severity === 'success' ? 'green' :
            analysis.severity === 'warning' ? 'gold' : 'blue';

    statusIndicator.innerHTML = `<span class="pulse ${pulseColor}"></span> ${analysis.message.split('!')[0]}`;

    let feedbackEl = document.querySelector('.feedback-msg');
    if (!feedbackEl) {
        feedbackEl = document.createElement('div');
        feedbackEl.className = 'feedback-msg';
        document.querySelector('.inspector-content').appendChild(feedbackEl);
    }
    feedbackEl.className = `feedback-msg ${analysis.severity}`;
    feedbackEl.innerText = analysis.message;
}

function drawHint() {
    if (!hctx) return;
    hctx.clearRect(0, 0, hintCanvas.width, hintCanvas.height);

    const w = hintCanvas.width;
    const h = hintCanvas.height;

    // Draw background guide lines
    hctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    hctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
        hctx.beginPath();
        hctx.moveTo(0, h * (i / 4));
        hctx.lineTo(w, h * (i / 4));
        hctx.stroke();
    }

    // Mini schematic drawing logic
    if (currentLevel === 1) {
        // Level 1: Standard Single Pole
        // Path: HOT -> SW -> BULB -> NTR
        drawMiniLine(w * 0.1, h * 0.5, w * 0.35, h * 0.5, COLORS.hot);
        drawMiniSwitch(w * 0.45, h * 0.5, false); // Switch
        drawMiniLine(w * 0.55, h * 0.5, w * 0.7, h * 0.5, COLORS.hot);
        drawMiniBulb(w * 0.75, h * 0.5);
        drawMiniLine(w * 0.8, h * 0.5, w * 0.95, h * 0.5, COLORS.neutral);

        drawLabel(w * 0.1, h * 0.4, "HOT");
        drawLabel(w * 0.95, h * 0.4, "NUTR");
    } else if (currentLevel === 2) {
        // Level 2: Switch Loop
        // PWR enters at Lamp box
        drawMiniLine(w * 0.75, h * 0.15, w * 0.75, h * 0.4, COLORS.hot); // Source Hot
        drawMiniLine(w * 0.75, h * 0.4, w * 0.3, h * 0.4, COLORS.hot); // Out to Sw
        drawMiniSwitch(w * 0.2, h * 0.5, false, true); // Vertical Sw
        drawMiniLine(w * 0.3, h * 0.6, w * 0.75, h * 0.6, COLORS.hot); // Return from Sw

        drawMiniBulb(w * 0.75, h * 0.5);
        drawMiniLine(w * 0.75, h * 0.6, w * 0.75, h * 0.85, COLORS.neutral); // Neutral

        drawLabel(w * 0.85, h * 0.15, "HOT");
        drawLabel(w * 0.85, h * 0.85, "NUTR");
        drawLabel(w * 0.2, h * 0.25, "SW LOOP");
    } else if (currentLevel === 3) {
        // Level 3: 3-Way
        // Path: HOT -> SW1 -> (Travelers) -> SW2 -> BULB -> NTR
        drawMiniLine(w * 0.05, h * 0.5, w * 0.15, h * 0.5, COLORS.hot);
        drawMiniSwitch(w * 0.22, h * 0.5, true); // SW1

        drawMiniLine(w * 0.29, h * 0.4, w * 0.46, h * 0.4, COLORS.traveler); // T1
        drawMiniLine(w * 0.29, h * 0.6, w * 0.46, h * 0.6, COLORS.traveler); // T2

        drawMiniSwitch(w * 0.53, h * 0.5, true); // SW2
        drawMiniLine(w * 0.6, h * 0.5, w * 0.68, h * 0.5, COLORS.hot);
        drawMiniBulb(w * 0.78, h * 0.5);
        drawMiniLine(w * 0.88, h * 0.5, w * 0.95, h * 0.5, COLORS.neutral);

        drawLabel(w * 0.375, h * 0.3, "TRAVELERS");
    }
}

function drawMiniSwitch(x, y, is3way = false, vertical = false) {
    const swW = vertical ? 24 : 40;
    const swH = vertical ? 40 : 24;

    hctx.fillStyle = '#1a1a1a';
    hctx.fillRect(x - swW / 2, y - swH / 2, swW, swH);
    hctx.strokeStyle = '#444';
    hctx.lineWidth = 1;
    hctx.strokeRect(x - swW / 2, y - swH / 2, swW, swH);

    // Toggle slot
    hctx.fillStyle = '#000';
    if (vertical) {
        hctx.fillRect(x - 2, y - 10, 4, 20);
    } else {
        hctx.fillRect(x - 10, y - 2, 20, 4);
    }

    // Terminals (Screws)
    const screwColor = '#d4af37'; // Gold/Brass
    if (is3way) {
        if (vertical) {
            drawMiniCircle(x, y - 15, 3, '#111'); // COM
            drawMiniCircle(x - 8, y + 15, 3, screwColor);
            drawMiniCircle(x + 8, y + 15, 3, screwColor);
        } else {
            drawMiniCircle(x - 15, y, 3, '#111'); // COM
            drawMiniCircle(x + 15, y - 8, 3, screwColor);
            drawMiniCircle(x + 15, y + 8, 3, screwColor);
        }
    } else {
        if (vertical) {
            drawMiniCircle(x, y - 15, 3, screwColor);
            drawMiniCircle(x, y + 15, 3, screwColor);
        } else {
            drawMiniCircle(x - 15, y, 3, screwColor);
            drawMiniCircle(x + 15, y, 3, screwColor);
        }
    }
}

function drawMiniBulb(x, y) {
    // Socket
    hctx.fillStyle = '#222';
    hctx.fillRect(x - 8, y + 4, 16, 8);

    // Bulb Glass
    hctx.beginPath();
    hctx.arc(x, y - 4, 12, 0, Math.PI * 2);
    const grad = hctx.createRadialGradient(x, y - 4, 2, x, y - 4, 12);
    grad.addColorStop(0, '#555');
    grad.addColorStop(1, '#333');
    hctx.fillStyle = grad;
    hctx.fill();
    hctx.strokeStyle = '#666';
    hctx.lineWidth = 1;
    hctx.stroke();

    // Filament
    hctx.beginPath();
    hctx.moveTo(x - 4, y - 4);
    hctx.bezierCurveTo(x - 4, y - 10, x + 4, y - 10, x + 4, y - 4);
    hctx.strokeStyle = '#888';
    hctx.stroke();
}

function drawLabel(x, y, text) {
    hctx.fillStyle = '#aaa';
    hctx.font = '700 8px "Outfit", sans-serif';
    hctx.textAlign = 'center';
    hctx.fillText(text, x, y);
}

function drawMiniLine(x1, y1, x2, y2, color) {
    hctx.beginPath();
    hctx.moveTo(x1, y1);
    hctx.lineTo(x2, y2);

    // Subtle glow/outline for visibility
    hctx.shadowBlur = 4;
    hctx.shadowColor = 'rgba(255, 255, 255, 0.2)';
    hctx.strokeStyle = color === '#111111' ? '#444' : color;
    hctx.lineWidth = 3.5;
    hctx.lineCap = 'round';
    hctx.stroke();
    hctx.shadowBlur = 0;
}

function drawMiniCircle(x, y, r, color) {
    hctx.beginPath();
    hctx.arc(x, y, r, 0, Math.PI * 2);
    hctx.fillStyle = color;
    hctx.fill();
    hctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    hctx.lineWidth = 0.5;
    hctx.stroke();
}

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (dragStart) {
        ctx.beginPath();
        ctx.setLineDash([10, 5]);
        ctx.moveTo(dragStart.x, dragStart.y);
        ctx.lineTo(mousePos.x, mousePos.y);
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.5)';
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.setLineDash([]);
    }

    wires.forEach(w => {
        const t1 = terminals.find(t => t.id === w.startId);
        const t2 = terminals.find(t => t.id === w.endId);
        if (t1 && t2) {
            ctx.beginPath();
            ctx.moveTo(t1.x, t1.y);
            const cp1x = t1.x + (t2.x - t1.x) / 2;
            const cp2x = t1.x + (t2.x - t1.x) / 2;
            ctx.bezierCurveTo(cp1x, t1.y, cp2x, t2.y, t2.x, t2.y);
            ctx.strokeStyle = w.color;
            ctx.lineWidth = 6;
            ctx.lineCap = 'round';
            ctx.stroke();

            if (lightBulb.lit && w.color !== COLORS.neutral) {
                ctx.strokeStyle = 'rgba(0, 229, 255, 0.2)';
                ctx.lineWidth = 12;
                ctx.stroke();
            }
        }
    });

    if (lightBulb.inputId) {
        ctx.beginPath();
        const bulbY = lightBulb.y;
        ctx.arc(lightBulb.x, bulbY, 40, 0, Math.PI * 2);
        ctx.fillStyle = lightBulb.lit ? 'rgba(255, 215, 0, 0.8)' : '#222';
        if (lightBulb.lit) {
            ctx.shadowBlur = 50;
            ctx.shadowColor = 'rgba(255, 215, 0, 0.6)';
        }
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    requestAnimationFrame(animate);
}

const stylePatch = document.createElement('style');
stylePatch.innerHTML = `
    .switch-visual {
        position: absolute; width: 60px; height: 100px;
        background: #222; border: 2px solid #555; border-radius: 8px;
        cursor: pointer; display: flex; flex-direction: column;
        justify-content: center; align-items: center; pointer-events: auto;
        box-shadow: 0 4px 15px rgba(0,0,0,0.6);
        background-image: 
            radial-gradient(circle at 10% 10%, #444 1px, transparent 1px),
            radial-gradient(circle at 90% 10%, #444 1px, transparent 1px),
            radial-gradient(circle at 10% 90%, #444 1px, transparent 1px),
            radial-gradient(circle at 90% 90%, #444 1px, transparent 1px);
    }
    .switch-visual .toggle {
        width: 28px; height: 54px; background: #333; border: 1px solid #444;
        border-radius: 4px; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        transform: translateY(14px);
    }
    .switch-visual.on .toggle {
        background: var(--accent-blue); transform: translateY(-14px);
        box-shadow: 0 0 25px var(--accent-blue);
    }
    .sw-label { font-size: 9px; color: var(--text-muted); margin-top: 8px; font-weight: 800; letter-spacing: 1px; }
    .three-way { border-color: #664400; }
`;
document.head.appendChild(stylePatch);

init();
