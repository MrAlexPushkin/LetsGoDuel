import express from 'express';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { Connection, PublicKey } from '@solana/web3.js';
import { AnchorProvider, Program, BN } from '@coral-xyz/anchor';
import { TwitterApi } from 'twitter-api-v2';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling']
});

app.use(cors());
app.use(express.json());

// ========== CONFIGURATION ==========
const SOLANA_RPC = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const HELIUS_API_KEY = process.env.HELIUS_API_KEY!;
const PROGRAM_ID = new PublicKey('LetsGoDue1111111111111111111111111111111111');

const connection = new Connection(SOLANA_RPC, {
  commitment: 'confirmed',
  wsEndpoint: SOLANA_RPC.replace('https', 'wss')
});

// ========== TWITTER CLIENT ==========
const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY!,
  appSecret: process.env.TWITTER_API_SECRET!,
  accessToken: process.env.TWITTER_ACCESS_TOKEN!,
  accessSecret: process.env.TWITTER_ACCESS_SECRET!,
});

// ========== STATE MANAGEMENT ==========
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

const activeDuels = new Map<string, DuelState>();
const pendingDuels = new Map<string, {
  founderA: string;
  founderATwitter: string;
  tokenAName: string;
  tokenASymbol: string;
  timestamp: number;
}>();

