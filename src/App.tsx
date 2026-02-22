import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Trophy, AlertCircle, ChevronRight, Info, Languages } from 'lucide-react';
import { Card, Suit, GameStatus } from './types';
import { createDeck, canPlayCard, getSuitSymbol, getSuitColor } from './utils';
import { translations, Language } from './i18n';

const INITIAL_HAND_SIZE = 8;

export default function App() {
  const [language, setLanguage] = useState<Language>('en');
  const [deck, setDeck] = useState<Card[]>([]);
  const [discardPile, setDiscardPile] = useState<Card[]>([]);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [aiHand, setAiHand] = useState<Card[]>([]);
  const [currentTurn, setCurrentTurn] = useState<'player' | 'ai'>('player');
  const [currentSuit, setCurrentSuit] = useState<Suit | null>(null);
  const [status, setStatus] = useState<GameStatus>('home');
  const [message, setMessage] = useState<string>("");

  const t = translations[language];

  useEffect(() => {
    if (status === 'home') {
      setMessage(t.welcome);
    }
  }, [language, status, t.welcome]);

  // Initialize Game
  const initGame = useCallback(() => {
    const newDeck = createDeck();
    const pHand = newDeck.splice(0, INITIAL_HAND_SIZE);
    const aHand = newDeck.splice(0, INITIAL_HAND_SIZE);
    
    let firstDiscard = newDeck.pop()!;
    while (firstDiscard.rank === '8') {
      newDeck.unshift(firstDiscard);
      firstDiscard = newDeck.pop()!;
    }

    setDeck(newDeck);
    setPlayerHand(pHand);
    setAiHand(aHand);
    setDiscardPile([firstDiscard]);
    setCurrentTurn('player');
    setCurrentSuit(null);
    setStatus('playing');
    setMessage(t.matchMsg);
  }, [t.matchMsg]);

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'zh' : 'en');
  };

  const checkWinCondition = (hand: Card[], turn: 'player' | 'ai') => {
    if (hand.length === 0) {
      setStatus(turn === 'player' ? 'won' : 'lost');
      setMessage(turn === 'player' ? t.victory : t.defeat);
      return true;
    }
    return false;
  };

  const drawCard = (turn: 'player' | 'ai') => {
    if (deck.length === 0) {
      setMessage(t.deckEmpty);
      setCurrentTurn(turn === 'player' ? 'ai' : 'player');
      return;
    }

    const newDeck = [...deck];
    const card = newDeck.pop()!;
    setDeck(newDeck);

    if (turn === 'player') {
      setPlayerHand([...playerHand, card]);
      setMessage(t.playerDrew);
    } else {
      setAiHand([...aiHand, card]);
      setMessage(t.aiDrew);
      setCurrentTurn('player');
    }
  };

  const playCard = (card: Card, turn: 'player' | 'ai') => {
    const topCard = discardPile[discardPile.length - 1];
    
    if (!canPlayCard(card, topCard, currentSuit)) return;

    if (turn === 'player') {
      const newHand = playerHand.filter(c => c.id !== card.id);
      setPlayerHand(newHand);
      setDiscardPile([...discardPile, card]);
      
      if (card.rank === '8') {
        setStatus('waiting_for_suit');
        setMessage(t.chooseSuit);
      } else {
        setCurrentSuit(null);
        if (!checkWinCondition(newHand, 'player')) {
          setCurrentTurn('ai');
          setMessage(t.aiThinking);
        }
      }
    } else {
      const newHand = aiHand.filter(c => c.id !== card.id);
      setAiHand(newHand);
      setDiscardPile([...discardPile, card]);
      
      if (card.rank === '8') {
        const suits = newHand.map(c => c.suit);
        const mostFrequentSuit = suits.sort((a,b) =>
          suits.filter(v => v===a).length - suits.filter(v => v===b).length
        ).pop() || 'hearts';
        setCurrentSuit(mostFrequentSuit as Suit);
        const suitName = (t as any)[mostFrequentSuit];
        setMessage(t.aiChangedSuit.replace('{suit}', suitName));
      } else {
        setCurrentSuit(null);
        const suitName = (t as any)[card.suit];
        setMessage(t.aiPlayed.replace('{rank}', card.rank).replace('{suit}', suitName));
      }

      if (!checkWinCondition(newHand, 'ai')) {
        setCurrentTurn('player');
      }
    }
  };

  // AI Turn Logic
  useEffect(() => {
    if (currentTurn === 'ai' && status === 'playing') {
      const timer = setTimeout(() => {
        const topCard = discardPile[discardPile.length - 1];
        const playableCards = aiHand.filter(c => canPlayCard(c, topCard, currentSuit));

        if (playableCards.length > 0) {
          const normalCards = playableCards.filter(c => c.rank !== '8');
          const cardToPlay = normalCards.length > 0 ? normalCards[0] : playableCards[0];
          playCard(cardToPlay, 'ai');
        } else {
          drawCard('ai');
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [currentTurn, aiHand, discardPile, currentSuit, status]);

  const handleSuitSelection = (suit: Suit) => {
    setCurrentSuit(suit);
    setStatus('playing');
    setCurrentTurn('ai');
    const suitName = (t as any)[suit];
    setMessage(t.playerChangedSuit.replace('{suit}', suitName));
  };

  const topCard = discardPile[discardPile.length - 1];

  if (status === 'home') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0093E9] to-[#80D0C7] text-white font-sans flex flex-col items-center justify-center p-4 overflow-hidden relative">
        {/* Decorative Sun */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-yellow-200/20 rounded-full blur-3xl animate-pulse" />
        
        {/* Language Toggle */}
        <button 
          onClick={toggleLanguage}
          className="absolute top-8 right-8 flex items-center gap-2 bg-white/20 backdrop-blur-md hover:bg-white/30 px-4 py-2 rounded-full transition-colors z-50 border border-white/20 shadow-lg"
        >
          <Languages className="w-4 h-4" />
          <span className="text-sm font-bold">{language === 'en' ? '中文' : 'English'}</span>
        </button>

        {/* Background Decorations */}
        <div className="absolute top-10 left-10 opacity-20 rotate-12">
          <div className="w-32 h-48 bg-white/80 backdrop-blur-sm rounded-2xl border-4 border-white/40 shadow-2xl" />
        </div>
        <div className="absolute bottom-10 right-10 opacity-20 -rotate-12">
          <div className="w-32 h-48 bg-white/80 backdrop-blur-sm rounded-2xl border-4 border-white/40 shadow-2xl" />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center z-10"
        >
          <motion.div
            animate={{ rotate: [0, -5, 5, 0], y: [0, -10, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="inline-block mb-8"
          >
            <div className="relative">
              <div className="w-24 h-36 bg-white rounded-xl shadow-2xl flex items-center justify-center text-slate-900 border-2 border-slate-100 transform -rotate-12 translate-x-4">
                <span className="text-4xl font-black text-orange-500">8</span>
              </div>
              <div className="absolute top-0 left-0 w-24 h-36 bg-white rounded-xl shadow-2xl flex items-center justify-center text-slate-900 border-2 border-slate-100 transform rotate-12 -translate-x-4">
                <span className="text-4xl font-black text-sky-600">8</span>
              </div>
            </div>
          </motion.div>

          <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-4 drop-shadow-2xl text-white">
            {t.title.split(' ')[0]} <span className="text-yellow-300">{t.title.split(' ')[1] || ''}</span>
          </h1>
          <p className="text-xl md:text-2xl font-medium text-white/80 mb-12 tracking-wide uppercase">
            {t.subtitle}
          </p>

          <div className="flex flex-col gap-4 items-center">
            <motion.button
              whileHover={{ scale: 1.05, backgroundColor: '#ffffff' }}
              whileTap={{ scale: 0.95 }}
              onClick={initGame}
              className="px-12 py-5 bg-white/90 backdrop-blur-md text-sky-900 rounded-2xl font-black text-2xl shadow-xl hover:shadow-2xl transition-all flex items-center gap-3 border border-white/50"
            >
              {t.startGame}
              <ChevronRight className="w-8 h-8" />
            </motion.button>
            
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 text-left max-w-3xl">
              <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20 shadow-lg">
                <h3 className="font-bold text-yellow-300 mb-2 uppercase text-xs tracking-widest">{t.goalTitle}</h3>
                <p className="text-sm text-white/90">{t.goalDesc}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20 shadow-lg">
                <h3 className="font-bold text-yellow-300 mb-2 uppercase text-xs tracking-widest">{t.matchingTitle}</h3>
                <p className="text-sm text-white/90">{t.matchingDesc}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20 shadow-lg">
                <h3 className="font-bold text-yellow-300 mb-2 uppercase text-xs tracking-widest">{t.wild8Title}</h3>
                <p className="text-sm text-white/90">{t.wild8Desc}</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!topCard) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0093E9] to-[#80D0C7] flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 animate-spin text-yellow-300" />
          <p className="font-mono text-sm tracking-widest opacity-80 uppercase">{t.shuffling}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0093E9] to-[#80D0C7] text-white font-sans p-4 md:p-8 flex flex-col items-center justify-between overflow-hidden relative">
      {/* Decorative Waves */}
      <div className="absolute bottom-0 left-0 w-full h-32 opacity-20 pointer-events-none">
        <svg viewBox="0 0 1440 320" className="w-full h-full preserve-3d">
          <path fill="#ffffff" d="M0,192L48,197.3C96,203,192,213,288,229.3C384,245,480,267,576,250.7C672,235,768,181,864,181.3C960,181,1056,235,1152,234.7C1248,235,1344,181,1392,154.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
        </svg>
      </div>

      {/* Header */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <div className="bg-white/10 p-2 rounded-lg">
            <RefreshCw 
              className="w-5 h-5 cursor-pointer hover:rotate-180 transition-transform duration-500" 
              onClick={initGame}
            />
          </div>
          <h1 className="text-xl font-bold tracking-tight">{t.title}</h1>
          <button 
            onClick={toggleLanguage}
            className="ml-4 bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-colors"
            title={language === 'en' ? '切换到中文' : 'Switch to English'}
          >
            <Languages className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm font-mono bg-black/20 px-3 py-1 rounded-full border border-white/10">
            {t.deck}: {deck.length}
          </div>
          <div className={`text-sm font-bold px-4 py-1 rounded-full transition-colors ${currentTurn === 'player' ? 'bg-sky-500' : 'bg-orange-400'}`}>
            {currentTurn === 'player' ? t.yourTurn : t.aiTurn}
          </div>
        </div>
      </div>

      {/* AI Hand */}
      <div className="relative w-full max-w-4xl h-32 flex justify-center items-center mb-8">
        <div className="flex -space-x-8 md:-space-x-12">
          {aiHand.map((card, index) => (
            <motion.div
              key={card.id}
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: index * 0.05 }}
              className="w-20 h-28 md:w-24 md:h-36 bg-slate-800 rounded-xl border-2 border-slate-700 shadow-xl flex items-center justify-center"
            >
              <div className="w-full h-full rounded-lg bg-[repeating-linear-gradient(45deg,#1e293b,#1e293b_10px,#334155_10px,#334155_20px)] opacity-50" />
            </motion.div>
          ))}
        </div>
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black/40 px-3 py-1 rounded-full text-xs font-mono border border-white/10">
          {t.aiHand}: {aiHand.length}
        </div>
      </div>

      {/* Table Center */}
      <div className="flex-1 w-full max-w-4xl flex flex-col md:flex-row items-center justify-center gap-12 md:gap-24">
        {/* Draw Pile */}
        <div className="relative group cursor-pointer" onClick={() => currentTurn === 'player' && drawCard('player')}>
          <div className="w-24 h-36 md:w-32 md:h-48 bg-slate-800 rounded-2xl border-2 border-slate-700 shadow-2xl flex items-center justify-center transform group-hover:-translate-y-2 transition-transform">
             <div className="w-full h-full rounded-xl bg-[repeating-linear-gradient(45deg,#1e293b,#1e293b_10px,#334155_10px,#334155_20px)]" />
             <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-4xl font-bold opacity-20">?</span>
             </div>
          </div>
          {deck.length > 1 && <div className="absolute top-1 left-1 w-full h-full bg-slate-800 rounded-2xl border-2 border-slate-700 -z-10" />}
          {deck.length > 2 && <div className="absolute top-2 left-2 w-full h-full bg-slate-800 rounded-2xl border-2 border-slate-700 -z-20" />}
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs font-mono opacity-60 uppercase tracking-widest">{t.drawPile}</div>
        </div>

        {/* Discard Pile */}
        <div className="relative">
          <AnimatePresence mode="popLayout">
            <motion.div
              key={topCard.id}
              initial={{ scale: 0.8, opacity: 0, rotate: -10 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              className="w-24 h-36 md:w-32 md:h-48 bg-white rounded-2xl border-2 border-slate-200 shadow-2xl flex flex-col p-3 md:p-4 text-slate-900"
            >
              <div className={`text-xl md:text-2xl font-bold leading-none ${getSuitColor(topCard.suit)}`}>
                {topCard.rank}
              </div>
              <div className={`text-lg md:text-xl ${getSuitColor(topCard.suit)}`}>
                {getSuitSymbol(topCard.suit)}
              </div>
              <div className="flex-1 flex items-center justify-center">
                <span className={`text-4xl md:text-6xl ${getSuitColor(topCard.suit)}`}>
                  {getSuitSymbol(topCard.suit)}
                </span>
              </div>
              <div className={`text-xl md:text-2xl font-bold leading-none self-end rotate-180 ${getSuitColor(topCard.suit)}`}>
                {topCard.rank}
              </div>
            </motion.div>
          </AnimatePresence>
          
          {currentSuit && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute -top-12 left-1/2 -translate-x-1/2 bg-white text-slate-900 px-4 py-1 rounded-full shadow-lg flex items-center gap-2 whitespace-nowrap"
            >
              <span className="text-xs font-bold uppercase">{t.targetSuit}:</span>
              <span className={`text-xl ${getSuitColor(currentSuit)}`}>{getSuitSymbol(currentSuit)}</span>
            </motion.div>
          )}
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs font-mono opacity-60 uppercase tracking-widest">{t.discard}</div>
        </div>
      </div>

      {/* Status Message */}
      <div className="my-6 px-6 py-2 bg-white/20 backdrop-blur-md rounded-full border border-white/20 flex items-center gap-3 shadow-lg">
        <Info className="w-4 h-4 text-sky-200" />
        <p className="text-sm font-medium tracking-wide">{message}</p>
      </div>

      {/* Player Hand */}
      <div className="w-full max-w-5xl h-48 flex justify-center items-end pb-4">
        <div className="flex -space-x-6 md:-space-x-10 hover:-space-x-4 md:hover:-space-x-6 transition-all duration-300">
          {playerHand.map((card) => {
            const playable = currentTurn === 'player' && status === 'playing' && canPlayCard(card, topCard, currentSuit);
            return (
              <motion.div
                key={card.id}
                layoutId={card.id}
                whileHover={playable ? { y: -30, scale: 1.1, zIndex: 50 } : {}}
                onClick={() => playable && playCard(card, 'player')}
                className={`w-20 h-28 md:w-28 md:h-40 bg-white rounded-xl border-2 shadow-xl flex flex-col p-2 md:p-3 text-slate-900 cursor-pointer transition-all ${
                  playable ? 'border-sky-400 ring-4 ring-sky-400/30' : 'border-slate-100 opacity-80 grayscale-[0.2]'
                }`}
              >
                <div className={`text-lg md:text-xl font-bold leading-none ${getSuitColor(card.suit)}`}>
                  {card.rank}
                </div>
                <div className={`text-sm md:text-md ${getSuitColor(card.suit)}`}>
                  {getSuitSymbol(card.suit)}
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <span className={`text-3xl md:text-5xl ${getSuitColor(card.suit)}`}>
                    {getSuitSymbol(card.suit)}
                  </span>
                </div>
                <div className={`text-lg md:text-xl font-bold leading-none self-end rotate-180 ${getSuitColor(card.suit)}`}>
                  {card.rank}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {status === 'waiting_for_suit' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-slate-900 border border-white/10 rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center"
            >
              <h2 className="text-2xl font-bold mb-2">{t.wildcardTitle}</h2>
              <p className="text-slate-400 mb-8">{t.wildcardDesc}</p>
              <div className="grid grid-cols-2 gap-4">
                {(['hearts', 'diamonds', 'clubs', 'spades'] as Suit[]).map((suit) => (
                  <button
                    key={suit}
                    onClick={() => handleSuitSelection(suit)}
                    className="flex flex-col items-center justify-center p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-colors group"
                  >
                    <span className={`text-4xl mb-2 group-hover:scale-125 transition-transform ${getSuitColor(suit)}`}>
                      {getSuitSymbol(suit)}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-widest opacity-60">{(t as any)[suit]}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}

        {(status === 'won' || status === 'lost') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.8, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-slate-900 border border-white/20 rounded-[2.5rem] p-12 max-w-md w-full shadow-2xl text-center relative overflow-hidden"
            >
              {status === 'won' && (
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-yellow-500 to-emerald-500" />
              )}
              <div className="mb-6 flex justify-center">
                {status === 'won' ? (
                  <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center">
                    <Trophy className="w-10 h-10 text-emerald-500" />
                  </div>
                ) : (
                  <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-10 h-10 text-red-500" />
                  </div>
                )}
              </div>
              <h2 className="text-4xl font-black mb-4 tracking-tight">
                {status === 'won' ? t.victory : t.defeat}
              </h2>
              <p className="text-slate-400 mb-10 leading-relaxed">
                {status === 'won' ? t.winMsg : t.loseMsg}
              </p>
              <button
                onClick={initGame}
                className="w-full py-4 bg-white text-slate-900 rounded-2xl font-bold text-lg hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
              >
                {t.playAgain}
                <ChevronRight className="w-5 h-5" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
