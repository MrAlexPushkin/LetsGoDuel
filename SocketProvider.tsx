'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';

interface DuelState {
  duelPubkey: string;
  tokenAMint: string;
  tokenBMint: string;
  founderA: string;
  founderB: string;
  tokenASolRaised: number;
  tokenBSolRaised: number;
  tokenASupply: number;
  tokenBSupply: number;
  tokenAName: string;
  tokenASymbol: string;
  tokenBName: string;
  tokenBSymbol: string;
  winner: 'A' | 'B' | null;
  isActive: boolean;
  createdAt: number;
  targetSol: number;
}

interface TradeUpdate {
  duel: DuelState;
  event: {
    type: string;
    signature: string;
    timestamp: number;
  };
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  activeDuels: DuelState[];
  duelStates: Record<string, DuelState>;
  subscribeDuel: (duelPubkey: string) => void;
  unsubscribeDuel: (duelPubkey: string) => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  activeDuels: [],
  duelStates: {},
  subscribeDuel: () => {},
  unsubscribeDuel: () => {},
});

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeDuels, setActiveDuels] = useState<DuelState[]>([]);
  const [duelStates, setDuelStates] = useState<Record<string, DuelState>>({});

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    newSocket.on('connect', () => {
      console.log('🔌 Connected to LetsGoDuel backend');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('🔌 Disconnected from backend');
      setIsConnected(false);
    });

    // Listen for initial active duels list
    newSocket.on('active_duels', (duels: DuelState[]) => {
      console.log('📋 Received active duels:', duels.length);
      setActiveDuels(duels);
      
      // Initialize duel states
      const statesMap: Record<string, DuelState> = {};
      duels.forEach(duel => {
        statesMap[duel.duelPubkey] = duel;
      });
      setDuelStates(statesMap);
    });

    // Listen for individual duel state updates
    newSocket.on('duel_state', (duel: DuelState) => {
      setDuelStates(prev => ({
        ...prev,
        [duel.duelPubkey]: duel,
      }));
    });

    // Listen for trade updates
    newSocket.on('trade_update', (update: TradeUpdate) => {
      console.log('💰 Trade update:', update);
      
      setDuelStates(prev => ({
        ...prev,
        [update.duel.duelPubkey]: update.duel,
      }));
      
      setActiveDuels(prev =>
        prev.map(d =>
          d.duelPubkey === update.duel.duelPubkey ? update.duel : d
        )
      );
    });

    // Listen for duel victories
    newSocket.on('duel_won', ({ duel, winner }: { duel: DuelState; winner: 'A' | 'B' }) => {
      console.log('🏆 DUEL WON:', winner, duel);
      
      // Show celebration notification (could integrate with a toast library)
      if (typeof window !== 'undefined') {
        const winnerToken = winner === 'A' ? duel.tokenASymbol : duel.tokenBSymbol;
        alert(`🏆 ${winnerToken} WINS THE DUEL!`);
      }
      
      setDuelStates(prev => ({
        ...prev,
        [duel.duelPubkey]: duel,
      }));
      
      setActiveDuels(prev =>
        prev.map(d =>
          d.duelPubkey === duel.duelPubkey ? duel : d
        )
      );
    });

    // Listen for pending duels
    newSocket.on('pending_duel', (pending: any) => {
      console.log('⏳ Pending duel:', pending);
      // Could show a notification to the user
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const subscribeDuel = (duelPubkey: string) => {
    if (socket) {
      socket.emit('subscribe_duel', duelPubkey);
    }
  };

  const unsubscribeDuel = (duelPubkey: string) => {
    if (socket) {
      socket.emit('unsubscribe_duel', duelPubkey);
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        activeDuels,
        duelStates,
        subscribeDuel,
        unsubscribeDuel,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
}