// ========== WEBSOCKET HANDLERS ==========
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Send all active duels on connection
  socket.emit('active_duels', Array.from(activeDuels.values()));
  
  socket.on('subscribe_duel', (duelPubkey: string) => {
    socket.join(`duel:${duelPubkey}`);
    const duel = activeDuels.get(duelPubkey);
    if (duel) {
      socket.emit('duel_state', duel);
    }
  });
  
  socket.on('unsubscribe_duel', (duelPubkey: string) => {
    socket.leave(`duel:${duelPubkey}`);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// ========== HELIUS WEBHOOK HANDLER ==========
app.post('/webhooks/helius', async (req, res) => {
  try {
    const events = req.body;
    
    for (const event of events) {
      if (event.type === 'TRANSFER' && event.description.includes('letsgoduel')) {
        // Parse trade event
        const duelPubkey = event.accounts[0]; // Adjust based on actual event structure
        const duel = activeDuels.get(duelPubkey);
        
        if (duel && duel.isActive) {
          // Fetch updated duel state
          const updatedDuel = await fetchDuelState(duelPubkey);
          if (updatedDuel) {
            activeDuels.set(duelPubkey, updatedDuel);
            
            // Broadcast to all subscribed clients
            io.to(`duel:${duelPubkey}`).emit('trade_update', {
              duel: updatedDuel,
              event: {
                type: event.type,
                signature: event.signature,
                timestamp: event.timestamp,
              }
            });
            
            // Check for winner
            if (updatedDuel.winner) {
              io.to(`duel:${duelPubkey}`).emit('duel_won', {
                duel: updatedDuel,
                winner: updatedDuel.winner,
              });
              
              // Tweet the winner
              await tweetWinner(updatedDuel);
            }
          }
        }
      }
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========== TWITTER EVENT LISTENER ==========
async function startTwitterListener() {
  const stream = await twitterClient.v2.searchStream({
    'tweet.fields': ['author_id', 'created_at', 'entities'],
    'user.fields': ['username'],
    expansions: ['author_id', 'referenced_tweets.id']
  });
  
  stream.on('data', async (tweet) => {
    try {
      // Check if tweet mentions @letsgoduel
      if (tweet.data.text.includes('@letsgoduel')) {
        await handleDuelMention(tweet);
      }
    } catch (error) {
      console.error('Twitter stream error:', error);
    }
  });
  
  stream.on('error', (error) => {
    console.error('Twitter stream error:', error);
  });
  
  console.log('Twitter listener started');
}

async function handleDuelMention(tweet: any) {
  const text = tweet.data.text;
  const authorId = tweet.data.author_id;
  
  // Parse duel creation format: "@letsgoduel challenge @opponent with $TOKEN"
  const challengeMatch = text.match(/@letsgoduel\s+challenge\s+@(\w+)\s+with\s+\$(\w+)/i);
  
  if (challengeMatch) {
    const opponentTwitter = challengeMatch[1];
    const tokenSymbol = challengeMatch[2];
    
    // Store pending duel
    const pendingId = `${authorId}_${opponentTwitter}`;
    pendingDuels.set(pendingId, {
      founderA: authorId,
      founderATwitter: tweet.includes.users[0].username,
      tokenAName: `${tokenSymbol} by ${tweet.includes.users[0].username}`,
      tokenASymbol: tokenSymbol,
      timestamp: Date.now(),
    });
    
    // Notify frontend
    io.emit('pending_duel', {
      id: pendingId,
      founderATwitter: tweet.includes.users[0].username,
      opponentTwitter,
      tokenSymbol,
    });
    
    console.log(`New duel challenge: ${tweet.includes.users[0].username} vs ${opponentTwitter}`);
  }
  
  // Parse duel acceptance format: "@letsgoduel accept with $TOKEN"
  const acceptMatch = text.match(/@letsgoduel\s+accept\s+with\s+\$(\w+)/i);
  
  if (acceptMatch && tweet.data.referenced_tweets) {
    const tokenBSymbol = acceptMatch[1];
    const replyToId = tweet.data.referenced_tweets[0].id;
    
    // Find matching pending duel
    for (const [pendingId, pending] of pendingDuels.entries()) {
      if (pending.founderATwitter === tweet.includes.users[0].username) {
        // Create duel on-chain
        await createDuelOnChain(
          pending,
          {
            founderB: authorId,
            founderBTwitter: tweet.includes.users[0].username,
            tokenBName: `${tokenBSymbol} by ${tweet.includes.users[0].username}`,
            tokenBSymbol,
          }
        );
        
        pendingDuels.delete(pendingId);
        break;
      }
    }
  }
}

// ========== BLOCKCHAIN INTERACTIONS ==========
async function fetchDuelState(duelPubkey: string): Promise<DuelState | null> {
  try {
    // Fetch duel account from Solana
    const duelAccount = await connection.getAccountInfo(new PublicKey(duelPubkey));
    
    if (!duelAccount) return null;
    
    // Deserialize account data (simplified - use actual IDL)
    // In production, use: program.account.duelAccount.fetch(duelPubkey)
    
    const duel: DuelState = {
      duelPubkey,
      tokenAMint: '',
      tokenBMint: '',
      founderA: '',
      founderB: '',
      tokenASolRaised: 0,
      tokenBSolRaised: 0,
      tokenASupply: 0,
      tokenBSupply: 0,
      tokenAName: '',
      tokenASymbol: '',
      tokenBName: '',
      tokenBSymbol: '',
      winner: null,
      isActive: true,
      createdAt: Date.now(),
      targetSol: 85,
    };
    
    return duel;
  } catch (error) {
    console.error('Error fetching duel state:', error);
    return null;
  }
}

async function createDuelOnChain(founderAData: any, founderBData: any) {
  try {
    // In production, use actual Anchor client
    // const tx = await program.methods
    //   .initializeDuel(...)
    //   .accounts({...})
    //   .rpc();
    
    console.log('Duel created on-chain:', founderAData, founderBData);
    
    // Tweet confirmation
    await twitterClient.v2.tweet(
      `🔥 NEW DUEL LIVE!\n\n` +
      `${founderAData.tokenASymbol} vs ${founderBData.tokenBSymbol}\n\n` +
      `First to 85 SOL wins and migrates to @RaydiumProtocol!\n\n` +
      `LFG! 🚀`
    );
  } catch (error) {
    console.error('Error creating duel:', error);
  }
}

async function tweetWinner(duel: DuelState) {
  try {
    const winnerSymbol = duel.winner === 'A' ? duel.tokenASymbol : duel.tokenBSymbol;
    const winnerSol = duel.winner === 'A' ? duel.tokenASolRaised : duel.tokenBSolRaised;
    
    await twitterClient.v2.tweet(
      `🏆 DUEL WON!\n\n` +
      `${winnerSymbol} reached ${winnerSol} SOL and is migrating to @RaydiumProtocol!\n\n` +
      `The arena never sleeps. Next duel?`
    );
  } catch (error) {
    console.error('Error tweeting winner:', error);
  }
}

// ========== API ENDPOINTS ==========
app.get('/api/duels', (req, res) => {
  res.json(Array.from(activeDuels.values()));
});

app.get('/api/duels/:pubkey', (req, res) => {
  const duel = activeDuels.get(req.params.pubkey);
  if (duel) {
    res.json(duel);
  } else {
    res.status(404).json({ error: 'Duel not found' });
  }
});

app.get('/api/pending', (req, res) => {
  res.json(Array.from(pendingDuels.entries()).map(([id, data]) => ({
    id,
    ...data
  })));
});

// ========== HELIX WEBHOOK SETUP ==========
async function setupHeliusWebhook() {
  try {
    // Register webhook with Helius
    const response = await fetch(`https://api.helius.xyz/v0/webhooks?api-key=${HELIUS_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        webhookURL: `${process.env.BACKEND_URL}/webhooks/helius`,
        transactionTypes: ['TRANSFER', 'TOKEN_MINT', 'TOKEN_BURN'],
        accountAddresses: [PROGRAM_ID.toString()],
        webhookType: 'enhanced',
      }),
    });
    
    const data = await response.json();
    console.log('Helius webhook registered:', data);
  } catch (error) {
    console.error('Error setting up Helius webhook:', error);
  }
}

// ========== SERVER STARTUP ==========
const PORT = process.env.PORT || 4000;

httpServer.listen(PORT, async () => {
  console.log(`🔥 LetsGoDuel backend running on port ${PORT}`);
  
  await setupHeliusWebhook();
  await startTwitterListener();
  
  console.log('Ready for duels! ⚔️');
});

export { io, activeDuels };
