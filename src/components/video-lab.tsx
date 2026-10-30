'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Volume2, VolumeX, Maximize, Check, MonitorUp } from 'lucide-react';
import { Brand } from './brand';
export function VideoLab() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const frame = useRef<HTMLElement>(null);
  const audio = useRef<AudioContext | null>(null);
  const oscillator = useRef<OscillatorNode | null>(null);
  const gain = useRef<GainNode | null>(null);
  const [sound, setSound] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let id = 0;
    const c = canvas.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    function draw(t: number) {
      if (!ctx || !c) return;
      const w = c.width,
        h = c.height;
      ctx.fillStyle = '#10291f';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#284d39';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 80) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 80) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      const colors = ['#c7fa79', '#a99cff', '#ffbb90', '#80cadd'];
      colors.forEach((color, i) => {
        ctx.fillStyle = color;
        const x = ((t * (0.24 + i * 0.09) + i * 320) % (w + 240)) - 120;
        ctx.beginPath();
        ctx.arc(x, 410 + i * 115, 48 - i * 4, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.fillStyle = '#f2f3e9';
      ctx.font = 'bold 84px monospace';
      ctx.fillText('mates. / motion test', 90, 135);
      ctx.font = '30px monospace';
      ctx.fillStyle = '#b5c4b8';
      ctx.fillText('1920 × 1080 • mouvement • texte • audio', 95, 195);
      ctx.fillStyle = '#c7fa79';
      ctx.font = 'bold 70px monospace';
      ctx.fillText(new Date().toISOString().slice(11, 23) + ' UTC', 95, 310);
      const flash = Math.floor(t / 1000) % 2 === 0;
      ctx.fillStyle = flash ? '#f9f8ea' : '#152f24';
      ctx.fillRect(1590, 220, 190, 190);
      ctx.fillStyle = flash ? '#14281b' : '#b5c4b8';
      ctx.font = 'bold 30px monospace';
      ctx.fillText(flash ? 'TIC' : 'TAC', 1645, 330);
      ctx.fillStyle = '#f2f3e9';
      [30, 24, 18, 14].forEach((size, i) => {
        ctx.font = `${size}px monospace`;
        ctx.fillText(
          `${size}px  ABCDEFGHIJKLMNOPQRSTUVWXYZ  0123456789  { const mates = true; }`,
          95,
          865 + i * 46,
        );
      });
      ctx.fillStyle = '#c7fa79';
      ctx.fillRect(0, h - 12, ((t % 10000) / 10000) * w, 12);
      id = requestAnimationFrame(draw);
    }
    id = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(id);
  }, []);
  useEffect(
    () => () => {
      oscillator.current?.stop();
      void audio.current?.close();
    },
    [],
  );
  async function toggleAudio() {
    try {
      setError('');
      if (sound) {
        oscillator.current?.stop();
        oscillator.current = null;
        await audio.current?.close();
        audio.current = null;
        setSound(false);
        return;
      }
      const context = new AudioContext();
      audio.current = context;
      await context.resume();
      const o = context.createOscillator();
      const g = context.createGain();
      oscillator.current = o;
      gain.current = g;
      o.frequency.value = 440;
      g.gain.value = 0.025;
      o.connect(g);
      g.connect(context.destination);
      o.start();
      setSound(true);
    } catch {
      setError('Le son de test n’est pas disponible. Vérifie les permissions audio.');
    }
  }
  async function fullscreen() {
    try {
      await frame.current?.requestFullscreen();
    } catch {
      setError('Le plein écran n’est pas disponible.');
    }
  }
  return (
    <main className="lab-page">
      <header className="site-header wrap">
        <Brand />
        <Link href="/" className="text-link">
          <ArrowLeft size={16} /> Retour au studio
        </Link>
        <span className="version-pill">VIDEO LAB</span>
      </header>
      <section className="wrap lab-heading">
        <div>
          <span className="eyebrow">LA QUALITÉ SE VÉRIFIE</span>
          <h1>
            Du mouvement.
            <br />
            Pas du flou.
          </h1>
          <p className="muted">
            Partage cet onglet depuis ton salon pour tester l’image, le texte et le son.
          </p>
        </div>
        <button
          className={`button ${sound ? 'primary' : 'secondary'}`}
          onClick={() => void toggleAudio()}
        >
          {sound ? <VolumeX size={18} /> : <Volume2 size={18} />}{' '}
          {sound ? 'Couper la tonalité' : 'Activer la tonalité 440 Hz'}
        </button>
      </section>
      <section className="wrap test-canvas" ref={frame}>
        <canvas
          ref={canvas}
          width="1920"
          height="1080"
          aria-label="Mire vidéo animée avec horloge UTC et textes de différentes tailles"
        />
        <button
          className="icon-button"
          aria-label="Mire en plein écran"
          onClick={() => void fullscreen()}
        >
          <Maximize size={20} />
        </button>
      </section>
      {error && (
        <p className="error wrap" role="alert">
          {error}
        </p>
      )}
      <section className="wrap lab-instructions">
        <article>
          <MonitorUp size={22} />
          <h2>1. Partage cet onglet</h2>
          <p>
            Dans le salon, clique sur Partager l’écran. Choisis cet onglet et coche le partage
            audio.
          </p>
        </article>
        <article>
          <Check size={22} />
          <h2>2. Vérifie sur un autre appareil</h2>
          <p>
            Observe les mouvements et la lisibilité du texte. Compare l’horloge avec une horloge UTC
            synchronisée.
          </p>
        </article>
        <article>
          <Volume2 size={22} />
          <h2>3. Écoute et mesure</h2>
          <p>
            La tonalité vérifie le transport du son, pas sa synchronisation. Pour le décalage
            audio/vidéo, utilise une vidéo de clap. Exporte le CSV depuis le panneau Qualité.
          </p>
        </article>
      </section>
    </main>
  );
}
