// Durak game cleanup utilities - handles table reset, ghost player cleanup, etc.

import { supabase } from '@/integrations/supabase/client';

// Reset a table to free state (clears all players and game reference)
export async function resetTable(tableId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('durak_lobby_tables')
      .update({
        player1_id: null,
        player1_username: null,
        player2_id: null,
        player2_username: null,
        status: 'free',
        game_id: null,
      })
      .eq('id', tableId);

    if (error) {
      console.error('Error resetting table:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Exception resetting table:', err);
    return false;
  }
}

// Remove a specific player from a table
export async function removePlayerFromTable(
  tableId: string, 
  userId: string,
  isPlayer1: boolean,
  player2Id: string | null,
  player2Username: string | null
): Promise<boolean> {
  try {
    if (isPlayer1) {
      // First player leaves
      if (player2Id) {
        // Move player2 to player1 slot
        const { error } = await supabase
          .from('durak_lobby_tables')
          .update({
            player1_id: player2Id,
            player1_username: player2Username,
            player2_id: null,
            player2_username: null,
            status: 'waiting',
            game_id: null,
          })
          .eq('id', tableId);
        
        if (error) throw error;
      } else {
        // Free the table completely
        await resetTable(tableId);
      }
    } else {
      // Second player leaves
      const { error } = await supabase
        .from('durak_lobby_tables')
        .update({
          player2_id: null,
          player2_username: null,
          status: 'waiting',
          game_id: null,
        })
        .eq('id', tableId);

      if (error) throw error;
    }
    return true;
  } catch (err) {
    console.error('Error removing player from table:', err);
    return false;
  }
}

// Mark game as finished and cleanup table
export async function endGameAndCleanup(
  gameId: string,
  tableId: string,
  winnerId: string | null,
  loserId: string | null
): Promise<boolean> {
  try {
    // Mark game as finished
    const { error: gameError } = await supabase
      .from('durak_active_games')
      .update({
        status: 'finished',
        winner_id: winnerId,
        loser_id: loserId,
        phase: 'finished',
      })
      .eq('id', gameId);

    if (gameError) {
      console.error('Error finishing game:', gameError);
    }

    // Reset the table
    await resetTable(tableId);
    
    return true;
  } catch (err) {
    console.error('Exception in endGameAndCleanup:', err);
    return false;
  }
}

// Cleanup stuck/ghost tables (tables marked as playing but with no game_id)
export async function cleanupGhostTables(): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('durak_lobby_tables')
      .update({
        player1_id: null,
        player1_username: null,
        player2_id: null,
        player2_username: null,
        status: 'free',
        game_id: null,
      })
      .eq('status', 'playing')
      .is('game_id', null)
      .select();

    if (error) {
      console.error('Error cleaning ghost tables:', error);
      return 0;
    }

    return data?.length || 0;
  } catch (err) {
    console.error('Exception cleaning ghost tables:', err);
    return 0;
  }
}

// Check if a game is stale (hasn't been updated in a while)
export function isGameStale(updatedAt: string, maxAgeMinutes: number = 30): boolean {
  const lastUpdate = new Date(updatedAt);
  const now = new Date();
  const diffMinutes = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);
  return diffMinutes > maxAgeMinutes;
}
