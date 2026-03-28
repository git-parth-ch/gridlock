// app/src/socket.js
import { io } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

export const socket = io(BACKEND_URL, { autoConnect: false });

export function connectSocket(teamCode, deviceId) {
  socket.connect();
  socket.emit('join_team', { teamCode, deviceId });
}