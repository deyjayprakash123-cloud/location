const { io: ioClient } = require('socket.io-client');
const http = require('http');

// Start testing against the server
async function runTest() {
  // Dynamically require server instance
  process.env.PORT = '4001';
  const { server } = require('./server');

  console.log('Running test suite on port 4001...\n');

  try {
    const socket = ioClient('http://localhost:4001', {
      transports: ['websocket']
    });

    // Step 1: Wait for initial emission upon connection
    const initialData = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timeout waiting for initial locations event')), 5000);
      socket.on('locations', (data) => {
        clearTimeout(timer);
        resolve(data);
      });
    });

    console.log('✓ Step 1: Connected and received initial locations:', initialData);

    // Step 2: Set up listener for the post update
    const updatePromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timeout waiting for updated locations event')), 5000);
      socket.on('locations', (data) => {
        if (data && data['user_42']) {
          clearTimeout(timer);
          resolve(data);
        }
      });
    });

    // Step 3: Trigger POST /update-location
    console.log('Sending POST /update-location for user_42...');
    const postPayload = JSON.stringify({
      userId: 'user_42',
      latitude: 37.7749,
      longitude: -122.4194
    });

    const response = await new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: 'localhost',
          port: 4001,
          path: '/update-location',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postPayload)
          }
        },
        (res) => {
          let body = '';
          res.on('data', (chunk) => (body += chunk));
          res.on('end', () => resolve({ statusCode: res.statusCode, data: JSON.parse(body) }));
        }
      );
      req.on('error', reject);
      req.write(postPayload);
      req.end();
    });

    console.log('✓ Step 2: Received HTTP POST response:', response);

    if (response.statusCode !== 200 || !response.data.success) {
      throw new Error(`HTTP update failed: ${JSON.stringify(response.data)}`);
    }

    // Step 4: Verify the socket got the broadcast
    const updatedData = await updatePromise;
    console.log('✓ Step 3: Socket client received real-time broadcast:', updatedData);

    if (!updatedData['user_42'] || updatedData['user_42'].latitude !== 37.7749) {
      throw new Error('Socket broadcasted data does not match expected update!');
    }

    console.log('\n=========================================');
    console.log(' ALL TESTS PASSED SUCCESSFULLY! ');
    console.log('=========================================');

    socket.disconnect();
    server.close();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Test failed:', err);
    if (server) server.close();
    process.exit(1);
  }
}

runTest();
