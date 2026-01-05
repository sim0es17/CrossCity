import { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  // Estados para controlar a pontuação, vidas e fluxo do jogo
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameStarted, setGameStarted] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);

  // Estados para a posição do jogador na grelha 11x10
  const [gridY, setGridY] = useState(10); 
  const [gridX, setGridX] = useState(5); 
  const [isKeyDown, setIsKeyDown] = useState(false);

  // Lista dinâmica de carros
  const [cars, setCars] = useState([]);

  // Referências para controlar os ficheiros de som (Áudio)
  const bgMusicRef = useRef(null);
  const collisionSoundRef = useRef(null);

  // Inicialização do áudio com pré-carregamento automático
  if (!bgMusicRef.current) {
    bgMusicRef.current = new Audio('/background-music.mp3');
    bgMusicRef.current.preload = 'auto';
  }
  if (!collisionSoundRef.current) {
    collisionSoundRef.current = new Audio('/collision.mp3');
    collisionSoundRef.current.preload = 'auto';
  }

  // Definição do tamanho das faixas e colunas baseada no tamanho do jogo (400x600)
  const laneHeight = 600 / 11; 
  const colWidth = 400 / 10;   

  // Configurações base das faixas: linha (y), velocidade e direção
  const initialCarConfig = [
    { id: 1, y: 1, speed: 0.6, direction: 1, type: 'car1' },
    { id: 2, y: 2, speed: 0.8, direction: -1, type: 'car2' },
    { id: 3, y: 3, speed: 0.5, direction: 1, type: 'truck' },
    { id: 4, y: 5, speed: 0.7, direction: -1, type: 'car1' },
    { id: 5, y: 6, speed: 0.9, direction: 1, type: 'motorcycle' },
    { id: 6, y: 7, speed: 0.4, direction: 1, type: 'truck' },
    { id: 7, y: 8, speed: 0.6, direction: -1, type: 'car2' },
    { id: 8, y: 9, speed: 1.0, direction: 1, type: 'car1' },
  ];

  // Efeito para tocar ou pausar a música de fundo dependendo do estado do jogo
  useEffect(() => {
    const bgMusic = bgMusicRef.current;
    bgMusic.loop = true;
    bgMusic.volume = 0.3;

    if (gameStarted && !isPaused) {
      bgMusic.play().catch(() => {});
    } else {
      bgMusic.pause();
      if (!isPaused) bgMusic.currentTime = 0;
    }
    return () => bgMusic.pause();
  }, [gameStarted, isPaused]);

  // Efeito do cronómetro: reduz o tempo a cada 1 segundo
  useEffect(() => {
    if (gameStarted && !isPaused && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(prev => {
        if (prev <= 1) { handleGameOver(); return 0; }
        return prev - 1;
      }), 1000);
      return () => clearInterval(timer);
    }
  }, [gameStarted, isPaused, timeLeft]);

  // Efeito para capturar entradas do teclado (W, A, S, D e P)
  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();

      if (key === 'p' && gameStarted && !isGameOver) {
        setIsPaused(prev => !prev);
        return;
      }

      if (!gameStarted || isPaused || isKeyDown) return;
      
      setIsKeyDown(true);
      setGridY(prevY => (key === 'w' && prevY > 0) ? prevY - 1 : (key === 's' && prevY < 10) ? prevY + 1 : prevY);
      setGridX(prevX => (key === 'a' && prevX > 0) ? prevX - 1 : (key === 'd' && prevX < 9) ? prevX + 1 : prevX);
    };
    const handleKeyUp = () => setIsKeyDown(false);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameStarted, isPaused, isKeyDown, isGameOver]);

  // Efeito para inicializar carros no começo do jogo
  useEffect(() => {
    if (gameStarted) {
      setCars(initialCarConfig.map(car => ({ ...car, x: Math.random() * 100 })));
    }
  }, [gameStarted]);

  // Loop de jogo principal: move os carros e faz o "reset" quando saem do ecrã
  useEffect(() => {
    if (!gameStarted || isPaused) return;

    const gameLoop = setInterval(() => {
      setCars(prevCars => prevCars.map(car => {
        let newX = car.x + (car.speed * car.direction);
        if (newX > 110 && car.direction === 1) newX = -10;
        if (newX < -10 && car.direction === -1) newX = 110;
        return { ...car, x: newX };
      }));
    }, 50);
    return () => clearInterval(gameLoop);
  }, [gameStarted, isPaused]);

  // Monitorização de colisões e entregas (verificar se o jogador está na mesma posição que um carro)
  useEffect(() => {
    if (!gameStarted || isPaused) return;
    const playerMinX = gridX * 10;
    const playerMaxX = playerMinX + 8;

    cars.forEach(car => {
      if (car.y === gridY) {
        if (playerMinX < car.x + 10 && playerMaxX > car.x) {
          handleCollision();
        }
      }
    });

    if (gridY === 0) handleDelivery();
  }, [gridX, gridY, cars, gameStarted, isPaused]);

  // Função para processar colisão: toca som e retira vida
  const handleCollision = () => {
    if (collisionSoundRef.current) {
      collisionSoundRef.current.currentTime = 0;
      collisionSoundRef.current.play().catch(() => {});
    }
    setLives(prev => {
      const newLives = prev - 1;
      if (newLives <= 0) { handleGameOver(); return 0; }
      return newLives;
    });
    resetPlayerPosition();
  };

  // Função para processar entrega com sucesso: aumenta score e tempo
  const handleDelivery = () => {
    setScore(prev => prev + 1);
    setTimeLeft(prev => Math.min(prev + 5, 60));
    resetPlayerPosition();
  };

  const resetPlayerPosition = () => { setGridY(10); setGridX(5); };

  const handleGameOver = () => {
    setGameStarted(false);
    setIsGameOver(true);
  };

  // Limpa todos os estados para garantir um jogo novo limpo
  const resetAllStates = () => {
    setScore(0); setLives(3); setTimeLeft(60);
    setGridY(10); setGridX(5); setCars([]);
    setIsPaused(false);
  };

  const startNewGame = () => {
    resetAllStates();
    setIsGameOver(false);
    setGameStarted(true);
  };

  const goToMainMenu = () => {
    resetAllStates();
    setIsGameOver(false);
    setGameStarted(false);
  };

  return (
    <div className="game-container">
      {/* Secção HUD: Informações em tempo real */}
      <div className="hud">
        <div className="hud-top">
          <span>📦Entregas {score}</span>
          <span>❤️Vidas {lives}</span>
          <span style={{ cursor: 'pointer' }} onClick={() => gameStarted && setIsPaused(!isPaused)}>
            {isPaused ? '▶️ Tempo' : '⏸️ Tempo'} {timeLeft}s
          </span>
        </div>
        <div className="time-bar-container">
          <div className="time-bar-fill" style={{ width: `${(timeLeft / 60) * 100}%` }}></div>
        </div>
      </div>

      <div className="game-world">
        {/* Renderização estática do cenário */}
        <div className="sidewalk finish"></div>
        {[...Array(3)].map((_, i) => <div key={i} className="road-lane"></div>)}
        <div className="sidewalk mid"></div>
        {[...Array(5)].map((_, i) => <div key={i + 3} className="road-lane"></div>)}
        <div className="sidewalk start"></div>

        {/* Lógica condicional para exibir Menus (Overlay) */}
        {!gameStarted && !isGameOver && (
          <div className="menu-overlay">
            <h1>CrossCity</h1>
            <p className="subtitle">Entregador em Apuros</p>
            <div className="info-box">
              <p>🎯 Atravessa para entregar encomendas!</p>
              <p>⌨️ <strong>W,A,S,D</strong> movem | <strong>P</strong> pausa.</p>
            </div>
            <button className="start-button" onClick={startNewGame}>Começar Entrega</button>
            <p className="credits">Bento Simões & Ricardo Costa | IPCA</p>
          </div>
        )}

        {isPaused && gameStarted && (
          <div className="menu-overlay" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
            <h1>PAUSA</h1>
            <button className="start-button" onClick={() => setIsPaused(false)}>Continuar</button>
            <button className="credits" style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', textDecoration: 'underline', marginTop: '20px' }} onClick={goToMainMenu}>
              Sair para o Menu
            </button>
          </div>
        )}

        {isGameOver && (
          <div className="menu-overlay">
            <h1 style={{ color: '#ff4d4d' }}>Fim de Jogo!</h1>
            <div className="info-box" style={{ borderColor: '#ff4d4d' }}>
              <p style={{ fontSize: '1.5rem', margin: '10px 0' }}>📦 <strong>Score Final: {score}</strong></p>
              <p>{timeLeft === 0 ? "⏱️ O tempo esgotou!" : "💔 Perdeste todas as vidas!"}</p>
            </div>
            <button className="start-button" onClick={startNewGame}>Tentar Novamente</button>
            <button className="credits" style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', textDecoration: 'underline', marginTop: '20px' }} onClick={goToMainMenu}>
              Voltar ao Menu Principal
            </button>
          </div>
        )}

        {/* Renderização dinâmica de Carros */}
        {cars.map(car => (
          <div key={car.id} className={`car ${car.type}`} style={{
            top: `${car.y * laneHeight + 12}px`,
            left: `${car.x}%`,
            transform: car.direction === -1 ? 'scaleX(-1)' : 'scaleX(1)',
            position: 'absolute',
            width: '50px', height: '35px',
            backgroundColor: car.type === 'truck' ? '#d35400' : (car.type === 'car1' ? '#3498db' : '#e74c3c'),
            borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '20px', zIndex: 40,
            opacity: isPaused ? 0.3 : 1
          }}>
            {car.type === 'motorcycle' ? '🏍️' : (car.type === 'truck' ? '🚛' : '🚗')}
          </div>
        ))}

        {/* Renderização do Jogador */}
        <div className="player" style={{ 
          left: `${gridX * colWidth + (colWidth / 2) - 20}px`, 
          top: `${gridY * laneHeight + (laneHeight / 2) - 20}px`,
          opacity: isPaused ? 0.3 : 1
        }}>🚲</div>
      </div>
    </div>
  );
}

export default App;