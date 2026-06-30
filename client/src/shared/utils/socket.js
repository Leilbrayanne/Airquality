import { io } from 'socket.io-client';
import { useEffect, useRef } from 'react';

export const socket = io({
  autoConnect: false
});

/**
 * Maps the logical channel name the frontend uses to:
 *  - the Socket.IO room the server expects us to JOIN via 'join-room'
 *  - the actual event name the server EMITS inside that room
 *
 * Backend (server.js / aedes_broker.js):
 *   io.to('airquality/live').emit('sensor-update', payload)  <- room + event
 *   io.to('alerts/live').emit('new-alert', alert)            <- room + event
 *   io.emit('system/config', config)                         <- global broadcast
 */
const CHANNEL_MAP = {
  'airquality/live': { room: 'airquality/live', event: 'sensor-update' },
  'alerts/live':     { room: 'alerts/live',     event: 'new-alert' },
  'system/config':   { room: null,              event: 'system/config' },
};

export const useSocket = (channelName, onEvent) => {
  const savedHandler = useRef(onEvent);

  useEffect(() => {
    savedHandler.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!channelName) return;

    const mapping = CHANNEL_MAP[channelName] || { room: channelName, event: channelName };

    const handler = (data) => {
      savedHandler.current?.(data);
    };

    // Join the room on connect (and re-join on reconnect)
    const joinRoom = () => {
      if (mapping.room) {
        socket.emit('join-room', mapping.room);
      }
    };

    // Register event listener for the actual event the server emits
    socket.on(mapping.event, handler);

    // Re-join the room after every (re)connect
    socket.on('connect', joinRoom);

    // Start connecting (no-op if already connected)
    socket.connect();

    // If already connected, join immediately
    if (socket.connected) {
      joinRoom();
    }

    return () => {
      socket.off(mapping.event, handler);
      socket.off('connect', joinRoom);
    };
  }, [channelName]);

  return socket;
};
