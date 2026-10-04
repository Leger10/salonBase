// /src/components/AudioPlayer.jsx
import React, { useState, useEffect } from 'react';

export default function AudioPlayer({ src, autoPlay = false, volume = 0.5 }) {
  const [audio, setAudio] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Créer l'audio avec un timestamp pour éviter le cache
    const audioInstance = new Audio();
    audioInstance.src = src + '?t=' + Date.now();
    audioInstance.volume = volume;
    
    audioInstance.addEventListener('ended', () => setIsPlaying(false));
    audioInstance.addEventListener('error', (e) => {
      console.debug('Audio error:', e);
      setError('Impossible de lire le son');
      // Tentative avec Web Audio API
      playFallbackSound();
    });
    
    setAudio(audioInstance);
    
    if (autoPlay) {
      play();
    }
    
    return () => {
      audioInstance.pause();
      audioInstance.src = '';
    };
  }, [src]);

  const play = () => {
    if (!audio) return;
    
    try {
      audio.currentTime = 0;
      const promise = audio.play();
      if (promise !== undefined) {
        promise.then(() => {
          setIsPlaying(true);
          setError(null);
        }).catch((err) => {
          console.debug('Audio play error:', err);
          playFallbackSound();
        });
      }
    } catch (err) {
      console.debug('Audio play error:', err);
      playFallbackSound();
    }
  };

  const playFallbackSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.2);
      setIsPlaying(true);
      setTimeout(() => setIsPlaying(false), 300);
    } catch (e) {
      setError('Audio non disponible');
    }
  };

  const stop = () => {
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      setIsPlaying(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={play}
        className="p-2 rounded-full hover:bg-muted/20 transition-colors"
        disabled={!!error}
      >
        {isPlaying ? (
          <span className="text-primary">🔊</span>
        ) : (
          <span className="text-muted-foreground">🔈</span>
        )}
      </button>
      {error && (
        <span className="text-xs text-red-500">⚠️</span>
      )}
    </div>
  );
}