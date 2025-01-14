const express = require('express');
const app = express();

app.use(express.json()); // Middleware to parse JSON payloads

// Webhook handler
app.post('/webhook', (req, res) => {
  console.log('Webhook received:', req.body);

  // Respond to Kinde
  res.status(200).send('Webhook received!');
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
