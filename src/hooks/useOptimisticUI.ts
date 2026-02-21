import { useState, useCallback, useRef } from 'react';

/**
 * Optimistic UI Hook
 * Provides instant visual feedback for user actions while waiting for server response
 */

export interface OptimisticAction<T> {
  optimisticValue: T;
  serverAction: () => Promise<T>;
  onError?: (error: Error, revert: () => void) => void;
  onSuccess?: (result: T) => void;
}

/**
 * useOptimisticState - For simple optimistic state updates
 */
export function useOptimisticState<T>(initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);
  const [isPending, setIsPending] = useState(false);
  const previousValueRef = useRef<T>(initialValue);

  const updateOptimistically = useCallback(async (
    optimisticValue: T,
    serverAction: () => Promise<T>,
    onError?: (error: Error) => void
  ) => {
    // Store previous value for potential rollback
    previousValueRef.current = value;
    
    // Apply optimistic update immediately
    setValue(optimisticValue);
    setIsPending(true);

    try {
      // Execute server action
      const result = await serverAction();
      setValue(result);
      return result;
    } catch (error) {
      // Rollback to previous value on error
      setValue(previousValueRef.current);
      onError?.(error as Error);
      throw error;
    } finally {
      setIsPending(false);
    }
  }, [value]);

  const reset = useCallback(() => {
    setValue(initialValue);
  }, [initialValue]);

  return {
    value,
    setValue,
    isPending,
    updateOptimistically,
    reset
  };
}

/**
 * useOptimisticList - For optimistic updates on lists
 */
export function useOptimisticList<T extends { id: string }>(initialItems: T[]) {
  const [items, setItems] = useState<T[]>(initialItems);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const previousItemsRef = useRef<T[]>(initialItems);

  const addOptimistically = useCallback(async (
    optimisticItem: T,
    serverAction: () => Promise<T>,
    onError?: (error: Error) => void
  ) => {
    previousItemsRef.current = items;
    
    // Add item optimistically
    setItems(prev => [optimisticItem, ...prev]);
    setPendingIds(prev => new Set(prev).add(optimisticItem.id));

    try {
      const result = await serverAction();
      // Replace optimistic item with real one
      setItems(prev => prev.map(item => 
        item.id === optimisticItem.id ? result : item
      ));
      return result;
    } catch (error) {
      // Remove optimistic item on error
      setItems(prev => prev.filter(item => item.id !== optimisticItem.id));
      onError?.(error as Error);
      throw error;
    } finally {
      setPendingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(optimisticItem.id);
        return newSet;
      });
    }
  }, [items]);

  const removeOptimistically = useCallback(async (
    itemId: string,
    serverAction: () => Promise<void>,
    onError?: (error: Error) => void
  ) => {
    const removedItem = items.find(item => item.id === itemId);
    if (!removedItem) return;

    previousItemsRef.current = items;
    
    // Remove item optimistically
    setItems(prev => prev.filter(item => item.id !== itemId));
    setPendingIds(prev => new Set(prev).add(itemId));

    try {
      await serverAction();
    } catch (error) {
      // Restore item on error
      setItems(prev => [...prev, removedItem].sort((a, b) => 
        // Sort by most recent first (assuming items have a created_at or similar)
        0
      ));
      onError?.(error as Error);
      throw error;
    } finally {
      setPendingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  }, [items]);

  const updateOptimistically = useCallback(async (
    itemId: string,
    optimisticUpdate: Partial<T>,
    serverAction: () => Promise<T>,
    onError?: (error: Error) => void
  ) => {
    const originalItem = items.find(item => item.id === itemId);
    if (!originalItem) return;

    previousItemsRef.current = items;
    
    // Update item optimistically
    setItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, ...optimisticUpdate } : item
    ));
    setPendingIds(prev => new Set(prev).add(itemId));

    try {
      const result = await serverAction();
      setItems(prev => prev.map(item => 
        item.id === itemId ? result : item
      ));
      return result;
    } catch (error) {
      // Restore original item on error
      setItems(prev => prev.map(item => 
        item.id === itemId ? originalItem : item
      ));
      onError?.(error as Error);
      throw error;
    } finally {
      setPendingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  }, [items]);

  const isPending = useCallback((itemId: string) => pendingIds.has(itemId), [pendingIds]);

  return {
    items,
    setItems,
    addOptimistically,
    removeOptimistically,
    updateOptimistically,
    isPending,
    hasPending: pendingIds.size > 0
  };
}

/**
 * useOptimisticToggle - For optimistic toggle actions (like/unlike, bookmark, etc.)
 */
export function useOptimisticToggle(
  initialState: boolean,
  initialCount: number = 0
) {
  const [isActive, setIsActive] = useState(initialState);
  const [count, setCount] = useState(initialCount);
  const [isPending, setIsPending] = useState(false);
  const previousStateRef = useRef({ isActive: initialState, count: initialCount });

  const toggle = useCallback(async (
    serverAction: (newState: boolean) => Promise<void>,
    onError?: (error: Error) => void
  ) => {
    // Store previous state
    previousStateRef.current = { isActive, count };
    
    // Apply optimistic update
    const newState = !isActive;
    setIsActive(newState);
    setCount(prev => newState ? prev + 1 : Math.max(0, prev - 1));
    setIsPending(true);

    try {
      await serverAction(newState);
    } catch (error) {
      // Rollback on error
      setIsActive(previousStateRef.current.isActive);
      setCount(previousStateRef.current.count);
      onError?.(error as Error);
    } finally {
      setIsPending(false);
    }
  }, [isActive, count]);

  return {
    isActive,
    count,
    isPending,
    toggle,
    setIsActive,
    setCount
  };
}

/**
 * Animation feedback for optimistic actions
 */
export const optimisticAnimations = {
  // Scale up briefly then back
  pop: 'transform transition-transform duration-150 active:scale-125',
  // Heart beat animation
  heartbeat: 'animate-[heartbeat_0.3s_ease-in-out]',
  // Fade with scale
  fadeScale: 'animate-[fadeScale_0.2s_ease-out]',
  // Slide in
  slideIn: 'animate-[slideIn_0.3s_ease-out]',
} as const;

export default useOptimisticState;
