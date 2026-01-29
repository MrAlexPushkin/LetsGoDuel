'use client';

import { motion } from 'framer-motion';

interface Duel {
  duelPubkey: string;
  tokenASymbol: string;
  tokenBSymbol: string;
  tokenASolRaised: number;
  tokenBSolRaised: number;
  isActive: boolean;
  winner: 'A' | 'B' | null;
  createdAt: number;
}

interface ActiveDuelsListProps {
  duels: Duel[];
  onSelectDuel: (pubkey: string) => void;
}

export function ActiveDuelsList({ duels, onSelectDuel }: ActiveDuelsListProps) {
  const activeDuels = duels.filter(d => d.isActive && !d.winner);
  const completedDuels = duels.filter(d => d.winner);

  return (
    <div className="space-y-8">
      {/* Active Duels */}
      <div>
        <h3 className="text-3xl font-display mb-6 glow-text">
          ACTIVE DUELS
        </h3>
        
        {activeDuels.length === 0 ? (
          <div className="stat-card text-center py-12">
            <div className="text-6xl mb-4">⚔️</div>
            <div className="text-xl text-white/60 font-mono">
              No active duels. Create one to get started!
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            {activeDuels.map((duel, index) => (
              <motion.div
                key={duel.duelPubkey}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => onSelectDuel(duel.duelPubkey)}
                className="stat-card arena-border cursor-pointer hover:border-arena-accent group"
              >
                <div className="grid grid-cols-3 gap-6 items-center">
                  {/* Token A */}
                  <div>
                    <div className="text-3xl font-display glow-text mb-2 group-hover:scale-110 transition-transform">
                      {duel.tokenASymbol}
                    </div>
                    <div className="text-xl font-mono text-white/80">
                      {duel.tokenASolRaised.toFixed(2)} SOL
                    </div>
                    <div className="text-sm text-white/50">
                      {((duel.tokenASolRaised / 85) * 100).toFixed(1)}%
                    </div>
                  </div>

                  {/* VS & Progress */}
                  <div className="text-center">
                    <div className="text-4xl font-display text-white/40 mb-4">
                      VS
                    </div>
                    <div className="relative h-2 bg-gunmetal-900 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(duel.tokenASolRaised / (duel.tokenASolRaised + duel.tokenBSolRaised)) * 100}%` }}
                        className="absolute left-0 h-full bg-arena-accent"
                      />
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(duel.tokenBSolRaised / (duel.tokenASolRaised + duel.tokenBSolRaised)) * 100}%` }}
                        className="absolute right-0 h-full bg-blood-500"
                      />
                    </div>
                  </div>

                  {/* Token B */}
                  <div className="text-right">
                    <div className="text-3xl font-display text-blood-500 mb-2 group-hover:scale-110 transition-transform">
                      {duel.tokenBSymbol}
                    </div>
                    <div className="text-xl font-mono text-white/80">
                      {duel.tokenBSolRaised.toFixed(2)} SOL
                    </div>
                    <div className="text-sm text-white/50">
                      {((duel.tokenBSolRaised / 85) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Completed Duels */}
      {completedDuels.length > 0 && (
        <div>
          <h3 className="text-3xl font-display mb-6 text-arena-gold">
            HALL OF CHAMPIONS
          </h3>
          
          <div className="grid gap-4">
            {completedDuels.map((duel, index) => (
              <motion.div
                key={duel.duelPubkey}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => onSelectDuel(duel.duelPubkey)}
                className="stat-card border-arena-gold/30 cursor-pointer hover:border-arena-gold group"
              >
                <div className="grid grid-cols-3 gap-6 items-center">
                  {/* Token A */}
                  <div className={duel.winner === 'A' ? '' : 'opacity-50'}>
                    <div className="text-2xl font-display mb-2 flex items-center gap-2">
                      {duel.winner === 'A' && <span>🏆</span>}
                      <span className={duel.winner === 'A' ? 'text-arena-gold' : ''}>
                        {duel.tokenASymbol}
                      </span>
                    </div>
                    <div className="text-lg font-mono text-white/60">
                      {duel.tokenASolRaised.toFixed(2)} SOL
                    </div>
                  </div>

                  {/* Winner Badge */}
                  <div className="text-center">
                    <div className="text-lg font-display text-arena-gold">
                      MIGRATED TO RAYDIUM
                    </div>
                  </div>

                  {/* Token B */}
                  <div className={`text-right ${duel.winner === 'B' ? '' : 'opacity-50'}`}>
                    <div className="text-2xl font-display mb-2 flex items-center gap-2 justify-end">
                      <span className={duel.winner === 'B' ? 'text-arena-gold' : ''}>
                        {duel.tokenBSymbol}
                      </span>
                      {duel.winner === 'B' && <span>🏆</span>}
                    </div>
                    <div className="text-lg font-mono text-white/60">
                      {duel.tokenBSolRaised.toFixed(2)} SOL
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
