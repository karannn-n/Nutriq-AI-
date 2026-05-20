const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// ─── Meal Analyzer ────────────────────────────────────────────────────────────
const NUTRITION_SYSTEM_PROMPT = `
You are a highly precise nutritional analysis AI.
The user will provide a string describing a meal they ate.
You MUST respond with ONLY a valid, minified JSON object mapping to the nutritional properties of that meal.
Do NOT include markdown formatting (like \`\`\`json). Just the raw braces.
You must output exactly these fields with estimated numeric biological values (integers or decimals):
{
  "calories": number,
  "protein_g": number,
  "carbs_g": number,
  "fat_g": number,
  "vitamin_d_mcg": number,
  "iron_mg": number,
  "zinc_mg": number,
  "b12_mcg": number
}
If you cannot determine exactly, give your absolute best scientific estimate.
`;

const analyzeMeal = async (mealDescription) => {
  try {
    const prompt = `${NUTRITION_SYSTEM_PROMPT}\nUser input: "${mealDescription}"\nAnalyze this and return the strict JSON payload.`;
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const jsonString = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn('Gemini AI Parsing Error (falling back to simulated data):', error.message);
    return {
      calories: 450, protein_g: 25, carbs_g: 40, fat_g: 18,
      vitamin_d_mcg: 5, iron_mg: 3.2, zinc_mg: 2.5, b12_mcg: 1.2
    };
  }
};

// ─── Single-Nutrient Alert ────────────────────────────────────────────────────
const generateRecommendation = async (deficiencyName) => {
  try {
    const prompt = `The user is mathematically projected to become deficient in ${deficiencyName} over the next 5 days. Write a short, single-sentence actionable recommendation on how they can adjust their diet tomorrow to prevent this. Do not use markdown.`;
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error('Gemini Recommendation Error:', error.message);
    return `Consider adding foods rich in ${deficiencyName} to your diet tomorrow.`;
  }
};

// ─── Full Insights Summary ────────────────────────────────────────────────────
// Takes an array of deficient nutrients and weekly averages, returns a 2-3 sentence
// personalised summary the Insights page can display.
const generateInsightsSummary = async (deficiencies, averages) => {
  try {
    const avgText = Object.entries(averages)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');

    const defText = deficiencies.length > 0
      ? `The user is currently deficient in: ${deficiencies.join(', ')}.`
      : 'The user has no current deficiencies.';

    const prompt = `
You are a concise health coach AI inside a nutrition tracking app.
Weekly nutritional averages per meal: ${avgText}.
${defText}
Write a 2-3 sentence personalised health insight summarising the user's nutritional status this week, what they are doing well, and one actionable improvement. 
Be warm, motivating, and data-driven. Do not use markdown or bullet points. Plain text only.
    `.trim();

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error('Gemini Insights Summary Error:', error.message);
    return 'Keep logging your meals consistently to unlock deeper AI-powered insights into your nutritional health.';
  }
};

module.exports = { analyzeMeal, generateRecommendation, generateInsightsSummary };
