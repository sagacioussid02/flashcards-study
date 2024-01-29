const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const OpenAI = require('openai');
const cors = require('cors'); // Import the cors middleware

const app = express();
const port = process.env.PORT || 8001;

// Middleware to set CORS headers
const setCorsHeaders = (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
};

// Use CORS middleware
app.use(setCorsHeaders);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Set up OpenAI API key
const openai = new OpenAI({ key: process.env.OPENAI_API_KEY });

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Landing endpoint
app.get('/', (req, res) => {
    res.status(200).send('Hey! You');
  });

// Endpoint for uploading PDF and generating flashcards
app.post('/generate-flashcards', upload.single('pdf'), async (req, res) => {
  try {
    // Extract text from the uploaded PDF
    const pdfData = req.file.buffer;
    const pdfText = await extractTextFromPDF(pdfData);

    // Analyze text using OpenAI and generate flashcards
    const generatedFlashcards = await generateFlashcards(pdfText);

    // Return the generated flashcards
    res.json({ flashcards: generatedFlashcards });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Function to extract text from PDF
async function extractTextFromPDF(pdfData) {
  const data = await pdfParse(pdfData);
  return data.text;
}

// Function to generate flashcards using OpenAI
async function generateFlashcards(text) {
  try {
    // Make a call to OpenAI API to generate flashcards
    const response = await openai.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are an assistant that creates flashcards.' },
        { role: 'user', content: text },
      ],
      model: 'gpt-3.5-turbo',
    });

    // Extract relevant information from OpenAI response
    const generatedText = response.choices[0].message.content;

    // For simplicity, you might need to parse the generatedText to create flashcards
    // This depends on the specific structure of the data returned by OpenAI

    return generatedText;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
