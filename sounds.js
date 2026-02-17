export class SoundManager {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.initialized = true;
    }

    toggleMute() {
        this.muted = !this.muted;
        return this.muted;
    }

    _play(freq, type, duration, volume, slide = 0) {
        if (this.muted || !this.initialized) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        if (slide !== 0) {
            osc.frequency.exponentialRampToValueAtTime(slide, this.ctx.currentTime + duration);
        }

        gain.gain.setValueAtTime(volume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    playClick() {
        this._play(800, 'square', 0.05, 0.1, 400);
    }

    playToggle(on) {
        if (on) {
            this._play(400, 'sine', 0.1, 0.2, 600);
        } else {
            this._play(600, 'sine', 0.1, 0.2, 400);
        }
    }

    playConnect() {
        this._play(300, 'triangle', 0.08, 0.2, 1200);
    }

    playSuccess() {
        const now = this.ctx.currentTime;
        this._note(523.25, 0.1, 0); // C5
        this._note(659.25, 0.1, 0.1); // E5
        this._note(783.99, 0.2, 0.2); // G5
    }

    playDanger() {
        this._play(150, 'sawtooth', 0.3, 0.15, 50);
    }

    playReset() {
        this._play(1000, 'sine', 0.2, 0.1, 100);
    }

    _note(freq, duration, delay) {
        if (this.muted || !this.initialized) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + delay);
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + delay + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(this.ctx.currentTime + delay);
        osc.stop(this.ctx.currentTime + delay + duration);
    }
}
