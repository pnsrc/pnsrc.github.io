import { DIALOGUE } from './voice-manifest.js?v=flight-4';

export { DIALOGUE };
export class VoiceBank {
  constructor(getContext, isEnabled) {
    this.getContext = getContext;
    this.isEnabled = isEnabled;
    this.buffers = new Map();
    this.source = null;
    this.ticket = 0;
    this.indices = new Map();
  }
  choices(character, event) { return DIALOGUE[character]?.[event] || []; }
  pick(character, event) {
    const choices = this.choices(character, event);
    const key = `${character}/${event}`;
    const index = this.indices.get(key) || 0;
    this.indices.set(key, index + 1);
    return choices[index % Math.max(choices.length, 1)]?.text || '';
  }
  clip(character, text) { return Object.values(DIALOGUE[character] || {}).flat().find(clip => clip.text === text); }
  async load(clip) {
    const context = this.getContext();
    if (!context) return null;
    if (!this.buffers.has(clip.src)) {
      this.buffers.set(clip.src, fetch(clip.src)
        .then(response => { if (!response.ok) throw new Error('voice unavailable'); return response.arrayBuffer(); })
        .then(bytes => context.decodeAudioData(bytes))
        .catch(() => { this.buffers.delete(clip.src); return null; }));
    }
    return this.buffers.get(clip.src);
  }
  warm(character) {
    if (!this.getContext()) return;
    const clips = ['start', 'special', 'jetpack', 'orbit'].flatMap(event => this.choices(character, event));
    for (const clip of clips) this.load(clip);
  }
  stop() {
    this.ticket++;
    try { this.source?.stop(); } catch {}
    this.source = null;
  }
  async speak(character, text) {
    this.stop();
    const ticket = this.ticket;
    const clip = this.clip(character, text);
    if (!clip || !this.isEnabled()) return;
    const context = this.getContext();
    if (!context) return;
    const buffer = await this.load(clip);
    if (!buffer || !this.isEnabled() || ticket !== this.ticket || context.state !== 'running') return;
    const source = context.createBufferSource();
    const gain = context.createGain();
    gain.gain.value = .82;
    source.buffer = buffer; source.connect(gain); gain.connect(context.destination);
    source.start(); this.source = source;
  }
}
