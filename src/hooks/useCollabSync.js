/**
 * useCollabSync
 *
 * Connects to the backend WebSocket and broadcasts section/config patches
 * to other users viewing the same design. Patches are shallow diffs of the
 * Zustand store's config — only changed keys are sent, keeping the payload tiny.
 *
 * Usage:
 *   const { isConnected, peers } = useCollabSync(designId);
 *
 * When a remote patch arrives, it's applied directly to useDesignStore.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useAuthStore } from "../stores/useAuthStore.js";
import { useDesignStore } from "../stores/useDesignStore.js";

const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:4000/ws";

export function useCollabSync(designId) {
  const ws = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [peers, setPeers] = useState(0);
  const token = useAuthStore((s) => s.token);
  const loadDesign = useDesignStore((s) => s.loadDesign);

  useEffect(() => {
    if (!designId || !token) return;

    const socket = new WebSocket(`${WS_URL}?token=${token}`);
    ws.current = socket;

    socket.onopen = () => {
      setIsConnected(true);
      socket.send(JSON.stringify({ type: "join", designId }));
    };

    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      switch (msg.type) {
        case "joined":
          setPeers(msg.peers);
          break;
        case "patch":
          // Apply the incoming config diff to our store
          if (msg.patch?.config) loadDesign(msg.patch.config);
          break;
        default:
          break;
      }
    };

    socket.onclose = () => {
      setIsConnected(false);
      setPeers(0);
    };
    socket.onerror = (err) => console.warn("WS error", err);

    return () => {
      socket.send(JSON.stringify({ type: "leave", designId }));
      socket.close();
    };
  }, [designId, token, loadDesign]);

  /** Call this after every local config change to broadcast to peers. */
  const broadcastPatch = useCallback(
    (patch) => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ type: "patch", designId, patch }));
      }
    },
    [designId],
  );

  return { isConnected, peers, broadcastPatch };
}
