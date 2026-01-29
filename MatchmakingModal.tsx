'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '@solana/wallet-adapter-react';

interface MatchmakingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MatchmakingModal({ isOpen, onClose }: MatchmakingModalProps) {
  const { publicKey } = useWallet();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    tokenName: '',
    tokenSymbol: '',
    opponentTwitter: '',
    twitterConnected: false,
  });

  const handleSubmit = async () => {
    // In production, this would:
    // 1. Post tweet mentioning @letsgoduel and opponent
    // 2. Wait for opponent acceptance
    // 3. Create duel on-chain
    console.log('Creating duel:', formData);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
          >
            <div className="bg-arena-dark border-2 border-arena-accent rounded-xl p-8 max-w-2xl w-full shadow-2xl border-glow">
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-4xl font-display glow-text">
                  CREATE DUEL
                </h2>
                <button
                  onClick={onClose}
                  className="text-white/60 hover:text-white text-2xl"
                >
                  ✕
                </button>
              </div>

              {/* Progress Steps */}
              <div className="flex items-center justify-between mb-8">
                {[1, 2, 3].map((num) => (
                  <div key={num} className="flex items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-display ${
                        step >= num
                          ? 'bg-arena-accent text-white'
                          : 'bg-gunmetal-800 text-white/40'
                      }`}
                    >
                      {num}
                    </div>
                    {num < 3 && (
                      <div
                        className={`w-24 h-[2px] mx-2 ${
                          step > num ? 'bg-arena-accent' : 'bg-gunmetal-800'
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Step 1: Token Details */}
              {step === 1 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <label className="block text-sm font-mono text-white/60 mb-2">
                      Token Name
                    </label>
                    <input
                      type="text"
                      value={formData.tokenName}
                      onChange={(e) =>
                        setFormData({ ...formData, tokenName: e.target.value })
                      }
                      placeholder="My Awesome Token"
                      className="w-full bg-gunmetal-900/50 border border-white/10 rounded-lg px-6 py-4 text-lg font-mono focus:border-arena-accent focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-mono text-white/60 mb-2">
                      Token Symbol
                    </label>
                    <input
                      type="text"
                      value={formData.tokenSymbol}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          tokenSymbol: e.target.value.toUpperCase(),
                        })
                      }
                      placeholder="MAT"
                      maxLength={10}
                      className="w-full bg-gunmetal-900/50 border border-white/10 rounded-lg px-6 py-4 text-lg font-mono focus:border-arena-accent focus:outline-none"
                    />
                  </div>

                  <button
                    onClick={() => setStep(2)}
                    disabled={!formData.tokenName || !formData.tokenSymbol}
                    className="btn-primary w-full disabled:opacity-50"
                  >
                    Next →
                  </button>
                </motion.div>
              )}

              {/* Step 2: Connect Twitter */}
              {step === 2 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="text-center py-8">
                    <div className="text-6xl mb-4">🐦</div>
                    <h3 className="text-2xl font-display mb-4">
                      Connect Twitter
                    </h3>
                    <p className="text-white/60 mb-6">
                      We'll use your Twitter account to manage duel challenges
                      and acceptances
                    </p>
                    
                    {formData.twitterConnected ? (
                      <div className="inline-flex items-center gap-2 px-6 py-3 bg-green-600/20 border border-green-500 rounded-lg">
                        <span className="text-green-400">✓</span>
                        <span>Connected as @yourhandle</span>
                      </div>
                    ) : (
                      <button
                        onClick={() =>
                          setFormData({ ...formData, twitterConnected: true })
                        }
                        className="btn-primary"
                      >
                        Connect Twitter Account
                      </button>
                    )}
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={() => setStep(1)}
                      className="btn-secondary flex-1"
                    >
                      ← Back
                    </button>
                    <button
                      onClick={() => setStep(3)}
                      disabled={!formData.twitterConnected}
                      className="btn-primary flex-1 disabled:opacity-50"
                    >
                      Next →
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Challenge Opponent */}
              {step === 3 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <label className="block text-sm font-mono text-white/60 mb-2">
                      Opponent's Twitter Handle
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">@</span>
                      <input
                        type="text"
                        value={formData.opponentTwitter}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            opponentTwitter: e.target.value,
                          })
                        }
                        placeholder="rival_trader"
                        className="flex-1 bg-gunmetal-900/50 border border-white/10 rounded-lg px-6 py-4 text-lg font-mono focus:border-arena-accent focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="bg-blood-900/20 border border-blood-500/50 rounded-lg p-6">
                    <div className="text-sm font-mono text-white/80 mb-2">
                      Preview Tweet:
                    </div>
                    <div className="text-white/60 font-mono text-sm">
                      @letsgoduel challenge @{formData.opponentTwitter || 'opponent'}{' '}
                      with ${formData.tokenSymbol}
                      <br />
                      <br />
                      First to 85 SOL wins! 🔥
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={() => setStep(2)}
                      className="btn-secondary flex-1"
                    >
                      ← Back
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={!formData.opponentTwitter}
                      className="btn-primary flex-1 disabled:opacity-50"
                    >
                      Send Challenge 🚀
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
