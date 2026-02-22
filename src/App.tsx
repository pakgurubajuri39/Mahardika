import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CharacterType, 
  GameState, 
  Player, 
  Property, 
  RegionGroup,
  Quiz
} from './types';
import { INITIAL_PROPERTIES, BOARD_SIZE, CHARACTER_DATA } from './constants';
import { generateNarrative, generateQuiz, generateHistoryInfo } from './services/gemini';
import { useSound } from './hooks/useSound';
import Board from './components/Board';
import QuizDialog from './components/QuizDialog';
import { Coins, User, Map as MapIcon, History, ScrollText, Shield, Ship, Crown, Anchor, Sun, Moon, Menu, X } from 'lucide-react';

export default function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [setupStep, setSetupStep] = useState<'welcome' | 'mode' | 'players' | 'playing'>('welcome');
  const [gameMode, setGameMode] = useState<'single' | 'multi'>('multi');
  const [numPlayers, setNumPlayers] = useState(2);
  const [playerInputs, setPlayerInputs] = useState<{name: string, character: CharacterType, isAI: boolean, difficulty: 'easy' | 'medium' | 'hard'}[]>([
    { name: '', character: CharacterType.GAJAH_MADA, isAI: false, difficulty: 'medium' },
    { name: '', character: CharacterType.MALAHAYATI, isAI: true, difficulty: 'medium' }
  ]);
  const [isRolling, setIsRolling] = useState(false);
  const [dice, setDice] = useState([1, 1]);
  const [currentNarrative, setCurrentNarrative] = useState<string>('');
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [pendingRent, setPendingRent] = useState<{amount: number, ownerId: string} | null>(null);
  const [isProcessingTurn, setIsProcessingTurn] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeAbility, setActiveAbility] = useState<{playerId: string, type: string} | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  const { playSynthesizedSound, speak } = useSound();

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const initGame = () => {
    const players: Player[] = playerInputs.map((input, idx) => ({
      id: `p${idx}`,
      name: input.name || (input.isAI ? `AI ${input.difficulty.toUpperCase()} ${idx + 1}` : `Pemain ${idx + 1}`),
      character: input.character,
      balance: 1500,
      position: 0,
      properties: [],
      isBankrupt: false,
      jailTurns: 0,
      isAI: input.isAI,
      difficulty: input.difficulty
    }));

    setGameState({
      players,
      currentPlayerIndex: 0,
      properties: JSON.parse(JSON.stringify(INITIAL_PROPERTIES)),
      logs: ['Permainan dimulai. Selamat datang di Nusantara!'],
      isGameOver: false,
      winner: null
    });
    setSetupStep('playing');
    
    // Play greeting
    speak("Salam dari kerajaan kami.", players[0].character);
  };

  const rollDice = async () => {
    if (!gameState || isRolling || isProcessingTurn) return;
    
    setIsRolling(true);
    playSynthesizedSound('dice');
    
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    
    setTimeout(() => {
      setDice([d1, d2]);
      setIsRolling(false);
      handleMove(d1 + d2);
    }, 1000);
  };

  const handleMove = async (steps: number) => {
    if (!gameState) return;
    setIsProcessingTurn(true);

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    let newPos = (currentPlayer.position + steps) % BOARD_SIZE;
    
    // Check if passed GO
    let balanceBonus = 0;
    if (newPos < currentPlayer.position) {
      balanceBonus = 200;
      if (currentPlayer.character === CharacterType.TUNGGADEWI) {
        balanceBonus += 50;
        setActiveAbility({ playerId: currentPlayer.id, type: 'Crown' });
        setTimeout(() => setActiveAbility(null), 2000);
      }
      playSynthesizedSound('coin');
    }

    const newPlayers = [...gameState.players];
    newPlayers[gameState.currentPlayerIndex] = {
      ...currentPlayer,
      position: newPos,
      balance: currentPlayer.balance + balanceBonus
    };

    const landedProp = gameState.properties[newPos];
    
    // Play region-specific sound
    if (landedProp.group === RegionGroup.SUMATERA) playSynthesizedSound('sumatera');
    else if (landedProp.group === RegionGroup.JAWA) playSynthesizedSound('jawa');
    else if (landedProp.group === RegionGroup.SULAWESI) playSynthesizedSound('sulawesi');
    else if (landedProp.group === RegionGroup.MALUKU) playSynthesizedSound('maluku');
    
    // Generate Narrative
    const narrative = await generateNarrative(
      currentPlayer.name, 
      currentPlayer.character, 
      landedProp.name,
      landedProp.ownerId ? `Mendarat di wilayah milik ${gameState.players.find(p => p.id === landedProp.ownerId)?.name}` : 'Mendarat di wilayah baru'
    );
    setCurrentNarrative(narrative);
    speak(narrative, currentPlayer.character);

    // Handle Logic
    if (landedProp.ownerId && landedProp.ownerId !== currentPlayer.id) {
      // Opponent's property - QUIZ TIME
      const quiz = await generateQuiz();
      setActiveQuiz(quiz);
      setPendingRent({
        amount: landedProp.rent,
        ownerId: landedProp.ownerId
      });
    } else {
      // Own, Empty, or Special
      setGameState(prev => prev ? ({
        ...prev,
        players: newPlayers,
        logs: [`${currentPlayer.name} mendarat di ${landedProp.name}`, ...prev.logs]
      }) : null);
      setIsProcessingTurn(false);
    }
  };

  const handleQuizAnswer = (correct: boolean) => {
    if (!gameState || !pendingRent) return;

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    let finalRent = pendingRent.amount;

    // Apply character abilities
    if (currentPlayer.character === CharacterType.MALAHAYATI) {
      const landedProp = gameState.properties[currentPlayer.position];
      if (landedProp.group === RegionGroup.TRANSPORT) {
        finalRent = 0;
        setActiveAbility({ playerId: currentPlayer.id, type: 'Ship' });
        setTimeout(() => setActiveAbility(null), 2000);
      }
    }

    if (correct) {
      finalRent = Math.floor(finalRent * 0.5);
      playSynthesizedSound('success');
    } else {
      finalRent = Math.floor(finalRent * 1.1);
      playSynthesizedSound('fail');
    }

    const newPlayers = gameState.players.map(p => {
      if (p.id === currentPlayer.id) return { ...p, balance: p.balance - finalRent };
      if (p.id === pendingRent.ownerId) return { ...p, balance: p.balance + finalRent };
      return p;
    });

    setGameState(prev => prev ? ({
      ...prev,
      players: newPlayers,
      logs: [`${currentPlayer.name} membayar sewa ${finalRent} Kepeng kepada ${gameState.players.find(pl => pl.id === pendingRent.ownerId)?.name}`, ...prev.logs]
    }) : null);

    setActiveQuiz(null);
    setPendingRent(null);
    setIsProcessingTurn(false);
  };

  const buyProperty = () => {
    if (!gameState || isProcessingTurn) return;
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const landedProp = gameState.properties[currentPlayer.position];

    if (landedProp.price > 0 && !landedProp.ownerId && currentPlayer.balance >= landedProp.price) {
      const newProperties = gameState.properties.map(p => 
        p.id === landedProp.id ? { ...p, ownerId: currentPlayer.id } : p
      );
      const newPlayers = gameState.players.map(p => 
        p.id === currentPlayer.id ? { ...p, balance: p.balance - landedProp.price, properties: [...p.properties, landedProp.id] } : p
      );

      setGameState(prev => prev ? ({
        ...prev,
        properties: newProperties,
        players: newPlayers,
        logs: [`${currentPlayer.name} membeli ${landedProp.name}`, ...prev.logs]
      }) : null);
      
      playSynthesizedSound('coin');
    }
  };

  const nextTurn = () => {
    if (!gameState || isProcessingTurn || activeQuiz) return;
    const nextIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
    setGameState({ ...gameState, currentPlayerIndex: nextIndex });
    setCurrentNarrative('');
    speak("Giliran saya untuk melangkah.", gameState.players[nextIndex].character);
  };

  // AI Logic
  useEffect(() => {
    if (gameState && setupStep === 'playing' && !isRolling && !isProcessingTurn && !activeQuiz) {
      const currentPlayer = gameState.players[gameState.currentPlayerIndex];
      if (currentPlayer.isAI) {
        const timer = setTimeout(() => {
          if (!currentNarrative) {
            rollDice();
          } else {
            handleAIDecision();
          }
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [gameState?.currentPlayerIndex, currentNarrative, setupStep, isRolling, isProcessingTurn, activeQuiz]);

  useEffect(() => {
    if (activeQuiz && gameState) {
      const currentPlayer = gameState.players[gameState.currentPlayerIndex];
      if (currentPlayer.isAI) {
        const timer = setTimeout(() => {
          let accuracy = 0.3; // Easy
          if (currentPlayer.difficulty === 'medium') accuracy = 0.6;
          if (currentPlayer.difficulty === 'hard') accuracy = 0.9;
          
          handleQuizAnswer(Math.random() < accuracy);
        }, 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [activeQuiz]);

  const handleAIDecision = () => {
    if (!gameState) return;
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const landedProp = gameState.properties[currentPlayer.position];

    let shouldBuy = false;
    if (landedProp.price > 0 && !landedProp.ownerId) {
      if (currentPlayer.difficulty === 'easy') {
        shouldBuy = Math.random() > 0.5;
      } else if (currentPlayer.difficulty === 'medium') {
        shouldBuy = currentPlayer.balance >= landedProp.price + 300;
      } else {
        shouldBuy = currentPlayer.balance >= landedProp.price + 100;
      }
    }

    if (shouldBuy && currentPlayer.balance >= landedProp.price) {
      buyProperty();
      setTimeout(nextTurn, 1500);
    } else {
      nextTurn();
    }
  };

  const handleTileClick = async (prop: Property) => {
    if (prop.group === RegionGroup.SPECIAL) return;
    
    setSelectedProperty(prop);
    if (!prop.historyInfo) {
      setIsHistoryLoading(true);
      const info = await generateHistoryInfo(prop.name);
      
      setGameState(prev => {
        if (!prev) return null;
        return {
          ...prev,
          properties: prev.properties.map(p => p.id === prop.id ? { ...p, historyInfo: info } : p)
        };
      });
      
      setSelectedProperty(prev => prev ? { ...prev, historyInfo: info } : null);
      setIsHistoryLoading(false);
    }
  };

  // UI Components
  if (setupStep === 'welcome') {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#050505]' : 'bg-stone-100'} flex flex-col items-center justify-center p-6 text-white font-serif overflow-hidden relative transition-colors duration-500`}>
        {/* Theme Toggle */}
        <button 
          onClick={toggleTheme}
          className={`absolute top-6 right-6 z-50 p-3 rounded-full ${theme === 'dark' ? 'bg-stone-800 text-yellow-500' : 'bg-white text-stone-800 shadow-lg'} transition-all`}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* Animated Background */}
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <motion.img 
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: theme === 'dark' ? 0.3 : 0.1 }}
            transition={{ duration: 2 }}
            src="https://picsum.photos/seed/mahardika_bg/1920/1080?blur=5" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className={`absolute inset-0 ${theme === 'dark' ? 'bg-gradient-to-b from-transparent via-black/50 to-black' : 'bg-gradient-to-b from-transparent via-white/50 to-stone-100'}`} />
        </div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 text-center max-w-3xl"
        >
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <h1 className={`text-6xl sm:text-8xl md:text-9xl font-black tracking-tighter mb-2 text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-yellow-500 to-yellow-800 drop-shadow-[0_10px_30px_rgba(202,138,4,0.5)]`}>
              MAHARDIKA
            </h1>
            <div className="h-1 w-24 sm:w-32 bg-yellow-600 mx-auto mb-6 rounded-full shadow-[0_0_15px_rgba(202,138,4,0.8)]" />
            <p className={`text-sm sm:text-xl ${theme === 'dark' ? 'text-stone-400' : 'text-stone-600'} italic mb-12 sm:mb-16 tracking-[0.2em] uppercase font-light`}>
              Kejayaan Kepulauan Nusantara
            </p>
          </motion.div>
          
          <div className="space-y-8">
            <motion.button 
              whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(202,138,4,0.4)" }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSetupStep('mode')}
              className="px-12 sm:px-16 py-4 sm:py-5 bg-gradient-to-r from-yellow-700 to-yellow-500 text-black font-black rounded-full transition-all shadow-2xl uppercase tracking-[0.3em] text-[10px] sm:text-sm"
            >
              Mulai Ekspedisi
            </motion.button>
            <div className={`flex justify-center gap-4 sm:gap-8 text-[8px] sm:text-[10px] ${theme === 'dark' ? 'text-stone-500' : 'text-stone-400'} uppercase tracking-[0.4em] font-bold`}>
              <span>Strategi</span>
              <span className="text-yellow-900">•</span>
              <span>Edukasi</span>
              <span className="text-yellow-900">•</span>
              <span>Sejarah</span>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (setupStep === 'mode') {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#050505]' : 'bg-stone-100'} flex flex-col items-center justify-center p-6 text-white font-serif transition-colors duration-500`}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-2xl relative">
          <button 
            onClick={() => setSetupStep('welcome')}
            className="absolute -top-12 left-0 text-stone-500 hover:text-yellow-500 transition-colors flex items-center gap-2 text-xs uppercase tracking-widest font-bold"
          >
            <X size={16} /> Kembali
          </button>
          <h2 className={`text-3xl sm:text-5xl font-bold mb-12 text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-yellow-600 uppercase tracking-widest`}>
            Pilih Mode Permainan
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <button 
              onClick={() => {
                setGameMode('single');
                setNumPlayers(2);
                setPlayerInputs([
                  { name: '', character: CharacterType.GAJAH_MADA, isAI: false, difficulty: 'medium' },
                  { name: 'AI Kerajaan', character: CharacterType.MALAHAYATI, isAI: true, difficulty: 'medium' }
                ]);
                setSetupStep('players');
              }}
              className={`p-8 rounded-3xl border-2 transition-all group ${theme === 'dark' ? 'bg-stone-900/40 border-stone-800 hover:border-yellow-600' : 'bg-white border-stone-200 hover:border-yellow-500 shadow-md'}`}
            >
              <User size={48} className="mx-auto mb-4 text-yellow-600 group-hover:scale-110 transition-transform" />
              <h3 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-stone-900'}`}>Single Player</h3>
              <p className={`text-xs ${theme === 'dark' ? 'text-stone-500' : 'text-stone-400'}`}>Bertualang sendiri melawan utusan kerajaan (AI)</p>
            </button>
            <button 
              onClick={() => {
                setGameMode('multi');
                setNumPlayers(2);
                setPlayerInputs([
                  { name: '', character: CharacterType.GAJAH_MADA, isAI: false, difficulty: 'medium' },
                  { name: '', character: CharacterType.MALAHAYATI, isAI: false, difficulty: 'medium' }
                ]);
                setSetupStep('players');
              }}
              className={`p-8 rounded-3xl border-2 transition-all group ${theme === 'dark' ? 'bg-stone-900/40 border-stone-800 hover:border-yellow-600' : 'bg-white border-stone-200 hover:border-yellow-500 shadow-md'}`}
            >
              <div className="flex justify-center gap-2 mb-4">
                <User size={32} className="text-yellow-600 group-hover:-translate-x-1 transition-transform" />
                <User size={32} className="text-yellow-600 group-hover:translate-x-1 transition-transform" />
              </div>
              <h3 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-stone-900'}`}>Multiplayer</h3>
              <p className={`text-xs ${theme === 'dark' ? 'text-stone-500' : 'text-stone-400'}`}>Bermain bersama teman dalam satu perangkat</p>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (setupStep === 'players') {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#0a0a0a]' : 'bg-stone-50'} text-white p-4 sm:p-8 font-serif flex flex-col items-center justify-center transition-colors duration-500 relative`}>
        <button 
          onClick={() => setSetupStep('mode')}
          className="absolute top-8 left-8 text-stone-500 hover:text-yellow-500 transition-colors flex items-center gap-2 text-xs uppercase tracking-widest font-bold"
        >
          <X size={16} /> Kembali
        </button>
        <div className="max-w-5xl w-full">
          <motion.h2 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-3xl sm:text-5xl font-bold mb-8 sm:mb-12 text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-yellow-600 text-center uppercase tracking-widest`}
          >
            Pilih Utusan Kerajaan
          </motion.h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8 mb-12 sm:mb-16">
            {[0, 1, 2, 3].slice(0, numPlayers).map(idx => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, x: idx % 2 === 0 ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={`${theme === 'dark' ? 'bg-stone-900/40 border-stone-800' : 'bg-white border-stone-200 shadow-md'} border p-6 sm:p-8 rounded-3xl backdrop-blur-md hover:border-yellow-600/50 transition-colors group`}
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-10 h-10 rounded-full bg-yellow-600/20 flex items-center justify-center text-yellow-500 font-mono text-sm border border-yellow-600/30">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <label className={`block text-[10px] uppercase tracking-[0.3em] ${theme === 'dark' ? 'text-stone-500' : 'text-stone-400'}`}>Nama Pemain</label>
                      {gameMode === 'multi' && (
                        <button 
                          onClick={() => {
                            const newInputs = [...playerInputs];
                            newInputs[idx] = { ...newInputs[idx], isAI: !newInputs[idx].isAI };
                            setPlayerInputs(newInputs);
                          }}
                          className={`text-[9px] px-2 py-0.5 rounded-full border ${playerInputs[idx]?.isAI ? 'bg-yellow-600 border-yellow-400 text-black' : 'border-stone-700 text-stone-500'}`}
                        >
                          {playerInputs[idx]?.isAI ? 'AI' : 'MANUSIA'}
                        </button>
                      )}
                    </div>
                    <input 
                      type="text" 
                      placeholder={playerInputs[idx]?.isAI ? "Nama AI..." : "Gelar Kebangsawanan..."}
                      className={`w-full bg-transparent border-b ${theme === 'dark' ? 'border-stone-800 text-white' : 'border-stone-200 text-stone-900'} py-2 text-lg sm:text-xl focus:border-yellow-500 outline-none transition-colors font-medium`}
                      onChange={(e) => {
                        const newInputs = [...playerInputs];
                        newInputs[idx] = { ...newInputs[idx], name: e.target.value };
                        setPlayerInputs(newInputs);
                      }}
                    />
                  </div>
                </div>

                {playerInputs[idx]?.isAI && (
                  <div className="mb-6">
                    <label className={`block text-[10px] uppercase tracking-[0.3em] ${theme === 'dark' ? 'text-stone-500' : 'text-stone-400'} mb-2`}>Tingkat Kesulitan</label>
                    <div className="flex gap-2">
                      {['easy', 'medium', 'hard'].map((d) => (
                        <button
                          key={d}
                          onClick={() => {
                            const newInputs = [...playerInputs];
                            newInputs[idx] = { ...newInputs[idx], difficulty: d as any };
                            setPlayerInputs(newInputs);
                          }}
                          className={`flex-1 py-1.5 rounded-lg text-[9px] uppercase tracking-widest border transition-all ${playerInputs[idx]?.difficulty === d ? 'bg-stone-100 text-black border-white' : 'bg-stone-800/50 border-stone-700 text-stone-500'}`}
                        >
                          {d === 'easy' ? 'Mudah' : d === 'medium' ? 'Sedang' : 'Sulit'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                <label className={`block text-[10px] uppercase tracking-[0.3em] ${theme === 'dark' ? 'text-stone-500' : 'text-stone-400'} mb-4`}>Pilih Karakter</label>
                <div className="grid grid-cols-2 gap-3">
                  {Object.values(CharacterType).map(char => (
                    <button
                      key={char}
                      onClick={() => {
                        const newInputs = [...playerInputs];
                        newInputs[idx] = { ...newInputs[idx], character: char };
                        setPlayerInputs(newInputs);
                        speak(`Saya adalah ${char}.`, char);
                      }}
                      className={`p-3 text-[9px] sm:text-[10px] rounded-xl border transition-all uppercase tracking-widest font-bold ${playerInputs[idx]?.character === char ? 'bg-yellow-600 border-yellow-400 text-black shadow-[0_0_15px_rgba(202,138,4,0.3)]' : theme === 'dark' ? 'bg-stone-800/50 border-stone-700 hover:border-stone-500 text-stone-400' : 'bg-stone-100 border-stone-200 hover:border-stone-300 text-stone-600'}`}
                    >
                      {char.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          <div className="flex flex-col items-center gap-10">
            <div className={`flex items-center gap-6 ${theme === 'dark' ? 'bg-stone-900/50 border-stone-800' : 'bg-white border-stone-200 shadow-sm'} px-6 sm:px-8 py-4 rounded-full border`}>
              <span className={`text-[10px] sm:text-xs uppercase tracking-[0.2em] ${theme === 'dark' ? 'text-stone-500' : 'text-stone-400'} font-bold`}>Jumlah Utusan:</span>
              <div className="flex gap-4">
                {[2, 3, 4].map(n => (
                  <button 
                    key={n}
                    onClick={() => {
                      setNumPlayers(n);
                      setPlayerInputs(Array(n).fill(null).map((_, i) => ({ 
                        name: '', 
                        character: CharacterType.GAJAH_MADA,
                        isAI: gameMode === 'single' ? i > 0 : false,
                        difficulty: 'medium'
                      })));
                    }}
                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 flex items-center justify-center transition-all font-bold ${numPlayers === n ? 'bg-yellow-600 border-yellow-400 text-black scale-110' : theme === 'dark' ? 'border-stone-700 text-stone-500 hover:border-stone-500' : 'border-stone-200 text-stone-400 hover:border-stone-300'}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={initGame}
              disabled={playerInputs.length < numPlayers || playerInputs.some(p => !p.name && !p.isAI)}
              className={`px-16 sm:px-20 py-4 sm:py-5 ${theme === 'dark' ? 'bg-white text-black' : 'bg-stone-900 text-white'} font-black rounded-full hover:bg-yellow-500 transition-all disabled:opacity-20 uppercase tracking-[0.3em] text-[10px] sm:text-sm shadow-2xl`}
            >
              Berlayar Sekarang
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  if (!gameState) return null;

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const currentProp = gameState.properties[currentPlayer.position];

  const getRegionBackground = (group: RegionGroup) => {
    switch(group) {
      case RegionGroup.SUMATERA: return 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&q=80&w=1920&h=1080&blur=10'; // Tropical jungle
      case RegionGroup.JAWA: return 'https://images.unsplash.com/photo-1555897209-208b67f652c5?auto=format&fit=crop&q=80&w=1920&h=1080&blur=10'; // Volcanic/Rice fields
      case RegionGroup.SULAWESI: return 'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?auto=format&fit=crop&q=80&w=1920&h=1080&blur=10'; // Coastal/Coral
      case RegionGroup.MALUKU: return 'https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?auto=format&fit=crop&q=80&w=1920&h=1080&blur=10'; // Exotic islands
      default: return 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=1920&h=1080&blur=10'; // General mountain/topo
    }
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#1a1a1a] text-stone-200' : 'bg-stone-50 text-stone-800'} font-serif flex flex-col lg:flex-row overflow-hidden transition-colors duration-500 relative`}>
      {/* Dynamic Background Layer */}
      <div className="absolute inset-0 pointer-events-none opacity-20 transition-opacity duration-1000">
        <img 
          src={getRegionBackground(currentProp.group)} 
          className="w-full h-full object-cover grayscale" 
          alt="Region Background"
          referrerPolicy="no-referrer"
        />
        <div className={`absolute inset-0 ${theme === 'dark' ? 'bg-black/40' : 'bg-white/40'}`} />
      </div>

      {/* Mobile Header */}
      <div className={`lg:hidden flex items-center justify-between p-4 ${theme === 'dark' ? 'bg-stone-900 border-stone-800' : 'bg-white border-stone-200'} border-b z-50`}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-yellow-600 flex items-center justify-center text-black font-bold">M</div>
          <h1 className="font-bold tracking-tighter uppercase">Mahardika</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-stone-100/10">
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded-full hover:bg-stone-100/10">
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Sidebar: Player Stats */}
      <div className={`fixed inset-0 lg:static lg:w-80 ${theme === 'dark' ? 'bg-stone-900 border-stone-800' : 'bg-white border-stone-200'} border-r p-6 flex flex-col gap-6 overflow-y-auto z-40 transition-transform duration-300 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="hidden lg:flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <History className="text-yellow-600" />
            <h2 className="text-xl font-bold uppercase tracking-widest text-yellow-500">Kerajaan</h2>
          </div>
          <button onClick={toggleTheme} className={`p-2 rounded-full ${theme === 'dark' ? 'hover:bg-stone-800 text-yellow-500' : 'hover:bg-stone-100 text-stone-800'}`}>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

        <div className="space-y-4">
          {gameState.players.map((p, idx) => (
            <div 
              key={p.id} 
              className={`p-4 rounded-2xl border-2 transition-all relative overflow-hidden ${gameState.currentPlayerIndex === idx ? (theme === 'dark' ? 'bg-stone-800 border-yellow-600 shadow-[0_0_20px_rgba(202,138,4,0.2)]' : 'bg-yellow-50 border-yellow-500 shadow-md') : (theme === 'dark' ? 'bg-stone-900/50 border-stone-800 opacity-60' : 'bg-stone-50 border-stone-100 opacity-80')}`}
            >
              {/* Character Icon Background */}
              <div className={`absolute -right-4 -bottom-4 opacity-10 ${theme === 'dark' ? 'text-stone-100' : 'text-stone-900'}`}>
                {p.character === CharacterType.GAJAH_MADA && <Shield size={80} />}
                {p.character === CharacterType.MALAHAYATI && <Ship size={80} />}
                {p.character === CharacterType.TUNGGADEWI && <Crown size={80} />}
                {p.character === CharacterType.BAABULLAH && <Anchor size={80} />}
              </div>

              <div className="flex justify-between items-start mb-2 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full border-2 border-white shadow-sm overflow-hidden bg-white">
                    <img src={(CHARACTER_DATA as any)[p.character].avatar} alt={p.character} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className={`font-bold text-sm leading-none ${theme === 'dark' ? 'text-stone-100' : 'text-stone-900'}`}>{p.name}</h3>
                      {p.isAI && (
                        <span className="text-[7px] px-1.5 py-0.5 bg-stone-700 text-stone-300 rounded-full font-bold uppercase tracking-tighter">AI</span>
                      )}
                    </div>
                    <span className="text-[9px] uppercase tracking-widest text-yellow-600 font-bold">{p.character}</span>
                  </div>
                </div>
                <div className={`bg-yellow-600/20 px-2 py-1 rounded text-yellow-600 font-mono text-xs border border-yellow-600/30`}>
                  {p.balance}K
                </div>
              </div>

              <div className={`mt-3 pt-3 border-t ${theme === 'dark' ? 'border-stone-700/50' : 'border-stone-200'} relative z-10`}>
                <p className={`text-[9px] ${theme === 'dark' ? 'text-stone-400' : 'text-stone-500'} italic leading-tight mb-2`}>
                  "{CHARACTER_DATA[p.character].description.split(': ')[1]}"
                </p>
                <div className="flex gap-3">
                  <div className={`flex items-center gap-1 text-[9px] ${theme === 'dark' ? 'text-stone-300' : 'text-stone-600'}`}>
                    <MapIcon size={10} className="text-emerald-500" /> {p.properties.length} Wilayah
                  </div>
                  <div className={`flex items-center gap-1 text-[9px] ${theme === 'dark' ? 'text-stone-300' : 'text-stone-600'}`}>
                    <ScrollText size={10} className="text-blue-500" /> Posisi: {p.position}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-auto pt-6 border-t border-stone-800">
          <h4 className={`text-[10px] uppercase tracking-widest ${theme === 'dark' ? 'text-stone-500' : 'text-stone-400'} mb-4`}>Catatan Sejarah</h4>
          <div className={`h-32 overflow-y-auto text-[10px] space-y-2 font-mono ${theme === 'dark' ? 'opacity-60' : 'opacity-80 text-stone-600'}`}>
            {gameState.logs.map((log, i) => (
              <div key={i} className={`border-l ${theme === 'dark' ? 'border-stone-700' : 'border-stone-200'} pl-2`}>{log}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Game Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 relative overflow-y-auto">
        <Board 
          properties={gameState.properties} 
          players={gameState.players} 
          theme={theme} 
          currentPlayerIndex={gameState.currentPlayerIndex}
          activeAbility={activeAbility}
          onTileClick={handleTileClick}
        />
        
        {/* Controls Overlay */}
        <div className={`mt-6 sm:mt-8 w-full max-w-2xl ${theme === 'dark' ? 'bg-stone-900/90 border-stone-800' : 'bg-white border-stone-200 shadow-xl'} backdrop-blur-md border rounded-3xl p-4 sm:p-6 shadow-2xl z-10`}>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6">
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                <span className="text-[10px] uppercase tracking-widest text-yellow-600 font-bold">Giliran:</span>
                <span className={`text-base sm:text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-stone-900'}`}>{currentPlayer.name}</span>
              </div>
              <p className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-stone-400' : 'text-stone-500'} italic min-h-[2.5rem]`}>
                {currentNarrative || `Menunggu keputusan ${currentPlayer.name}...`}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex gap-2">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 ${theme === 'dark' ? 'bg-white text-black' : 'bg-stone-900 text-white'} rounded-xl flex items-center justify-center text-xl sm:text-2xl font-bold shadow-inner`}>
                  {dice[0]}
                </div>
                <div className={`w-10 h-10 sm:w-12 sm:h-12 ${theme === 'dark' ? 'bg-white text-black' : 'bg-stone-900 text-white'} rounded-xl flex items-center justify-center text-xl sm:text-2xl font-bold shadow-inner`}>
                  {dice[1]}
                </div>
              </div>
              
              <button 
                onClick={rollDice}
                disabled={isRolling || isProcessingTurn || !!currentNarrative}
                className="px-6 sm:px-8 py-3 sm:py-4 bg-yellow-600 hover:bg-yellow-500 text-black font-bold rounded-2xl transition-all disabled:opacity-50 shadow-lg uppercase tracking-widest text-xs sm:text-sm"
              >
                {isRolling ? 'Memutar...' : 'Lempar Dadu'}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {currentNarrative && !isProcessingTurn && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mt-4 sm:mt-6 pt-4 sm:pt-6 border-t ${theme === 'dark' ? 'border-stone-800' : 'border-stone-100'} flex flex-wrap gap-3 sm:gap-4 justify-center`}
              >
                {currentProp.price > 0 && !currentProp.ownerId && (
                  <button 
                    onClick={buyProperty}
                    className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl font-bold transition-all text-xs sm:text-sm"
                  >
                    <Coins size={16} /> Beli {currentProp.name} ({currentProp.price}K)
                  </button>
                )}
                <button 
                  onClick={nextTurn}
                  className={`px-4 sm:px-6 py-2 sm:py-3 ${theme === 'dark' ? 'bg-stone-700 hover:bg-stone-600' : 'bg-stone-200 hover:bg-stone-300 text-stone-800'} rounded-xl font-bold transition-all text-xs sm:text-sm`}
                >
                  Selesaikan Giliran
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {activeQuiz && (
          <QuizDialog quiz={activeQuiz} onAnswer={handleQuizAnswer} />
        )}
      </AnimatePresence>

      {/* Property History Modal */}
      <AnimatePresence>
        {selectedProperty && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProperty(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={`relative w-full max-w-lg ${theme === 'dark' ? 'bg-stone-900 border-stone-800' : 'bg-white border-stone-200'} border rounded-3xl overflow-hidden shadow-2xl`}
            >
              <div className="h-32 sm:h-48 relative">
                <img 
                  src={`https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&q=80&w=800&h=400&seed=${selectedProperty.id}`} 
                  className="w-full h-full object-cover grayscale"
                  alt={selectedProperty.name}
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-transparent to-transparent" />
                <button 
                  onClick={() => setSelectedProperty(null)}
                  className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${theme === 'dark' ? 'bg-stone-800' : 'bg-stone-100'}`}>
                    <MapIcon className="text-yellow-600" size={24} />
                  </div>
                  <div>
                    <h3 className={`text-2xl font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-white' : 'text-stone-900'}`}>
                      {selectedProperty.name}
                    </h3>
                    <span className="text-[10px] uppercase tracking-[0.3em] text-yellow-600 font-bold">
                      Wilayah {selectedProperty.group}
                    </span>
                  </div>
                </div>

                <div className={`mt-6 p-4 rounded-2xl ${theme === 'dark' ? 'bg-stone-800/50' : 'bg-stone-50'} border ${theme === 'dark' ? 'border-stone-700' : 'border-stone-100'}`}>
                  <h4 className={`text-[10px] uppercase tracking-widest ${theme === 'dark' ? 'text-stone-500' : 'text-stone-400'} mb-3 font-bold flex items-center gap-2`}>
                    <ScrollText size={12} /> Catatan Sejarah & Budaya
                  </h4>
                  {isHistoryLoading ? (
                    <div className="flex flex-col gap-2 py-4">
                      <div className="h-2 w-full bg-stone-700/30 rounded animate-pulse" />
                      <div className="h-2 w-3/4 bg-stone-700/30 rounded animate-pulse" />
                      <div className="h-2 w-1/2 bg-stone-700/30 rounded animate-pulse" />
                    </div>
                  ) : (
                    <p className={`text-sm sm:text-base leading-relaxed italic ${theme === 'dark' ? 'text-stone-300' : 'text-stone-600'}`}>
                      {selectedProperty.historyInfo || "Informasi sejarah sedang dalam pencarian..."}
                    </p>
                  )}
                </div>

                <div className="mt-8 flex justify-end">
                  <button 
                    onClick={() => setSelectedProperty(null)}
                    className="px-8 py-3 bg-yellow-600 hover:bg-yellow-500 text-black font-bold rounded-xl transition-all uppercase tracking-widest text-xs"
                  >
                    Tutup Kitab
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
