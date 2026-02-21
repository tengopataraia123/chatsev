import { memo, useRef, useState, useEffect, useCallback } from 'react';
import { DominoTile } from './dominoTypes';
import { ChainTileView } from './DominoTileView';

const TILE_W = 54;
const DOUBLE_W = 32;
const ROW_GAP = 8;

interface Props {
  chain: DominoTile[];
  lastPlayedId?: string | null;
  topBranch?: DominoTile[];
  bottomBranch?: DominoTile[];
  spinnerIndex?: number;
}

const DominoChainSnake = memo(function DominoChainSnake({ chain, lastPlayedId, topBranch = [], bottomBranch = [], spinnerIndex = -1 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(300);

  const measure = useCallback(() => {
    if (!containerRef.current) return;
    setContainerWidth(containerRef.current.clientWidth - 24);
  }, []);

  useEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [measure]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chain.length, topBranch.length, bottomBranch.length]);

  if (chain.length === 0) {
    return (
      <div ref={containerRef} className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-emerald-300/20 text-4xl mb-2">🎲</div>
          <span className="text-emerald-300/30 text-xs">დადე პირველი ქვა</span>
        </div>
      </div>
    );
  }

  const hasSpinner = spinnerIndex >= 0;

  // Split the main chain into left part (before spinner) and right part (after spinner)
  let leftChain: DominoTile[] = [];
  let spinnerTile: DominoTile | null = null;
  let rightChain: DominoTile[] = [];

  if (hasSpinner) {
    leftChain = chain.slice(0, spinnerIndex);
    spinnerTile = chain[spinnerIndex];
    rightChain = chain.slice(spinnerIndex + 1);
  }

  // Simple row builder for non-spinner mode
  const buildRows = (tiles: DominoTile[]) => {
    const rows: DominoTile[][] = [];
    let currentRow: DominoTile[] = [];
    let currentWidth = 0;

    for (const tile of tiles) {
      const isDouble = tile.left === tile.right;
      const tileWidth = isDouble ? DOUBLE_W : TILE_W;
      const gap = currentRow.length > 0 ? 3 : 0;

      if (currentWidth + tileWidth + gap > containerWidth && currentRow.length > 0) {
        rows.push(currentRow);
        currentRow = [tile];
        currentWidth = tileWidth;
      } else {
        currentRow.push(tile);
        currentWidth += tileWidth + gap;
      }
    }
    if (currentRow.length > 0) rows.push(currentRow);
    return rows;
  };

  const renderTile = (t: DominoTile, key: string) => {
    const isLastPlayed = t.id === lastPlayedId;
    const isDouble = t.left === t.right;
    return (
      <div
        key={key}
        className={`transition-all duration-300 ${
          isLastPlayed ? 'scale-110 ring-2 ring-yellow-400/60 rounded-md' : ''
        }`}
      >
        <ChainTileView tile={t} isDouble={isDouble} />
      </div>
    );
  };

  const renderBranch = (tiles: DominoTile[], direction: 'up' | 'down') => {
    if (tiles.length === 0) return null;
    return (
      <div className="flex flex-col items-center gap-1">
        {(direction === 'up' ? [...tiles].reverse() : tiles).map((t, i) => {
          const isLastPlayed = t.id === lastPlayedId;
          return (
            <div
              key={`${direction}_${i}`}
              className={`transition-all duration-300 ${
                isLastPlayed ? 'scale-110 ring-2 ring-yellow-400/60 rounded-md' : ''
              }`}
            >
              <ChainTileView tile={t} isDouble={t.left === t.right} />
            </div>
          );
        })}
      </div>
    );
  };

  // SPINNER LAYOUT: cross-shaped
  if (hasSpinner && spinnerTile) {
    return (
      <div ref={containerRef} className="w-full h-full flex flex-col overflow-hidden">
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto overflow-x-hidden flex items-center justify-center px-3 py-3"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div className="flex flex-col items-center gap-1">
            {/* Top branch */}
            {renderBranch(topBranch, 'up')}

            {/* Main horizontal row: left chain + spinner + right chain */}
            <div className="flex items-center gap-[3px]">
              {/* Left chain (reversed for display: leftmost first) */}
              {leftChain.map((t, i) => renderTile(t, `left_${i}`))}

              {/* Spinner tile */}
              <div className={`transition-all duration-300 ${
                spinnerTile.id === lastPlayedId ? 'scale-110 ring-2 ring-yellow-400/60 rounded-md' : ''
              }`}>
                <ChainTileView tile={spinnerTile} isDouble={true} />
              </div>

              {/* Right chain */}
              {rightChain.map((t, i) => renderTile(t, `right_${i}`))}
            </div>

            {/* Bottom branch */}
            {renderBranch(bottomBranch, 'down')}
          </div>
        </div>
      </div>
    );
  }

  // NON-SPINNER: regular snake layout
  const rows = buildRows(chain);

  return (
    <div ref={containerRef} className="w-full h-full flex flex-col overflow-hidden">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col items-center justify-center px-3 py-3"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="flex flex-col items-center" style={{ gap: ROW_GAP }}>
          {rows.map((row, rowIdx) => {
            const isReversed = rowIdx % 2 === 1;
            const displayRow = isReversed ? [...row].reverse() : row;

            const justifyStyle: React.CSSProperties = {
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              width: '100%',
              justifyContent: isReversed ? 'flex-end' : 'flex-start',
            };

            const showConnector = rowIdx > 0;

            return (
              <div key={rowIdx} className="w-full">
                {showConnector && (
                  <div
                    className="h-2"
                    style={{
                      display: 'flex',
                      justifyContent: rowIdx % 2 === 1 ? 'flex-end' : 'flex-start',
                      paddingLeft: rowIdx % 2 === 1 ? 0 : 4,
                      paddingRight: rowIdx % 2 === 1 ? 4 : 0,
                    }}
                  >
                    <div className="w-[2px] h-full bg-stone-400/30 rounded-full" />
                  </div>
                )}
                <div style={justifyStyle}>
                  {displayRow.map((t, i) => renderTile(t, `${rowIdx}_${i}`))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

export default DominoChainSnake;
