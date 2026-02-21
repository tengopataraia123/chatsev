export interface DominoTable {
  id: string;
  table_number: number;
  status: 'free' | 'waiting' | 'playing';
  player1_id: string | null;
  player1_username: string | null;
  player2_id: string | null;
  player2_username: string | null;
  game_id: string | null;
  bet_amount: number;
  created_at: string;
  updated_at: string;
}
