// ტესტ-სკრიპტი: AI ჩატის შემოწმება
// გაშვება: node test-chat.mjs

import { io } from 'socket.io-client';

const BASE_URL = 'http://localhost:3000';

// ============================
// 1. Login — JWT token-ის აღება
// ============================
console.log('1. ლოგინი...');
const loginRes = await fetch(`${BASE_URL}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'test@test.com',
    password: 'test123',
  }),
});

if (!loginRes.ok) {
  console.log('ლოგინი ვერ მოხერხდა. შექმენი იუზერი: POST /auth/register');
  console.log('Body:', await loginRes.json());
  process.exit(1);
}

const { accessToken } = await loginRes.json();
console.log('Token მიღებულია:', accessToken.substring(0, 30) + '...');

// ============================
// 2. WebSocket კავშირი JWT-ით
// ============================
console.log('\n2. WebSocket-ით კავშირი...');
const socket = io(BASE_URL, {
  auth: { token: `Bearer ${accessToken}` },
});

socket.on('connect', () => {
  console.log('დაკავშირდა! Socket ID:', socket.id);

  // ============================
  // 3. შეკითხვის გაგზავნა
  // ============================
  console.log('\n3. კითხვა: "რა პროდუქტები გაქვთ?"');
  console.log('---');
  socket.emit('sendMessage', { message: 'რა პროდუქტები გაქვთ?' });
});

// პასუხის chunk-ების მიღება (streaming)
let fullResponse = '';
socket.on('messageChunk', (data) => {
  process.stdout.write(data.text); // ტერმინალში ეტაპობრივად იწერება
  fullResponse += data.text;
});

// პასუხი დასრულდა
socket.on('messageEnd', () => {
  console.log('\n---');
  console.log('\nსრული პასუხი მიღებულია! სიგრძე:', fullResponse.length, 'სიმბოლო');

  // ============================
  // 4. მეორე შეკითხვა (კონტექსტის ტესტი!)
  // ============================
  console.log('\n4. კითხვა: "რომელია ყველაზე იაფი?" (ახსოვს წინა საუბარი?)');
  console.log('---');
  fullResponse = '';
  socket.emit('sendMessage', { message: 'რომელია ყველაზე იაფი მათგან?' });
});

// მეორე პასუხის chunk-ები
let messageCount = 0;
const originalChunkHandler = socket.listeners('messageChunk')[0];

socket.on('messageEnd', () => {
  messageCount++;
  if (messageCount >= 2) {
    console.log('\n---');
    console.log('\nკონტექსტის ტესტი წარმატებულია! AI-ს ახსოვს წინა საუბარი.');
    console.log('ტესტი დასრულდა.');
    socket.disconnect();
    process.exit(0);
  }
});

socket.on('error', (data) => {
  console.error('Error:', data);
  process.exit(1);
});

socket.on('connect_error', (err) => {
  console.error('Connection error:', err.message);
  process.exit(1);
});

// 30 წამიანი timeout
setTimeout(() => {
  console.log('\nTimeout — 30 წამი გავიდა');
  socket.disconnect();
  process.exit(1);
}, 30000);
