import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Property, RegionGroup } from '../types';
import { CHARACTER_DATA } from '../constants';

import { Coins, User, Map as MapIcon, History, ScrollText, Shield, Ship, Crown, Anchor, Sun, Moon, Menu, X } from 'lucide-react';

interface BoardProps {
  properties: Property[];
  players: any[];
  theme: 'dark' | 'light';
  currentPlayerIndex: number;
  activeAbility: {playerId: string, type: string} | null;
  onTileClick: (prop: Property) => void;
}

const Board: React.FC<BoardProps> = ({ properties, players, theme, currentPlayerIndex, activeAbility, onTileClick }) => {
  const isDark = theme === 'dark';

  const renderTile = (prop: Property, index: number) => {
    const groupColors: { [key: string]: string } = {
      [RegionGroup.SUMATERA]: isDark ? 'bg-emerald-900' : 'bg-emerald-600',
      [RegionGroup.JAWA]: isDark ? 'bg-red-900' : 'bg-red-600',
      [RegionGroup.SULAWESI]: isDark ? 'bg-amber-700' : 'bg-amber-500',
      [RegionGroup.MALUKU]: isDark ? 'bg-blue-900' : 'bg-blue-600',
      [RegionGroup.TRANSPORT]: isDark ? 'bg-stone-700' : 'bg-stone-400',
      [RegionGroup.RESOURCE]: isDark ? 'bg-orange-900' : 'bg-orange-600',
      [RegionGroup.SPECIAL]: isDark ? 'bg-stone-950' : 'bg-stone-300',
    };

    const playersHere = players.filter(p => p.position === index);

    const getTopography = (group: RegionGroup) => {
      switch(group) {
        case RegionGroup.SUMATERA: return 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&q=80&w=200&h=200&blur=2';
        case RegionGroup.JAWA: return 'https://images.unsplash.com/photo-1555897209-208b67f652c5?auto=format&fit=crop&q=80&w=200&h=200&blur=2';
        case RegionGroup.SULAWESI: return 'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?auto=format&fit=crop&q=80&w=200&h=200&blur=2';
        case RegionGroup.MALUKU: return 'https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?auto=format&fit=crop&q=80&w=200&h=200&blur=2';
        case RegionGroup.TRANSPORT: return 'https://images.unsplash.com/photo-1520440229334-962aee48c9a2?auto=format&fit=crop&q=80&w=200&h=200&blur=2';
        case RegionGroup.RESOURCE: return 'https://images.unsplash.com/photo-1516655855035-d5215bc56041?auto=format&fit=crop&q=80&w=200&h=200&blur=2';
        default: return null;
      }
    };

    const topoImg = getTopography(prop.group);

    return (
      <motion.div 
        key={prop.id} 
        whileHover={{ scale: 1.02, zIndex: 30 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => onTileClick(prop)}
        className={`relative w-full h-full border cursor-pointer ${isDark ? 'border-stone-800/50 bg-stone-100/10' : 'border-stone-300 bg-white'} flex flex-col items-center justify-between p-1 text-[8px] sm:text-[9px] text-center font-serif transition-all overflow-hidden hover:bg-opacity-80 group ${prop.ownerId ? 'ring-2 ring-inset ring-yellow-500/30' : ''}`}
      >
        {topoImg && (
          <div className="absolute inset-0 opacity-20 group-hover:opacity-40 transition-opacity pointer-events-none">
            <img src={topoImg} className="w-full h-full object-cover grayscale" referrerPolicy="no-referrer" />
          </div>
        )}
        <div className={`w-full h-1.5 sm:h-2 ${groupColors[prop.group] || 'bg-stone-500'} mb-1 shadow-inner relative z-10`} />
        <span className={`font-bold leading-tight uppercase tracking-tighter ${isDark ? 'text-stone-300 group-hover:text-white' : 'text-stone-800'} transition-colors relative z-10`}>
          {prop.name}
        </span>
        {prop.price > 0 && (
          <span className={`${isDark ? 'text-yellow-500/80' : 'text-yellow-700'} font-mono text-[7px] sm:text-[8px] relative z-10`}>
            {prop.price}K
          </span>
        )}
        
        {prop.ownerId && (
          <div className="absolute top-0 right-0 p-0.5 z-10">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-yellow-500 shadow-sm animate-pulse" />
          </div>
        )}

        <div className="flex flex-wrap gap-0.5 justify-center mt-auto pb-0.5 sm:pb-1 relative z-10">
          {playersHere.map(p => {
            const isCurrentPlayer = players[currentPlayerIndex]?.id === p.id;
            const isAbilityActive = activeAbility?.playerId === p.id;
            
            return (
              <motion.div 
                key={p.id} 
                layoutId={`player-${p.id}`}
                transition={{ 
                  type: "spring", 
                  stiffness: 200, 
                  damping: 25,
                  layout: { duration: 0.6 }
                }}
                className={`w-4 h-4 sm:w-6 sm:h-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center overflow-hidden relative ${isCurrentPlayer ? 'z-20' : 'z-10'}`}
                style={{ backgroundColor: getPlayerColor(p.character) }}
                title={p.name}
              >
                <motion.img 
                  src={(CHARACTER_DATA as any)[p.character].avatar} 
                  alt={p.character}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  animate={{
                    scale: isCurrentPlayer ? [1, 1.15, 1] : 1,
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
                
                {/* Ability Icon Animation */}
                <AnimatePresence>
                  {isAbilityActive && (
                    <motion.div
                      initial={{ opacity: 0, y: 0, scale: 0.5 }}
                      animate={{ opacity: 1, y: -20, scale: 1.5 }}
                      exit={{ opacity: 0, scale: 2 }}
                      className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
                    >
                      <div className="bg-yellow-500 text-black rounded-full p-1 shadow-xl">
                        {activeAbility.type === 'Crown' && <Crown size={12} />}
                        {activeAbility.type === 'Ship' && <Ship size={12} />}
                        {activeAbility.type === 'Shield' && <Shield size={12} />}
                        {activeAbility.type === 'Anchor' && <Anchor size={12} />}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Active Indicator */}
                {isCurrentPlayer && (
                  <motion.div 
                    layoutId={`active-glow-${p.id}`}
                    className="absolute inset-0 border-2 border-yellow-400 rounded-full"
                    animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.3, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    );
  };

  const getPlayerColor = (char: string) => {
    switch(char) {
      case 'Gajah Mada': return '#059669';
      case 'Laksamana Malahayati': return '#2563eb';
      case 'Tribhuwana Tunggadewi': return '#dc2626';
      case 'Sultan Baabullah': return '#d97706';
      default: return '#57534e';
    }
  };

  const grid = Array(49).fill(null);
  for(let i=0; i<7; i++) grid[42 + i] = properties[i];
  for(let i=0; i<5; i++) grid[35 - i*7 + 6] = properties[7+i];
  for(let i=0; i<7; i++) grid[6 - i] = properties[12+i];
  for(let i=0; i<5; i++) grid[7 + i*7] = properties[19+i];

  return (
    <div className={`aspect-square w-full max-w-[650px] ${isDark ? 'bg-stone-900 border-stone-800 shadow-[0_0_50px_rgba(0,0,0,0.5)]' : 'bg-stone-100 border-stone-200 shadow-xl'} border-4 sm:border-8 rounded-xl p-0.5 sm:p-1 grid grid-cols-7 grid-rows-7 gap-0.5 relative overflow-hidden`}>
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <img 
          src="https://picsum.photos/seed/map/1000/1000?grayscale" 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      </div>

      {grid.map((prop, i) => (
        prop ? renderTile(prop, properties.indexOf(prop)) : <div key={i} className="bg-transparent" />
      ))}
      
      <div className="col-start-2 col-end-7 row-start-2 row-end-7 flex flex-col items-center justify-center p-2 sm:p-6 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`border-2 ${isDark ? 'border-stone-700/50 bg-stone-950/30' : 'border-stone-300 bg-white/50'} p-4 sm:p-8 rounded-full backdrop-blur-sm`}
        >
          <h1 className={`text-3xl sm:text-6xl font-black ${isDark ? 'text-yellow-600' : 'text-yellow-700'} tracking-tighter uppercase mb-0.5 sm:mb-1 font-serif italic drop-shadow-2xl`}>
            MAHARDIKA
          </h1>
          <p className={`text-[7px] sm:text-[10px] ${isDark ? 'text-stone-500' : 'text-stone-600'} font-serif tracking-[0.3em] uppercase opacity-80`}>
            Kejayaan Kepulauan
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Board;
