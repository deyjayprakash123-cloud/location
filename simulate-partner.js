const http = require('http');

const SERVER_HOST = 'localhost';
const SERVER_PORT = 3000;

function sendUpdate(userId, lat, lng) {
  const payload = JSON.stringify({ userId, latitude: lat, longitude: lng });
  const req = http.request(
    {
      hostname: SERVER_HOST,
      port: SERVER_PORT,
      path: '/update-location',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    },
    (res) => {
      console.log(`[${new Date().toLocaleTimeString()}] Sent ${userId} location: ${lat.toFixed(4)}, ${lng.toFixed(4)} -> Status ${res.statusCode}`);
    }
  );
  req.on('error', (err) => console.error('Connection error:', err.message));
  req.write(payload);
  req.end();
}

console.log('Simulating partner and me moving around San Francisco...');
console.log('Ensure server is running with `npm start` on port 3000.\n');

// Initial positions
let myLat = 37.7749;
let myLng = -122.4194;
let partnerLat = 37.7833;
let partnerLng = -122.4167;

sendUpdate('me', myLat, myLng);
sendUpdate('partner', partnerLat, partnerLng);

let step = 0;
const interval = setInterval(() => {
  step++;
  // Move partner slightly in a circle
  partnerLat += Math.sin(step / 3) * 0.001;
  partnerLng += Math.cos(step / 3) * 0.001;

  sendUpdate('partner', partnerLat, partnerLng);

  if (step >= 20) {
    console.log('Simulation complete.');
    clearInterval(interval);
  }
}, 3000);
