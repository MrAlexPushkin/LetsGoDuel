'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { useSocket } from './SocketProvider';
import { useWallet } from '@solana/wallet-adapter-react';

interface DuelArenaProps {
  duelPubkey: string;
  onBack: () => void;
}

export function DuelArena({ duelPubkey, onBack }: DuelArenaProps) {
  const { subscribeDuel, unsubscribeDuel, duelStates } = useSocket();
  const { publicKey } = useWallet();
  const [buyAmount, setBuyAmount] = useState('');
  const [selectedSide, setSelectedSide] = useState<'A' | 'B'>('A');
  
  const duel = duelStates[duelPubkey];

  useEffect(() => {
    subscribeDuel(duelPubkey);
    return () => unsubscribeDuel(duelPubkey);
  }, [duelPubkey, subscribeDuel, unsubscribeDuel]);

  if (!duel) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-2xl font-display text-white/50 animate-pulse">
          Loading arena...
        </div>
      </div>
    );
  }

  const progressA = (duel.tokenASolRaised / duel.targetSol) * 100;
  const progressB = (duel.tokenBSolRaised / duel.targetSol) * 100;

  return (
    <div className="space-y-8">
      {/* Back Button */}
      <motion.button
        whileHover={{ x: -5 }}
        onClick={onBack}
        className="text-white/60 hover:text-white flex items-center gap-2 font-mono"
      >
        <span>←</span> Back to Arena
      </motion.button>

      {/* Duel Header */}
      <div className="grid grid-cols-3 gap-8 items-center">
        <motion.div 
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="stat-card border-glow text-center"
        >
          <div className="text-5xl font-display glow-text mb-4">
            {duel.tokenASymbol}
          </div>
          <div className="text-2xl font-mono mb-2">
            {duel.tokenASolRaised.toFixed(2)} SOL
          </div>
          <div className="text-sm text-white/50">
            {progressA.toFixed(1)}% to victory
          </div>
        </motion.div>

        <div className="text-center">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-8xl font-display glow-text mb-4"
          >
            VS
          </motion.div>
          {duel.winner && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-arena-gold font-display text-2xl"
            >
              🏆 {duel.winner === 'A' ? duel.tokenASymbol : duel.tokenBSymbol} WINS!
            </motion.div>
          )}
        </div>

        <motion.div 
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="stat-card border-glow text-center"
        >
          <div className="text-5xl font-display text-blood-500 mb-4">
            {duel.tokenBSymbol}
          </div>
          <div className="text-2xl font-mono mb-2">
            {duel.tokenBSolRaised.toFixed(2)} SOL
          </div>
          <div className="text-sm text-white/50">
            {progressB.toFixed(1)}% to victory
          </div>
        </motion.div>
      </div>

      {/* Progress Bars */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="mb-2 text-sm font-mono text-white/60">
            Token A Progress
          </div>
          <div className="h-4 bg-gunmetal-900 rounded-full overflow-hidden border border-white/10">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressA}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-arena-accent to-blood-500 animate-glow"
            />
          </div>
        </div>
        
        <div>
          <div className="mb-2 text-sm font-mono text-white/60">
            Token B Progress
          </div>
          <div className="h-4 bg-gunmetal-900 rounded-full overflow-hidden border border-white/10">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressB}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-blood-500 to-arena-accent animate-glow"
            />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-8">
        <div className="stat-card">
          <h3 className="text-xl font-display mb-4 glow-text">
            {duel.tokenASymbol} Chart
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={generateMockData(progressA)}>
                <XAxis 
                  dataKey="time" 
                  stroke="#ffffff20"
                  style={{ fontSize: '12px', fontFamily: 'monospace' }}
                />
                <YAxis 
                  stroke="#ffffff20"
                  style={{ fontSize: '12px', fontFamily: 'monospace' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0a0a0f', 
                    border: '1px solid #ff0055',
                    borderRadius: '8px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#ff0055" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="stat-card">
          <h3 className="text-xl font-display mb-4 text-blood-500">
            {duel.tokenBSymbol} Chart
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={generateMockData(progressB)}>
                <XAxis 
                  dataKey="time" 
                  stroke="#ffffff20"
                  style={{ fontSize: '12px', fontFamily: 'monospace' }}
                />
                <YAxis 
                  stroke="#ffffff20"
                  style={{ fontSize: '12px', fontFamily: 'monospace' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0a0a0f', 
                    border: '1px solid #dc2626',
                    borderRadius: '8px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#dc2626" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Trading Interface */}
      {!duel.winner && duel.isActive && (
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="stat-card border-glow"
        >
          <h3 className="text-2xl font-display mb-6 glow-text">
            PLACE YOUR BET
          </h3>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => setSelectedSide('A')}
              className={`p-6 rounded-lg border-2 transition-all ${
                selectedSide === 'A'
                  ? 'border-arena-accent bg-arena-accent/20'
                  : 'border-white/10 hover:border-white/30'
              }`}
            >
              <div className="text-3xl font-display glow-text mb-2">
                {duel.tokenASymbol}
              </div>
              <div className="text-sm text-white/60 font-mono">
                Current: {duel.tokenASolRaised.toFixed(2)} SOL
              </div>
            </button>
            
            <button
              onClick={() => setSelectedSide('B')}
              className={`p-6 rounded-lg border-2 transition-all ${
                selectedSide === 'B'
                  ? 'border-blood-500 bg-blood-500/20'
                  : 'border-white/10 hover:border-white/30'
              }`}
            >
              <div className="text-3xl font-display text-blood-500 mb-2">
                {duel.tokenBSymbol}
              </div>
              <div className="text-sm text-white/60 font-mono">
                Current: {duel.tokenBSolRaised.toFixed(2)} SOL
              </div>
            </button>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-mono text-white/60 mb-2">
              Amount (SOL)
            </label>
            <input
              type="number"
              value={buyAmount}
              onChange={(e) => setBuyAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-gunmetal-900/50 border border-white/10 rounded-lg px-6 py-4 text-2xl font-mono focus:border-arena-accent focus:outline-none"
            />
          </div>

          <button
            disabled={!publicKey || !buyAmount}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            BUY {selectedSide === 'A' ? duel.tokenASymbol : duel.tokenBSymbol}
          </button>
        </motion.div>
      )}
    </div>
  );
}

// Mock data generator for charts
function generateMockData(progress: number) {
  const points = 20;
  return Array.from({ length: points }, (_, i) => ({
    time: `${i}m`,
    value: (Math.random() * progress * 0.3) + (progress * i / points),
  }));
}
