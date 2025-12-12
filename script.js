/* script.js - CORRECTED VERSION */

// --- AUDIO ENGINE ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

const Sound = {
    playTone: (freq, type, duration) => {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    },
    collect: () => {
        Sound.playTone(800, 'sine', 0.1);
        setTimeout(() => Sound.playTone(1200, 'sine', 0.2), 50);
    },
    damage: () => {
        Sound.playTone(150, 'sawtooth', 0.3);
        Sound.playTone(100, 'square', 0.3);
    },
    shield: () => {
        Sound.playTone(400, 'sine', 0.2);
        Sound.playTone(600, 'sine', 0.2);
        Sound.playTone(800, 'sine', 0.4);
    },
    gameover: () => {
        Sound.playTone(300, 'sawtooth', 0.5);
        setTimeout(() => Sound.playTone(200, 'sawtooth', 0.5), 400);
    }
};

// --- GAME LOGIC ---
const game = {
    active: false,
    score: 0,
    lives: 3,
    speed: 3,
    isShielded: false,
    elements: {}, // Will be filled when game loads

    init: function () {
        // FIX: Find elements only after page loads to prevent errors
        this.elements = {
            player: document.getElementById('player'),
            score: document.getElementById('score'),
            hearts: document.getElementById('hearts'),
            overlay: document.getElementById('overlay'),
            area: document.getElementById('game-area'),
            title: document.getElementById('title-text')
        };

        // Input Listeners
        document.addEventListener('mousemove', (e) => this.movePlayer(e.clientX));
        document.addEventListener('touchmove', (e) => this.movePlayer(e.touches[0].clientX), { passive: false });

        console.log("Game Initialized successfully");
    },

    start: function () {
        // Ensure audio is ready on first click
        if (audioCtx.state === 'suspended') audioCtx.resume();

        this.active = true;
        this.score = 0;
        this.lives = 3;
        this.speed = 4;
        this.isShielded = false;

        this.updateUI();
        this.elements.overlay.style.display = 'none';

        // Clear old items
        document.querySelectorAll('.item').forEach(el => el.remove());

        // Loops
        this.spawnLoop = setInterval(() => this.spawn(), 800);
        this.loop();
    },

    movePlayer: function (x) {
        if (!this.active) return;
        const limit = window.innerWidth;
        let pos = x;
        if (pos < 30) pos = 30;
        if (pos > limit - 30) pos = limit - 30;
        this.elements.player.style.left = pos + 'px';
    },

    spawn: function () {
        if (!this.active) return;
        const el = document.createElement('div');
        el.classList.add('item');

        const rand = Math.random();

        if (rand > 0.85) { // 15% Chance Shield
            el.textContent = '🛡️';
            el.dataset.type = 'shield';
            el.style.filter = "drop-shadow(0 0 10px #00ff00)";
        } else if (rand > 0.3) { // 55% Chance Star
            el.textContent = '⭐';
            el.dataset.type = 'good';
            el.style.filter = "drop-shadow(0 0 10px gold)";
        } else { // 30% Chance Meteor
            el.textContent = '☄️';
            el.dataset.type = 'bad';
            el.style.filter = "drop-shadow(0 0 10px red)";
        }

        el.style.left = Math.random() * (window.innerWidth - 50) + 'px';
        el.style.top = '-50px';
        this.elements.area.appendChild(el);
    },

    loop: function () {
        if (!this.active) return;

        const items = document.querySelectorAll('.item');
        const playerRect = this.elements.player.getBoundingClientRect();

        items.forEach(item => {
            let top = parseFloat(item.style.top || -50);
            top += this.speed;
            item.style.top = top + 'px';
            item.style.transform = `rotate(${top}deg)`;

            // Collision
            const itemRect = item.getBoundingClientRect();
            if (this.collide(playerRect, itemRect)) {
                this.handleHit(item);
            }

            // Remove if off screen
            if (top > window.innerHeight) item.remove();
        });

        // Increase difficulty slightly
        this.speed += 0.001;

        requestAnimationFrame(() => this.loop());
    },

    collide: function (r1, r2) {
        return !(r2.left > r1.right || r2.right < r1.left || r2.top > r1.bottom || r2.bottom < r1.top);
    },

    handleHit: function (item) {
        const type = item.dataset.type;
        const x = item.getBoundingClientRect().left;
        const y = item.getBoundingClientRect().top;
        item.remove();

        if (type === 'good') {
            this.score += 10;
            Sound.collect();
            this.showPopup(x, y, "+10", "#00d2ff");
        } else if (type === 'shield') {
            this.activateShield();
            Sound.shield();
            this.showPopup(x, y, "SHIELD!", "#00ff00");
        } else if (type === 'bad') {
            if (this.isShielded) {
                Sound.collect(); // Shield blocks it
                return;
            }
            Sound.damage();
            this.lives--;
            this.elements.area.classList.add('shake');
            setTimeout(() => this.elements.area.classList.remove('shake'), 500);

            if (this.lives <= 0) this.gameOver();
        }
        this.updateUI();
    },

    activateShield: function () {
        this.isShielded = true;
        this.elements.player.classList.add('shielded');
        setTimeout(() => {
            this.isShielded = false;
            this.elements.player.classList.remove('shielded');
        }, 5000); // 5 seconds shield
    },

    showPopup: function (x, y, text, color) {
        const el = document.createElement('div');
        el.classList.add('popup');
        el.innerText = text;
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        el.style.color = color;
        this.elements.area.appendChild(el);
        setTimeout(() => el.remove(), 800);
    },

    updateUI: function () {
        this.elements.score.innerText = this.score;
        this.elements.hearts.innerText = "❤️".repeat(this.lives);
    },

    gameOver: function () {
        this.active = false;
        Sound.gameover();
        clearInterval(this.spawnLoop);
        this.elements.title.innerText = "GAME OVER";
        this.elements.overlay.style.display = 'flex';
        // Reset text for next play
        document.querySelector('#tutorial').innerHTML = `Final Score: <span style="color:#fff; font-size: 2rem">${this.score}</span>`;
    }
};

// FIX: Wait for window load before starting
window.onload = () => game.init();