import { useState, useEffect } from 'react';
import './App.css';

function App() {
  // --- ESTADOS DO JOGO ---
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameStarted, setGameStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);

  // --- POSIÇÃO DO JOGADOR (Grelha) ---
  const [gridY, setGridY] = useState(10); 
  const [gridX, setGridX] = useState(5); 
  const [isKeyDown, setIsKeyDown] = useState(false);

  // --- NOVO: ESTADO DOS CARROS  ---
  const [cars, setCars] = useState([]);

  // --- CONFIGURAÇÕES ---
  const laneHeight = 600 / 11; 
  const colWidth = 400 / 10;   

  // Configuração inicial das faixas (Y = linha da grelha)
  const initialCarConfig = [
    { id: 1, y: 1, speed: 0.6, direction: 1, type: 'car1' },
    { id: 2, y: 2, speed: 0.8, direction: -1, type: 'car2' },
    { id: 3, y: 3, speed: 0.5, direction: 1, type: 'truck' },
    // Faixa 4 é passeio (seguro)
    { id: 4, y: 5, speed: 0.7, direction: -1, type: 'car1' },
    { id: 5, y: 6, speed: 0.9, direction: 1, type: 'motorcycle' },
    { id: 6, y: 7, speed: 0.4, direction: 1, type: 'truck' },
    { id: 7, y: 8, speed: 0.6, direction: -1, type: 'car2' },
    { id: 8, y: 9, speed: 1.0, direction: 1, type: 'car1' },
  ];

  // --- TIMER DO JOGO ---
  useEffect(() => {
    if (gameStarted && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(prev => {
        if (prev <= 1) {
          handleGameOver(); // Tempo acabou
          return 0;
        }
        return prev - 1;
      }), 1000);
      return () => clearInterval(timer);
    }
  }, [gameStarted, timeLeft]);

  // --- CONTROLO DO JOGADOR (Teclado) ---
  useEffect(() => {
    if (!gameStarted) return;

    const handleKeyDown = (e) => {
      if (isKeyDown) return;
      const key = e.key.toLowerCase();
      setIsKeyDown(true);

      setGridY(prevY => {
        if (key === 'w' && prevY > 0) return prevY - 1;
        if (key === 's' && prevY < 10) return prevY + 1;
        return prevY;
      });

      setGridX(prevX => {
        if (key === 'a' && prevX > 0) return prevX - 1;
        if (key === 'd' && prevX < 9) return prevX + 1;
        return prevX;
      });
    };

    const handleKeyUp = () => setIsKeyDown(false);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameStarted, isKeyDown]);

  // --- NOVO: MOVIMENTO DOS CARROS (Isto faltava) ---
  useEffect(() => {
    if (gameStarted) {
      // 1. Criar carros com posição aleatória
      const startCars = initialCarConfig.map(car => ({
        ...car,
        x: Math.random() * 100 
      }));
      setCars(startCars);
    }
  }, [gameStarted]);

  useEffect(() => {
    if (!gameStarted) return;

    const gameLoop = setInterval(() => {
      setCars(prevCars => prevCars.map(car => {
        let newX = car.x + (car.speed * car.direction);
        // Loop infinito dos carros
        if (newX > 110 && car.direction === 1) newX = -10;
        if (newX < -10 && car.direction === -1) newX = 110;
        return { ...car, x: newX };
      }));
    }, 50);

    return () => clearInterval(gameLoop);
  }, [gameStarted]);

  // --- DETEÇÃO DE COLISÃO E ENTREGA ---
  useEffect(() => {
    if (!gameStarted) return;

    // Verificar Colisão
    const playerMinX = gridX * 10;     
    const playerMaxX = playerMinX + 8; 

    cars.forEach(car => {
      if (car.y === gridY) { // Se estiver na mesma linha
        const carMinX = car.x;
        const carMaxX = car.x + 10; 

        // Se bater
        if (playerMinX < carMaxX && playerMaxX > carMinX) {
          handleCollision();
        }
      }
    });

    // Verificar Vitória (Chegou ao topo)
    if (gridY === 0) {
      handleDelivery();
    }

  }, [gridX, gridY, cars, gameStarted]);

  // --- FUNÇÕES AUXILIARES ---
  const handleCollision = () => {
    setLives(prev => {
      const newLives = prev - 1;
      if (newLives <= 0) {
        handleGameOver();
        return 0;
      }
      return newLives;
    });
    resetPlayerPosition();
  };

  const handleDelivery = () => {
    setScore(prev => prev + 1);
    setTimeLeft(prev => Math.min(prev + 5, 60)); // +5 segundos extra
    resetPlayerPosition();
  };

  const resetPlayerPosition = () => {
    setGridY(10);
    setGridX(5);
  };

  const handleGameOver = () => {
    setGameStarted(false);
    alert(`FIM DE JOGO! Conseguiste ${score} entregas.`);
    // Reiniciar
    setScore(0);
    setLives(3);
    setTimeLeft(60);
    resetPlayerPosition();
  };

  return (
    <div className="game-container">
      <div className="hud">
        <div className="hud-top">
          <span>📦 Entregas: {score}</span>
          <span>❤️ Vidas: {lives}</span>
          <span>⏱️ {timeLeft}s</span>
        </div>
        <div className="time-bar-container">
          <div 
            className="time-bar-fill" 
            style={{ 
              width: `${(timeLeft / 60) * 100}%`,
              backgroundColor: timeLeft < 10 ? '#ff4d4d' : '#edaf11' 
            }}
          ></div>
        </div>
      </div>

      <div className="game-world">
        {/* Mapa / Faixas */}
        <div className="sidewalk finish"></div>
        <div className="road-lane"></div>
        <div className="road-lane"></div>
        <div className="road-lane"></div>
        <div className="sidewalk mid"></div> 
        <div className="road-lane"></div>
        <div className="road-lane"></div>
        <div className="road-lane"></div>
        <div className="road-lane"></div>
        <div className="road-lane"></div>
        <div className="sidewalk start"></div>

        {/* Menu Inicial */}
        {!gameStarted && (
          <div className="menu-overlay">
            <h1>CrossCity</h1>
            <p className="subtitle">Entregador em Apuros</p>
            <div className="info-box">
              <p>🎯 <strong>Objetivo:</strong> Atravessa para entregar encomendas!</p>
              <p>⌨️ <strong>Controlos:</strong> W, A, S, D para mover.</p>
            </div>
            <button className="start-button" onClick={() => setGameStarted(true)}>
              Começar Entrega
            </button>
            <p className="credits">Bento Simões & Ricardo Costa | IPCA</p>
          </div>
        )}

        {/* NOVO: Renderizar Carros (Isto faltava) */}
        {cars.map(car => (
          <div
            key={car.id}
            className={`car ${car.type}`}
            style={{
              top: `${car.y * laneHeight + 12}px`,
              left: `${car.x}%`,
              transform: car.direction === -1 ? 'scaleX(-1)' : 'scaleX(1)',
              position: 'absolute',
              width: '50px',
              height: '35px',
              backgroundColor: car.type === 'truck' ? '#d35400' : (car.type === 'car1' ? '#3498db' : '#e74c3c'),
              borderRadius: '5px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              transition: 'left 0.05s linear',
              zIndex: 40
            }}
          >
            {car.type === 'motorcycle' ? '🏍️' : (car.type === 'truck' ? '🚛' : '🚗')}
          </div>
        ))}

        {/* Jogador */}
        <div 
          className="player" 
          style={{ 
            left: `${gridX * colWidth + (colWidth / 2) - 20}px`, 
            top: `${gridY * laneHeight + (laneHeight / 2) - 20}px` 
          }}
        >
          🚲
        </div>
      </div>
    </div>
  );
}

export default App;