'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { getToken } from '@/lib/api/client';

const WS_BASE =
  (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000/api/v1').replace(
    /\/api\/v\d+$/,
    '',
  );

/**
 * Connects to the backend /notifications Socket.IO namespace and calls
 * `onOrderUpdate` whenever an order-related notification arrives.
 *
 * Uses the same pattern as the Flutter apps:
 *   backend emits `notification.created` → payload has `orderId` field
 *
 * Falls back to 30-second polling via `pollFn` if the socket is
 * unavailable or disconnects.
 */
export function useOrderSocket({
  onOrderUpdate,
  pollFn,
  pollInterval = 30_000,
}: {
  onOrderUpdate: () => void;
  pollFn: () => void;
  pollInterval?: number;
}) {
  const socketRef  = useRef<Socket | null>(null);
  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const stableUpdate = useRef(onOrderUpdate);
  const stablePoll   = useRef(pollFn);

  // Keep refs up-to-date without re-running effects
  useEffect(() => { stableUpdate.current = onOrderUpdate; }, [onOrderUpdate]);
  useEffect(() => { stablePoll.current   = pollFn; },   [pollFn]);

  const startPoll = useCallback(() => {
    if (pollRef.current) return;
    pollRef.current = setInterval(() => stablePoll.current(), pollInterval);
  }, [pollInterval]);

  const stopPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      // Not authenticated — fall back to polling only
      startPoll();
      return () => stopPoll();
    }

    const socket = io(`${WS_BASE}/notifications`, {
      transports: ['websocket'],
      autoConnect: false,
      auth: { token },
      reconnectionAttempts: 10,
      reconnectionDelay: 3000,
    });

    socket.on('connect', () => {
      // Socket connected — stop poll (socket is the primary source)
      stopPoll();
    });

    socket.on('notification.created', (data: Record<string, unknown>) => {
      if (typeof data?.orderId === 'string') {
        stableUpdate.current();
      }
    });

    socket.on('disconnect', () => {
      // Socket dropped — start poll as fallback
      startPoll();
    });

    socket.on('connect_error', () => {
      // Cannot connect — start poll as fallback
      startPoll();
    });

    socket.connect();
    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
      stopPoll();
    };
  }, [startPoll, stopPoll]);
}
