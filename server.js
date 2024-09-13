const express = require('express');
const path = require('path');
const OpenAI = require('openai');
const multer = require('multer');
const fs = require('fs');
require('dotenv').config();

const app = express();
const port = 3001;

// Initialize OpenAI with API key from .env file
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const messages = [];

// Configure multer for handling file uploads
const upload = multer({ dest: 'uploads/' });

// Function to handle OpenAI chat completions
async function main(input, imageUrl = null) {
  let messageContent;
  if (imageUrl) {
    messageContent = [
      { type: 'text', text: input },
      { type: 'image_url', image_url: imageUrl }
    ];
  } else {
    messageContent = input;
  }
  
  messages.push({ role: 'user', content: messageContent });
  console.log(messages);
  
  try {
    const chatCompletion = await openai.chat.completions.create({
      messages: messages,
      model: 'gpt-4o',
      max_tokens: 300,
    });
    return chatCompletion.choices[0]?.message?.content;
  } catch (error) {
    console.error('Error fetching chat completion:', error);
    return 'An error occurred while processing your request.';
  }
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'templates')));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'templates', 'index.html'));
});

app.post('/api', async (req, res) => {
  const message = await main(req.body.input);
  res.json({ message: message });
});

// Combined route for text and image input
app.post('/process-input', upload.single('image'), async (req, res) => {
  const input = req.body.input || "What's in this image?";
  let imageUrl = null;

  if (req.file) {
    imageUrl = `data:${req.file.mimetype};base64,${fs.readFileSync(req.file.path, { encoding: 'base64' })}`;
    // Clean up the uploaded file
    fs.unlinkSync(req.file.path);
  }

  try {
    const message = await main(input, imageUrl);
    res.json({ success: true, message: message });
  } catch (error) {
    console.error('Error processing input:', error);
    res.status(500).json({ success: false, message: 'An error occurred while processing your input.' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});