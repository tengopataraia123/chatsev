import { memo } from 'react';
import { DominoTile } from './dominoTypes';

/** Render pip dots for a value 0-6 */
function PipDots({ value, size = 'sm' }: { value: number; size?: 'sm' | 'md' }) {
  const s = size === 'md' ? 'w-[5px] h-[5px]' : 'w-[3px] h-[3px]';
  const positions: Record<number, [number, number][]> = {
    0: [],
    1: [[1, 1]],
    2: [[0, 2], [2, 0]],
    3: [[0, 2], [1, 1], [2, 0]],
    4: [[0, 0], [0, 2], [2, 0], [2, 2]],
    5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
    6: [[0, 0], [0, 1], [0, 2], [2, 0], [2, 1], [2, 2]],
  };
  const dots = positions[value] || [];
  return (
    <div className="grid grid-cols-3 grid-rows-3 gap-[1px] w-full h-full p-[2px]">
      {Array.from({ length: 9 }, (_, i) => {
        const row = Math.floor(i / 3);
        const col = i % 3;
        const hasDot = dots.some(([r, c]) => r === row && c === col);
        return (
          <div key={i} className="flex items-center justify-center">
            {hasDot && <div className={`${s} rounded-full bg-stone-800`} />}
          </div>
        );
      })}
    </div>
  );
}

interface TileViewProps {
  tile: DominoTile;
  horizontal?: boolean;
  size?: 'sm' | 'md';
  highlight?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  faceDown?: boolean;
}

const DominoTileView = memo(function DominoTileView({
  tile, horizontal = false, size = 'sm', highlight = false, onClick, disabled = false, faceDown = false
}: TileViewProps) {
  const w = size === 'md' ? 'w-12' : 'w-9';
  const h = size === 'md' ? 'h-[80px]' : 'h-[56px]';

  if (faceDown) {
    return (
      <div className={`${horizontal ? `${h} ${w}` : `${w} ${h}`} rounded-lg bg-gradient-to-br from-stone-700 to-stone-800 border border-stone-600/50 shadow-md`}>
        <div className="w-full h-full flex items-center justify-center opacity-20">
          <div className="w-3 h-3 rounded-full border border-stone-400" />
        </div>
      </div>
    );
  }

  const tileEl = (
    <div
      className={`${w} ${h} rounded-lg border-2 flex flex-col items-center justify-center shadow-lg transition-all duration-200
        ${highlight
          ? 'border-yellow-400 ring-2 ring-yellow-400/50 bg-gradient-to-b from-white to-amber-50 -translate-y-3 scale-110 cursor-pointer'
          : disabled
            ? 'bg-gradient-to-b from-stone-100 to-stone-200 border-stone-300 opacity-50 cursor-not-allowed'
            : 'bg-gradient-to-b from-white to-amber-50 border-stone-300 cursor-default'}
        ${onClick && !disabled ? 'active:scale-95 active:translate-y-0' : ''}`}
      style={{ minHeight: size === 'md' ? 80 : 56, touchAction: 'manipulation' }}
      onClick={onClick && !disabled ? onClick : undefined}
    >
      <div className="flex-1 w-full flex items-center justify-center">
        <PipDots value={tile.left} size={size === 'md' ? 'md' : 'sm'} />
      </div>
      <div className="w-[65%] h-[2px] bg-stone-400 rounded-full shrink-0" />
      <div className="flex-1 w-full flex items-center justify-center">
        <PipDots value={tile.right} size={size === 'md' ? 'md' : 'sm'} />
      </div>
    </div>
  );

  if (horizontal) {
    return (
      <div className="rotate-90 shrink-0" style={{ width: size === 'md' ? 80 : 56, height: size === 'md' ? 48 : 36 }}>
        {tileEl}
      </div>
    );
  }

  return tileEl;
});

/** Chain tile — horizontal layout, left|right displayed side by side */
export const ChainTileView = memo(function ChainTileView({ tile, isDouble }: { tile: DominoTile; isDouble?: boolean }) {
  if (isDouble) {
    // Doubles displayed perpendicular (vertical/crosswise) — taller than wide
    return (
      <div className="shrink-0 w-[28px] h-[52px] sm:w-[32px] sm:h-[60px] rounded-[4px] border-2 border-stone-400 bg-gradient-to-b from-white to-amber-50 flex flex-col items-center shadow-md">
        <div className="flex-1 w-full flex items-center justify-center p-[1px]">
          <PipDots value={tile.left} size="sm" />
        </div>
        <div className="w-[65%] h-[2px] bg-stone-500 rounded-full shrink-0" />
        <div className="flex-1 w-full flex items-center justify-center p-[1px]">
          <PipDots value={tile.right} size="sm" />
        </div>
      </div>
    );
  }

  return (
    <div className="shrink-0 w-[52px] h-[28px] sm:w-[60px] sm:h-[32px] rounded-[4px] border-2 border-stone-400 bg-gradient-to-b from-white to-amber-50 flex items-center shadow-md">
      <div className="flex-1 h-full flex items-center justify-center p-[1px]">
        <PipDots value={tile.left} size="sm" />
      </div>
      <div className="w-[2px] h-[60%] bg-stone-500 rounded-full shrink-0" />
      <div className="flex-1 h-full flex items-center justify-center p-[1px]">
        <PipDots value={tile.right} size="sm" />
      </div>
    </div>
  );
});

export default DominoTileView;
