const { analyzeMeal } = require('./services/aiService');

(async () => {
  try {
    const data = await analyzeMeal("an apple");
    console.log("Success:", data);
  } catch (err) {
    console.error("Test Error:", err);
  }
})();
