// /src/services/AudioService.js
class AudioService {
  constructor() {
    this.audioContext = null;
    this.isInitialized = false;
    this.audioCache = {};
    this.voices = [];
    this.synth = null;
    this.notificationBuffer = null;
    this.isSpeaking = false;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      if ('speechSynthesis' in window) {
        this.synth = window.speechSynthesis;
        // ✅ Timeout pour éviter un blocage si onvoiceschanged ne se déclenche jamais
        this.voices = await Promise.race([
          this.getVoices(),
          new Promise((resolve) =>
            setTimeout(() => resolve(this.synth.getVoices() || []), 1500)
          ),
        ]);
      }

      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

      // ✅ Débloquer l'AudioContext (Chrome/Safari le suspendent sans geste utilisateur)
      if (this.audioContext.state === 'suspended') {
        try {
          await this.audioContext.resume();
        } catch (e) {
          console.debug('Impossible de reprendre AudioContext:', e);
        }
      }

      this.isInitialized = true;

      // ✅ Précharger la notification en tâche de fond
      this.preloadNotification();
    } catch (error) {
      console.error('Erreur d\'initialisation audio:', error);
    }
  }

  getVoices() {
    return new Promise((resolve) => {
      const existing = window.speechSynthesis.getVoices();
      if (existing && existing.length > 0) {
        resolve(existing);
        return;
      }
      const handler = () => {
        window.speechSynthesis.onvoiceschanged = null;
        resolve(window.speechSynthesis.getVoices());
      };
      window.speechSynthesis.onvoiceschanged = handler;
    });
  }

  async preloadNotification() {
    if (this.notificationBuffer || !this.audioContext) return;
    try {
      const response = await fetch('/notification.mp3');
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const arrayBuffer = await response.arrayBuffer();
      this.notificationBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    } catch (error) {
      console.debug('Notification non préchargée:', error);
    }
  }

  async loadAudio(url) {
    if (this.audioCache[url]) {
      return this.audioCache[url];
    }

    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this.audioCache[url] = audioBuffer;
      return audioBuffer;
    } catch (error) {
      console.error('Erreur de chargement audio:', error);
      return null;
    }
  }

  // ✅ Notification via AudioBuffer (zéro latence réseau/décodage)
  playNotificationAudio() {
    return new Promise((resolve) => {
      try {
        if (this.audioContext && this.notificationBuffer) {
          const src = this.audioContext.createBufferSource();
          src.buffer = this.notificationBuffer;
          src.connect(this.audioContext.destination);
          src.onended = () => resolve();
          src.start(0);
          return;
        }

        // Fallback : fichier HTML5 (si le buffer n'a pas pu être chargé)
        const audio = new Audio('/notification.mp3');
        audio.onended = () => resolve();
        audio.onerror = () => {
          this.playBeep();
          resolve();
        };
        audio.play().catch(() => {
          this.playBeep();
          resolve();
        });
      } catch (error) {
        this.playBeep();
        resolve();
      }
    });
  }

  async playNotification() {
    try {
      await this.initialize();
      // ✅ Si le buffer n'est pas prêt, tenter un chargement rapide
      if (!this.notificationBuffer) {
        await this.preloadNotification();
      }
      await this.playNotificationAudio();
    } catch (error) {
      console.debug('Erreur notification:', error);
      this.playBeep();
    }
  }

  playBeep() {
    try {
      const ctx = this.audioContext;
      if (!ctx) return;

      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.frequency.value = 800;
      osc1.type = 'sine';
      gain1.gain.setValueAtTime(0.3, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.2);
    } catch (e) {
      console.debug('Audio play error:', e);
    }
  }

  // ✅ Construit l'utterance avec la meilleure voix française disponible
  buildUtterance(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.rate = 0.95;   // ✅ Plus naturel que 0.9 (perçu comme plus réactif)
    utterance.pitch = 1;
    utterance.volume = 1;

    const frenchVoices = this.voices.filter(
      (voice) =>
        voice.lang.startsWith('fr') ||
        voice.name.toLowerCase().includes('french') ||
        voice.name.toLowerCase().includes('fr')
    );

    const preferredVoice =
      frenchVoices.find(
        (voice) =>
          voice.name.includes('Google') ||
          voice.name.includes('Natural') ||
          voice.name.includes('Samantha') ||
          voice.name.includes('Thomas')
      ) || frenchVoices[0];

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    return utterance;
  }

  // ✅ Announce avec démarrage de la voix PENDANT le bip (masque l'init du moteur TTS)
  async announceTicket(ticketNumber, employeeNumber) {
    try {
      await this.initialize();
      if (!this.synth) return;

      // S'assurer que le buffer de notification est prêt avant de commencer
      if (!this.notificationBuffer) {
        await this.preloadNotification();
      }

      const message = `Le ticket numéro ${ticketNumber} est appelé à la place numéro ${employeeNumber}. Merci de vous présenter à la place ${employeeNumber}`;

      // ✅ Préparer l'utterance
      const utterance = this.buildUtterance(message);

      // ✅ Lancer speak() IMMÉDIATEMENT : le moteur TTS s'initialise
      //    pendant que le bip joue → la voix démarre sans délai perceptible.
      //    ⚠️ NE PAS appeler this.synth.cancel() ici : cancel() force un reset
      //    asynchrone du moteur qui ajoute 200-500 ms de latence.
      const speakPromise = new Promise((resolve) => {
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        this.synth.speak(utterance);
      });

      // ✅ Jouer la notification en parallèle (elle démarre quasi instantanément
      //    car le buffer est préchargé)
      await this.playNotification();

      // ✅ Attendre la fin de l'annonce vocale
      await speakPromise;
    } catch (error) {
      console.error('Erreur d\'annonce vocale:', error);
    }
  }

  // ✅ Version simple : bip puis voix (sans chevauchement)
  async announceTicketSimple(ticketNumber, employeeNumber) {
    try {
      await this.initialize();
      if (!this.synth) return;

      if (!this.notificationBuffer) {
        await this.preloadNotification();
      }

      // 1. Notification et attendre sa fin
      await this.playNotification();

      // 2. Annonce vocale
      const message = `Le ticket numéro ${ticketNumber} est appelé à la place numéro ${employeeNumber}. Merci de vous présenter à la place ${employeeNumber}`;
      const utterance = this.buildUtterance(message);

      // ⚠️ Pas de cancel() ici → évite la latence de reset du moteur
      return new Promise((resolve) => {
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        this.synth.speak(utterance);
      });
    } catch (error) {
      console.error('Erreur d\'annonce vocale:', error);
    }
  }
}

export const audioService = new AudioService();
