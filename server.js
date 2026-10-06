const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Enable CORS and body parsing
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the public folder for testing/demo
app.use(express.static(path.join(__dirname, 'public')));

// Configure Socket.io with permissive CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// In-memory store for user locations: { [userId]: { latitude, longitude, updatedAt } }
const userLocations = {};

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);

  // Immediately emit the current memory object to the newly connected client
  socket.emit('locations', userLocations);
  socket.emit('sync_locations', userLocations);

  socket.on('disconnect', () => {
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });
});

// HTTP POST /update-location route
app.post('/update-location', (req, res) => {
  const { userId, id, latitude, lat, longitude, lng, lon } = req.body;

  const resolvedUserId = userId || id;
  const resolvedLatitude = latitude !== undefined ? latitude : lat;
  const resolvedLongitude = longitude !== undefined ? longitude : (lng !== undefined ? lng : lon);

  if (!resolvedUserId || resolvedLatitude === undefined || resolvedLongitude === undefined) {
    return res.status(400).json({
      success: false,
      error: 'Please provide userId (or id), latitude (or lat), and longitude (or lng/lon).'
    });
  }

  const parsedLat = parseFloat(resolvedLatitude);
  const parsedLng = parseFloat(resolvedLongitude);

  if (isNaN(parsedLat) || isNaN(parsedLng)) {
    return res.status(400).json({
      success: false,
      error: 'Latitude and longitude must be valid numbers.'
    });
  }

  // Update in-memory object
  userLocations[resolvedUserId] = {
    latitude: parsedLat,
    longitude: parsedLng,
    updatedAt: new Date().toISOString()
  };

  console.log(`[Location Update] User: ${resolvedUserId} -> Lat: ${parsedLat}, Lng: ${parsedLng}`);

  // Emit the updated memory object to all connected Socket.io clients
  io.emit('locations', userLocations);
  io.emit('sync_locations', userLocations);

  return res.status(200).json({
    success: true,
    message: 'Location updated successfully',
    user: {
      userId: resolvedUserId,
      ...userLocations[resolvedUserId]
    },
    allLocations: userLocations
  });
});

// Optional GET route to inspect stored locations
app.get('/locations', (req, res) => {
  res.json({
    success: true,
    locations: userLocations
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`===========================================`);
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`POST endpoint: http://localhost:${PORT}/update-location`);
  console.log(`GET  endpoint: http://localhost:${PORT}/locations`);
  console.log(`Socket.io ready on ws://localhost:${PORT}`);
  console.log(`===========================================`);
});

module.exports = { app, server, io, userLocations };
