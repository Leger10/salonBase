// /src/services/AudioService.js
class AudioService {
  constructor() {
    this.audioContext = null;
    this.isInitialized = false;
    this.audioCache = {};
    this.voices = [];
    this.synth = null;
  }

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      if ('speechSynthesis' in window) {
        this.synth = window.speechSynthesis;
        this.voices = await this.getVoices();
      }
      
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.isInitialized = true;
    } catch (error) {
      console.error('Erreur d\'initialisation audio:', error);
    }
  }

  getVoices() {
    return new Promise((resolve) => {
      if (window.speechSynthesis.getVoices().length > 0) {
        resolve(window.speechSynthesis.getVoices());
      } else {
        window.speechSynthesis.onvoiceschanged = () => {
          resolve(window.speechSynthesis.getVoices());
        };
      }
    });
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

  // ✅ Fonction pour jouer la notification et attendre la fin
  playNotificationAudio() {
    return new Promise((resolve, reject) => {
      try {
        const audio = new Audio('/notification.mp3');
        audio.onended = () => resolve();
        audio.onerror = () => {
          // Fallback si le fichier n'existe pas
          this.playBeep();
          resolve();
        };
        audio.play().catch(() => {
          // Fallback si la lecture échoue
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
      // ✅ Utiliser l'API Audio HTML5 pour un meilleur contrôle
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

  // ✅ Version SANS AUCUNE PAUSE - Enchaînement parfait
  async announceTicket(ticketNumber, employeeNumber) {
    try {
      await this.initialize();
      
      // 1. Jouer la notification et ATTENDRE sa fin
      await this.playNotification();
      
      // 2. ✅ AUCUNE PAUSE - Lancement immédiat de l'annonce
      // Dès que le son se termine, l'annonce commence
      
      if (this.synth) {
        this.synth.cancel();
        
        const message = `Le ticket numéro ${ticketNumber} est appelé à la place numéro ${employeeNumber}. Merci de vous présenter à la place ${employeeNumber}`;
        
        const speakNaturally = (text) => {
          return new Promise((resolve) => {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'fr-FR';
            utterance.rate = 0.9;
            utterance.pitch = 1;
            utterance.volume = 1;
            
            const frenchVoices = this.voices.filter(voice => 
              voice.lang.startsWith('fr') || 
              voice.name.toLowerCase().includes('french') ||
              voice.name.toLowerCase().includes('fr')
            );
            
            const preferredVoice = frenchVoices.find(voice => 
              voice.name.includes('Google') || 
              voice.name.includes('Natural') ||
              voice.name.includes('Samantha') ||
              voice.name.includes('Thomas')
            ) || frenchVoices[0];
            
            if (preferredVoice) {
              utterance.voice = preferredVoice;
            }
            
            utterance.onend = () => resolve();
            utterance.onerror = () => resolve();
            this.synth.speak(utterance);
          });
        };

        // ✅ Annonce 2 fois avec pause de 1.2s entre les deux
        await speakNaturally(message);
        await new Promise(resolve => setTimeout(resolve, 1200));
        await speakNaturally(message);
      }
    } catch (error) {
      console.error('Erreur d\'annonce vocale:', error);
    }
  }

  // ✅ Version alternative avec annonce unique
  async announceTicketSimple(ticketNumber, employeeNumber) {
    try {
      await this.initialize();
      
      await this.playNotification();
      
      if (this.synth) {
        this.synth.cancel();
        
        const message = `Le ticket numéro ${ticketNumber} est appelé à la place numéro ${employeeNumber}. Merci de vous présenter à la place ${employeeNumber}`;
        
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.lang = 'fr-FR';
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 1;
        
        const frenchVoices = this.voices.filter(voice => 
          voice.lang.startsWith('fr') || 
          voice.name.toLowerCase().includes('french') ||
          voice.name.toLowerCase().includes('fr')
        );
        
        const preferredVoice = frenchVoices.find(voice => 
          voice.name.includes('Google') || 
          voice.name.includes('Natural') ||
          voice.name.includes('Samantha')
        ) || frenchVoices[0];
        
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }
        
        return new Promise((resolve) => {
          utterance.onend = () => resolve();
          utterance.onerror = () => resolve();
          this.synth.speak(utterance);
        });
      }
    } catch (error) {
      console.error('Erreur d\'annonce vocale:', error);
    }
  }
}

export const audioService = new AudioService();