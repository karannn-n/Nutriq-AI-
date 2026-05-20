const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
(async () => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-8b' });
    const result = await model.generateContent("hello");
    console.log("1.5-flash-8b Success:", result.response.text());
  } catch (err) {
    console.error("1.5-flash-8b Error:", err.message);
  }
  
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent("hello");
    console.log("2.0-flash Success:", result.response.text());
  } catch (err) {
    console.error("2.0-flash Error:", err.message);
  }
})();
