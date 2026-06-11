// Open browser devtools on http://localhost:5173, paste this:

const { io } = await import('https://cdn.socket.io/4.7.5/socket.io.esm.min.js');

// Replace with your actual token from login
const TOKEN = 'your_jwt_token_here';
const ROOM_ID = 'your_room_id_here';

const socket = io('http://localhost:5000', {
  auth: { token: `Bearer ${TOKEN}` }
});

socket.on('connect', () => {
  console.log('✅ Connected:', socket.id);
  socket.emit('join_room', { roomId: ROOM_ID });
});

socket.on('joined_room', (data) => console.log('📥 Joined room:', data));
socket.on('task:completed', (data) => console.log('✅ Task completed:', data));
socket.on('task:reopened', (data) => console.log('↩️  Task reopened:', data));
socket.on('presence:update', (data) => console.log('👥 Presence:', data));
socket.on('error', (err) => console.error('❌ Socket error:', err));

// Then in another tab/curl, POST to complete a task and watch the event fire

export default socket;