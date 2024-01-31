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
const FLASHCARDS_PROMPT = `
  You are an assistant tasked with creating flashcards. Generate flashcards summarizing the given article 
  in the form of a nested array. Each flashcard should have the following structure: [Title, Front side, Back side]
  Additionally, provide two or more flashcards with relevant facts that are not explicitly mentioned in the article 
  but are related to the content. Be creative and explore interesting details and return in the form of nested array.
`
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
    console.log("Hey there! We are working on genrating flashcards")
    let userText;

    // Check if the request contains a PDF file
    if (req.file) {
      const pdfData = req.file.buffer;
      userText = await extractTextFromPDF(pdfData);
    } else {
      // If no PDF file, check if the request contains text
      userText = req.body.text;
    }

    console.log("Translated text:", userText)

    // Analyze text using OpenAI and generate flashcards
    const generatedFlashcards = await generateFlashcards(userText);

    console.log("Hey there! We have uploaded pdf for processing flashcards")

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

async function generateFlashcards(text) {
  try {
    // Make a call to OpenAI API to generate flashcards
    const response = await openai.chat.completions.create({
      messages: [
        { role: 'system', content: FLASHCARDS_PROMPT },
        { role: 'user', content: text },
      ],
      model: 'gpt-3.5-turbo',
    });

    // Log the content of the message
    const content = response.choices[0]?.message.content;
    console.log("Response content:", content);

    let processedFlashcards;

    try {
      // Attempt to parse the content as JSON
      const flashcardArray = JSON.parse(content);

      // Check if the response is a valid array
      if (Array.isArray(flashcardArray) && flashcardArray.length > 0) {
        // Process each flashcard in the array
        processedFlashcards = flashcardArray.map(card => {
          // Assuming each flashcard has [Title, Front side, Back side] structure
          const [title, front, back] = card;

          if (title && front && back) {
            return { Title: title.trim(), 'Front side': front.trim(), 'Back side': back.trim() };
          } else {
            return null;
          }
        }).filter(card => card !== null);

        console.log("Processed flashcards:", processedFlashcards);
      } else {
        console.error('Invalid response format from the OpenAI API');
      }
    } catch (jsonError) {
      console.error('Error parsing JSON from OpenAI API:', jsonError);
    }

    return processedFlashcards;
  } catch (error) {
    console.error(error);
    throw error;
  }
}



// ... (other functions and endpoint handlers)


// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
