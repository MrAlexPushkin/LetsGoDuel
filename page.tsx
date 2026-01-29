'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DuelArena } from '@/components/DuelArena';
import { MatchmakingModal } from '@/components/MatchmakingModal';
import { ActiveDuelsList } from '@/components/ActiveDuelsList';
import { useSocket } from '@/components/SocketProvider';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export default function Home() {
  const [selectedDuel, setSelectedDuel] = useState<string | null>(null);
  const [showMatchmaking, setShowMatchmaking] = useState(false);
  const { activeDuels } = useSocket();
  const { connected } = useWallet();

  return (
    <main className="min-h-screen relative z-10">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-md bg-arena-dark/50 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4"
          >
            <h1 className="text-4xl font-display glow-text">
              LETSGODUEL
            </h1>
            <div className="h-8 w-[2px] bg-gradient-to-b from-transparent via-arena-accent to-transparent" />
            <span className="text-sm font-mono text-white/50 uppercase">
              More gunpowder for pump.fun
            </span>
          </motion.div>

          <div className="flex items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowMatchmaking(true)}
              className="btn-primary"
              disabled={!connected}
            >
              Create Duel
            </motion.button>
            
            <WalletMultiButton className="!bg-transparent !border-2 !border-white/20 hover:!border-arena-accent !transition-all" />
          </div>
        </div>
      </header>

      {/* Scan line effect */}
      <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
        <div className="absolute w-full h-[2px] bg-gradient-to-r from-transparent via-arena-accent/50 to-transparent animate-scan" />
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {selectedDuel ? (
            <motion.div
              key="arena"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <DuelArena 
                duelPubkey={selectedDuel} 
                onBack={() => setSelectedDuel(null)}
              />
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Hero Section */}
              <div className="mb-12 text-center">
                <motion.h2 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-7xl font-display mb-4 glow-text"
                >
                  THE ARENA
                </motion.h2>
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-xl text-white/60 font-mono"
                >
                  Two tokens enter. One reaches 85 SOL and migrates to Raydium.
                </motion.p>
              </div>

              {/* Stats Bar */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="grid grid-cols-3 gap-6 mb-12"
              >
                <div className="stat-card border-glow">
                  <div className="text-3xl font-display glow-text mb-2">
                    {activeDuels.filter(d => d.isActive).length}
                  </div>
                  <div className="text-sm text-white/50 uppercase font-mono">
                    Active Duels
                  </div>
                </div>
                
                <div className="stat-card border-glow">
                  <div className="text-3xl font-display text-arena-gold mb-2">
                    {activeDuels.filter(d => d.winner).length}
                  </div>
                  <div className="text-sm text-white/50 uppercase font-mono">
                    Completed
                  </div>
                </div>
                
                <div className="stat-card border-glow">
                  <div className="text-3xl font-display text-white mb-2">
                    {activeDuels.reduce((sum, d) => sum + d.tokenASolRaised + d.tokenBSolRaised, 0).toFixed(2)} SOL
                  </div>
                  <div className="text-sm text-white/50 uppercase font-mono">
                    Total Volume
                  </div>
                </div>
              </motion.div>

              {/* Active Duels */}
              <ActiveDuelsList 
                duels={activeDuels}
                onSelectDuel={setSelectedDuel}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Matchmaking Modal */}
      <MatchmakingModal 
        isOpen={showMatchmaking}
        onClose={() => setShowMatchmaking(false)}
      />

      {/* Footer */}
      <footer className="border-t border-white/10 mt-20">
        <div className="container mx-auto px-6 py-8 text-center">
          <p className="text-white/40 font-mono text-sm">
            Designed for Alexander Pushkin. Built on Solana.
          </p>
        </div>
      </footer>
    </main>
  );
}
