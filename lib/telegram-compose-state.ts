/**
 * TELEGRAM COMPOSE STATE MANAGEMENT
 * 
 * Manages multi-message composition for Telegram bot
 * Allows users to build articles from multiple messages
 */

interface ComposeSession {
  chatId: number;
  messages: string[];
  startedAt: Date;
  lastUpdatedAt: Date;
  language: string;
}

// In-memory storage (will be lost on restart, but good enough)
// For production, consider using Redis or Supabase
const composeSessions = new Map<number, ComposeSession>();

// Delete mode tracking
const deleteModeSessions = new Set<number>();

// Auto-cleanup timer (15 minutes)
const COMPOSE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Start a new compose session
 */
export function startComposeSession(chatId: number, language: string = 'en'): void {
  const session: ComposeSession = {
    chatId,
    messages: [],
    startedAt: new Date(),
    lastUpdatedAt: new Date(),
    language,
  };

  composeSessions.set(chatId, session);
  console.log(`[Compose] Started session for chat ${chatId}`);

  // Auto-cleanup after timeout
  setTimeout(() => {
    if (composeSessions.has(chatId)) {
      const session = composeSessions.get(chatId)!;
      const elapsed = Date.now() - session.lastUpdatedAt.getTime();
      
      if (elapsed >= COMPOSE_TIMEOUT_MS) {
        composeSessions.delete(chatId);
        console.log(`[Compose] Auto-cleaned session for chat ${chatId} (timeout)`);
      }
    }
  }, COMPOSE_TIMEOUT_MS);
}

/**
 * Add message to compose session
 */
export function addToComposeSession(chatId: number, message: string): boolean {
  const session = composeSessions.get(chatId);
  
  if (!session) {
    return false;
  }

  session.messages.push(message);
  session.lastUpdatedAt = new Date();
  
  console.log(`[Compose] Added message to session ${chatId} (total: ${session.messages.length})`);
  return true;
}

/**
 * Get composed text
 */
export function getComposedText(chatId: number): string | null {
  const session = composeSessions.get(chatId);
  
  if (!session || session.messages.length === 0) {
    return null;
  }

  // Join messages with double newline
  return session.messages.join('\n\n');
}

/**
 * Get session info
 */
export function getComposeSession(chatId: number): ComposeSession | null {
  return composeSessions.get(chatId) || null;
}

/**
 * Check if user is in compose mode
 */
export function isInComposeMode(chatId: number): boolean {
  return composeSessions.has(chatId);
}

/**
 * End compose session and return composed text
 */
export function endComposeSession(chatId: number): string | null {
  const text = getComposedText(chatId);
  composeSessions.delete(chatId);
  
  console.log(`[Compose] Ended session for chat ${chatId}`);
  return text;
}

/**
 * Cancel compose session
 */
export function cancelComposeSession(chatId: number): void {
  composeSessions.delete(chatId);
  console.log(`[Compose] Cancelled session for chat ${chatId}`);
}

/**
 * Get session statistics
 */
export function getComposeStats(chatId: number): {
  messageCount: number;
  totalLength: number;
  duration: number; // in seconds
} | null {
  const session = composeSessions.get(chatId);
  
  if (!session) {
    return null;
  }

  const totalLength = session.messages.reduce((sum, msg) => sum + msg.length, 0);
  const duration = Math.floor((Date.now() - session.startedAt.getTime()) / 1000);

  return {
    messageCount: session.messages.length,
    totalLength,
    duration,
  };
}

/**
 * START DELETE MODE
 * User is expected to send article URL for deletion
 */
export function startDeleteMode(chatId: number): void {
  deleteModeSessions.add(chatId);
  console.log(`[Delete Mode] Started for chat ${chatId}`);

  // Auto-cleanup after 5 minutes
  setTimeout(() => {
    deleteModeSessions.delete(chatId);
    console.log(`[Delete Mode] Auto-cleaned for chat ${chatId}`);
  }, 5 * 60 * 1000);
}

/**
 * END DELETE MODE
 */
export function endDeleteMode(chatId: number): void {
  deleteModeSessions.delete(chatId);
  console.log(`[Delete Mode] Ended for chat ${chatId}`);
}

/**
 * CHECK IF IN DELETE MODE
 */
export function isInDeleteMode(chatId: number): boolean {
  return deleteModeSessions.has(chatId);
}

