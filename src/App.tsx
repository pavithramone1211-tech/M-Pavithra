import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipForward, SkipBack, Music as MusicIcon } from 'lucide-react';

const GRID_SIZE = 20;
const TICK_RATE = 150;
const INITIAL_SNAKE = [{ x: 10, y: 10 }];
const INITIAL_DIR = { x: 0, y: -1 };

// Dummy AI music updated to match the design strings
const TRACKS = [
  { id: 1, title: 'Silicon Soul', artist: 'AI Generation #102', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { id: 2, title: 'Midnight Protocol', artist: 'AI Generation #084', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  { id: 3, title: 'Binary Sunset', artist: 'AI Generation #219', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
];

function generateFood(snake: {x: number, y: number}[]) {
  let newFood;
  while (true) {
    newFood = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE)
    };
    if (!snake.some(s => s.x === newFood.x && s.y === newFood.y)) break;
  }
  return newFood;
}

export default function App() {
  // Game Engine Ref
  const engineRef = useRef({
    snake: INITIAL_SNAKE,
    dir: INITIAL_DIR,
    lastDir: INITIAL_DIR,
    food: { x: 15, y: 5 }, // Hardcoded first spawn
    score: 0,
    gameOver: false,
    running: false,
  });

  // UI rendering state for Game
  const [, setRenderTick] = useState(0);
  const forceRender = useCallback(() => setRenderTick(t => t + 1), []);
  
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('snakeHighScore');
    return saved ? parseInt(saved, 10) : 0;
  });
  const highScoreRef = useRef(highScore);

  // Music State
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // -- Game Logic --
  useEffect(() => {
    const move = () => {
      const state = engineRef.current;
      if (!state.running || state.gameOver) return;

      const head = state.snake[0];
      const nextHead = {
        x: head.x + state.dir.x,
        y: head.y + state.dir.y
      };

      // Check bounds
      if (nextHead.x < 0 || nextHead.x >= GRID_SIZE || nextHead.y < 0 || nextHead.y >= GRID_SIZE) {
        state.gameOver = true;
        state.running = false;
        forceRender();
        return;
      }

      // Check self-collision
      if (state.snake.some(seg => seg.x === nextHead.x && seg.y === nextHead.y)) {
        state.gameOver = true;
        state.running = false;
        forceRender();
        return;
      }

      const newSnake = [nextHead, ...state.snake];

      // Check food
      if (nextHead.x === state.food.x && nextHead.y === state.food.y) {
        state.score += 10;
        if (state.score > highScoreRef.current) {
          highScoreRef.current = state.score;
          setHighScore(state.score);
          localStorage.setItem('snakeHighScore', state.score.toString());
        }
        state.food = generateFood(newSnake);
      } else {
        newSnake.pop();
      }

      state.snake = newSnake;
      state.lastDir = state.dir;
      forceRender();
    };

    const intervalId = setInterval(move, TICK_RATE);
    return () => clearInterval(intervalId);
  }, [forceRender]);

  // -- Keyboard Handling --
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      const state = engineRef.current;

      if (!state.running || state.gameOver) {
        if (e.key === ' ' || e.key === 'Enter') {
          // Restart Game
          state.snake = INITIAL_SNAKE;
          state.dir = INITIAL_DIR;
          state.lastDir = INITIAL_DIR;
          state.score = 0;
          state.gameOver = false;
          state.running = true;
          state.food = generateFood(state.snake);
          forceRender();
        }
        return;
      }

      let nextDir = { ...state.dir };
      switch(e.key) {
        case 'ArrowUp':
        case 'w':
          if (state.lastDir.y !== 1) nextDir = { x: 0, y: -1 };
          break;
        case 'ArrowDown':
        case 's':
          if (state.lastDir.y !== -1) nextDir = { x: 0, y: 1 };
          break;
        case 'ArrowLeft':
        case 'a':
          if (state.lastDir.x !== 1) nextDir = { x: -1, y: 0 };
          break;
        case 'ArrowRight':
        case 'd':
          if (state.lastDir.x !== -1) nextDir = { x: 1, y: 0 };
          break;
      }
      state.dir = nextDir;
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [forceRender]);

  // -- Audio Controls --
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    if (isPlaying && audioRef.current) {
      audioRef.current.play().catch(e => {
        console.log('Audio autoplay blocked', e);
        setIsPlaying(false);
      });
    }
  }, [currentTrackIndex]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  };

  const nextTrack = () => {
    setCurrentTrackIndex(i => (i + 1) % TRACKS.length);
    setIsPlaying(true);
  };

  const prevTrack = () => {
    setCurrentTrackIndex(i => (i - 1 + TRACKS.length) % TRACKS.length);
    setIsPlaying(true);
  };

  const engine = engineRef.current;
  const currentTrack = TRACKS[currentTrackIndex];

  return (
    <div className="h-screen w-full flex flex-col lg:grid lg:grid-cols-[280px_1fr_280px] lg:grid-rows-[80px_1fr_100px] bg-[#050505] text-white font-sans overflow-hidden border border-[#333]">
      
      {/* HEADER */}
      <header className="lg:col-span-full border-b border-white/10 flex justify-between items-center px-10 bg-gradient-to-r from-[#050505] to-[#111111] h-[80px]">
        <div className="font-mono text-xl md:text-2xl font-black tracking-[4px] text-[#00f3ff] drop-shadow-[0_0_10px_#00f3ff]">
          NEON_RHYTHM_v.1
        </div>
        <div className="flex gap-[30px]">
          <div className="text-right">
            <div className="text-[10px] uppercase text-white/50 tracking-[1px]">Hi-Score</div>
            <div className="font-mono text-xl text-[#ff00ff] drop-shadow-[0_0_8px_#ff00ff]">
              {highScore.toString().padStart(5, '0')}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase text-white/50 tracking-[1px]">Current</div>
            <div className="font-mono text-xl text-[#ff00ff] drop-shadow-[0_0_8px_#ff00ff]">
              {engine.score.toString().padStart(5, '0')}
            </div>
          </div>
        </div>
      </header>

      {/* LEFT SIDEBAR (Playlist) */}
      <aside className="hidden lg:block row-start-2 col-start-1 border-r border-white/10 p-6 bg-[#111111]">
        <div className="text-[12px] uppercase tracking-[2px] mb-5 text-[#00f3ff] flex items-center gap-2 after:content-[''] after:h-[1px] after:flex-grow after:bg-white/10">
          PLAYLIST
        </div>
        <div className="flex flex-col gap-3">
          {TRACKS.map((track, idx) => (
            <div 
              key={track.id}
              onClick={() => { setCurrentTrackIndex(idx); setIsPlaying(true); }}
              className={`bg-white/5 border p-3 rounded cursor-pointer transition-all duration-200 ${
                currentTrackIndex === idx 
                ? 'border-[#00f3ff] bg-[#00f3ff]/10' 
                : 'border-white/10'
              }`}
            >
              <div className="text-[14px] font-semibold mb-1">{track.title}</div>
              <div className="text-[12px] text-white/50">{track.artist}</div>
            </div>
          ))}
        </div>
      </aside>

      {/* GAME VIEWPORT */}
      <main className="flex-1 lg:row-start-2 lg:col-start-2 flex justify-center items-center p-5 relative overflow-hidden">
        <div className="w-[340px] h-[340px] md:w-[480px] md:h-[480px] bg-black border-[4px] border-[#111111] shadow-[0_0_40px_rgba(0,0,0,0.5)] relative">
          
          {/* Render Food */}
          <div className="absolute bg-[#ff00ff] rounded-full shadow-[0_0_15px_#ff00ff] animate-[pulse_1s_infinite]"
               style={{ width: '5%', height: '5%', left: `${engine.food.x * 5}%`, top: `${engine.food.y * 5}%` }} />

          {/* Render Snake */}
          {engine.snake.map((seg, i) => (
              <div key={i}
                   className="absolute bg-[#00f3ff] shadow-[0_0_10px_#00f3ff] rounded-[2px]"
                   style={{ 
                     width: '5%', height: '5%', 
                     left: `${seg.x * 5}%`, top: `${seg.y * 5}%`,
                     zIndex: i === 0 ? 10 : 0
                   }} />
          ))}

          {/* Overlays */}
          {!engine.running && !engine.gameOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-[2px] z-20">
               <button onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter'}))} 
                       className="px-8 py-3 bg-[#00f3ff] text-[#050505] font-sans font-bold uppercase tracking-[2px] rounded border-none cursor-pointer hover:bg-cyan-300 transition-colors">
                  INITIALIZE
               </button>
            </div>
          )}

          {engine.gameOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 backdrop-blur-[2px] z-20 border-[2px] border-[#ff00ff]">
               <h2 className="text-4xl font-mono text-[#ff00ff] drop-shadow-[0_0_20px_#ff00ff] tracking-[4px] mb-6">CRASHED</h2>
               <button onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter'}))} 
                       className="px-8 py-3 bg-transparent border border-[#00f3ff] text-[#00f3ff] font-sans uppercase font-bold tracking-[2px] rounded cursor-pointer hover:bg-[#00f3ff]/20 transition-colors">
                  REBOOT
               </button>
            </div>
          )}
        </div>
      </main>

      {/* RIGHT SIDEBAR (Signal & Status) */}
      <aside className="hidden lg:block row-start-2 col-start-3 border-l border-white/10 p-6 bg-[#111111]">
        <div className="text-[12px] uppercase tracking-[2px] mb-5 text-[#00f3ff] flex items-center gap-2 after:content-[''] after:h-[1px] after:flex-grow after:bg-white/10">
          SIGNAL
        </div>
        <div className="flex items-end gap-[3px] h-[120px] mb-[30px]">
          {/* Static heights to match extracted HTML precisely */}
          {[40, 70, 90, 60, 30, 50, 80, 100, 60, 40].map((h, idx) => (
            <div key={idx} 
                 className="flex-1 bg-gradient-to-t from-[#00f3ff] to-[#ff00ff] rounded-[2px_2px_0_0] transition-all" 
                 style={{ height: isPlaying ? `${Math.random() * 40 + h/2}%` : `${h}%` }}>
            </div>
          ))}
        </div>

        <div className="text-[12px] uppercase tracking-[2px] mb-5 text-[#00f3ff] flex items-center gap-2 after:content-[''] after:h-[1px] after:flex-grow after:bg-white/10">
          STATUS
        </div>
        <p className="font-mono text-[12px] color-white/40 leading-[1.6] text-white/50">
          SYSTEM: OPTIMAL<br/>
          LATENCY: 4ms<br/>
          SNAKE_LEN: {engine.snake.length}<br/>
          GAME_SPEED: 1.2x
        </p>
      </aside>

      {/* FOOTER PLAYER */}
      <footer className="lg:col-span-full border-t border-white/10 bg-[#050505] flex flex-col lg:grid lg:grid-cols-[1fr_2fr_1fr] items-center p-5 lg:px-[40px] lg:h-[100px] gap-4 lg:gap-0 mt-auto">
        
        <div className="flex items-center gap-[15px] w-full lg:w-auto justify-center lg:justify-start">
          <div className="w-[50px] h-[50px] bg-gradient-to-tr from-[#222] to-[#444] rounded-[4px] border border-white/10 relative overflow-hidden flex items-center justify-center">
             {isPlaying && <div className="absolute inset-0 bg-[#00f3ff]/10 animate-pulse"></div>}
             <MusicIcon size={20} className="text-white/50" />
          </div>
          <div>
            <div className="text-[14px] font-semibold">{currentTrack.title}</div>
            <div className="text-[12px] text-white/50">{currentTrack.artist}</div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-[10px] w-full max-w-[400px]">
          <div className="flex items-center gap-[25px]">
            <button onClick={prevTrack} className="bg-transparent border-none cursor-pointer text-white flex items-center justify-center hover:text-[#00f3ff] transition-colors">
               <SkipBack size={20} />
            </button>
            <button onClick={togglePlay} className="w-[45px] h-[45px] rounded-full bg-[#00f3ff] text-[#050505] flex items-center justify-center border-none cursor-pointer">
              {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
            </button>
            <button onClick={nextTrack} className="bg-transparent border-none cursor-pointer text-white flex items-center justify-center hover:text-[#00f3ff] transition-colors">
               <SkipForward size={20} />
            </button>
          </div>
          <div className="w-full h-[4px] bg-white/10 rounded-[2px] relative overflow-hidden">
            <div className="absolute top-0 left-0 h-full bg-[#00f3ff] shadow-[0_0_10px_#00f3ff] transition-all duration-1000" style={{width: isPlaying ? '42%' : '0%'}}></div>
          </div>
        </div>

        <div className="hidden lg:flex justify-end items-center gap-[15px] text-white/50 w-full">
          <span className="text-[12px] font-sans">VOL</span>
          <div className="w-[80px] h-[2px] bg-white/10 relative">
             <div className="absolute top-0 left-0 h-full bg-[#00f3ff]" style={{width: `${(isMuted ? 0 : volume) * 100}%`}}></div>
             <input
                 type="range" min="0" max="1" step="0.05"
                 value={isMuted ? 0 : volume}
                 onChange={(e) => setVolume(parseFloat(e.target.value))}
                 className="absolute inset-0 opacity-0 cursor-pointer w-full"
             />
          </div>
        </div>

      </footer>
      
      <audio 
         ref={audioRef} 
         src={currentTrack.url} 
         onEnded={nextTrack} 
         crossOrigin="anonymous"
       />

    </div>
  );
}
