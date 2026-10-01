const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

// ─── Nutrition Schema Validation & Sanitizer ──────────────────────────────────
const validateAndSanitizeNutrition = (parsed, defaultDesc = 'Meal') => {
  const cleanNum = (val, fallback = 0) => {
    if (val === null || val === undefined) return fallback;
    if (typeof val === 'string') {
      const sanitized = val.replace(/[^0-9.-]/g, '');
      const num = parseFloat(sanitized);
      return !isNaN(num) && isFinite(num) && num >= 0 ? Math.round(num * 100) / 100 : fallback;
    }
    const num = Number(val);
    return !isNaN(num) && isFinite(num) && num >= 0 ? Math.round(num * 100) / 100 : fallback;
  };

  const isObject = parsed && typeof parsed === 'object';
  const p = isObject ? parsed : {};

  return {
    description: typeof p.description === 'string' && p.description.trim()
      ? p.description.trim()
      : defaultDesc,
    calories: Math.round(cleanNum(p.calories ?? p.energy, isObject ? 0 : 450)),
    protein_g: cleanNum(p.protein_g ?? p.protein, isObject ? 0 : 25),
    carbs_g: cleanNum(p.carbs_g ?? p.carbohydrates ?? p.carbs, isObject ? 0 : 40),
    fat_g: cleanNum(p.fat_g ?? p.fat ?? p.total_fat, isObject ? 0 : 15),
    vitamin_d_mcg: cleanNum(p.vitamin_d_mcg ?? p.vitamin_d ?? p.vit_d, isObject ? 0 : 3.5),
    iron_mg: cleanNum(p.iron_mg ?? p.iron, isObject ? 0 : 3.0),
    zinc_mg: cleanNum(p.zinc_mg ?? p.zinc, isObject ? 0 : 2.5),
    b12_mcg: cleanNum(p.b12_mcg ?? p.vitamin_b12 ?? p.b12 ?? p.vit_b12, isObject ? 0 : 1.2),
  };
};

const extractJson = (text) => {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No valid JSON object found in response.');
  return JSON.parse(match[0]);
};

// ─── Meal Analyzer (Natural Language) ─────────────────────────────────────────
const NUTRITION_SYSTEM_PROMPT = `
You are a highly precise nutritional analysis AI.
The user will provide a string describing a meal they ate.
You MUST respond with ONLY a valid, minified JSON object mapping to the nutritional properties of that meal.
Do NOT include markdown formatting or commentary. Just the raw JSON braces.
Fields required:
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
Ensure all numbers are realistic biological values (non-negative).
`;

const analyzeMeal = async (mealDescription) => {
  try {
    const prompt = `${NUTRITION_SYSTEM_PROMPT}\nUser input: "${mealDescription}"\nReturn strict JSON payload.`;
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const parsed = extractJson(responseText);
    return validateAndSanitizeNutrition(parsed, mealDescription);
  } catch (error) {
    console.warn('[Gemini AI] Natural Language Parsing fallback triggered:', error.message);
    return {
      description: mealDescription,
      calories: 450,
      protein_g: 25,
      carbs_g: 40,
      fat_g: 18,
      vitamin_d_mcg: 5.0,
      iron_mg: 3.2,
      zinc_mg: 2.5,
      b12_mcg: 1.2,
    };
  }
};

// ─── Image Meal Analyzer (Multimodal Computer Vision) ─────────────────────────
const IMAGE_ANALYSIS_PROMPT = `
You are a highly precise nutritional analysis AI with computer vision capabilities.
The user has uploaded a photo of their meal.
Analyze the food items visible in the image and estimate their nutritional content based on visible portion sizes.
You MUST respond with ONLY a valid, minified JSON object with these exact fields:
{
  "description": string,
  "calories": number,
  "protein_g": number,
  "carbs_g": number,
  "fat_g": number,
  "vitamin_d_mcg": number,
  "iron_mg": number,
  "zinc_mg": number,
  "b12_mcg": number
}
The "description" field should be a concise human-readable description of what you identify (e.g. "Grilled salmon fillet with steamed broccoli and brown rice").
Ensure all nutrient numbers are realistic positive values.
`;

const analyzeMealFromImage = async (imagePath, mimeType) => {
  try {
    const imageData = fs.readFileSync(imagePath);
    const base64Image = imageData.toString('base64');

    const result = await model.generateContent([
      { text: IMAGE_ANALYSIS_PROMPT },
      {
        inlineData: {
          mimeType: mimeType,
          data: base64Image,
        },
      },
    ]);

    const responseText = result.response.text();
    const parsed = extractJson(responseText);
    return validateAndSanitizeNutrition(parsed, 'Nutritious meal');
  } catch (error) {
    console.warn('[Gemini AI] Vision Parsing fallback triggered:', error.message);
    return {
      description: 'Photo logged meal',
      calories: 520,
      protein_g: 28,
      carbs_g: 45,
      fat_g: 19,
      vitamin_d_mcg: 4.8,
      iron_mg: 3.0,
      zinc_mg: 2.2,
      b12_mcg: 1.5,
    };
  }
};

// ─── Single-Nutrient Predictive Alert Recommendation ─────────────────────────
const generateRecommendation = async (deficiencyName, context = {}) => {
  try {
    const recentMealsText = context.recentMeals?.length
      ? `Recent meals logged: ${context.recentMeals.slice(0, 3).join(', ')}.`
      : '';

    const prompt = `
The user is projected to have a dietary shortfall in ${deficiencyName} based on rolling 7-day nutritional trends.
${recentMealsText}
Write a short, single-sentence actionable dietary recommendation on how they can adjust their meals tomorrow to replenish ${deficiencyName}.
Make it practical with real whole food examples.
State clearly that this is an informational dietary recommendation, not medical advice.
Do not use markdown. Plain text only.
    `.trim();

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error('Gemini Recommendation Error:', error.message);
    return `Consider incorporating foods naturally rich in ${deficiencyName} (such as leafy greens, fortified foods, legumes, or fish) into your upcoming meals.`;
  }
};

// ─── Full Weekly Insights Health Evaluation ──────────────────────────────────
const generateInsightsSummary = async (deficiencies, averages, streakDays = 7) => {
  try {
    const avgText = Object.entries(averages)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');

    const defText = deficiencies.length > 0
      ? `The user has projected dietary shortfalls in: ${deficiencies.join(', ')}.`
      : 'The user is meeting recommended daily benchmarks for all tracked micronutrients.';

    const prompt = `
You are an encouraging and analytical nutrition coach AI.
Weekly nutritional averages per meal: ${avgText}.
${defText}
Consistency streak: ${streakDays} days tracked.
Write a 2-3 sentence personalized nutritional evaluation summarizing their performance this week, highlighting what they did well, and offering one actionable adjustment.
Mention that these nutritional risk indicators reflect dietary patterns and are not medical diagnoses.
Be warm, data-driven, and empowering. Plain text only.
    `.trim();

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error('Gemini Insights Summary Error:', error.message);
    return 'Your consistent meal logging is building a clearer blueprint of your daily micronutrient fulfillment. Keep tracking to maintain optimal biological baselines.';
  }
};

module.exports = {
  analyzeMeal,
  analyzeMealFromImage,
  generateRecommendation,
  generateInsightsSummary,
  validateAndSanitizeNutrition,
};
