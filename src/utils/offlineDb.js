// ─── Offline Local Storage Database & Mock Engine ───────────────────────────
// This utility enables Nutriq to run fully client-side as an interactive demo 
// on static hosts (like GitHub Pages) when the Render backend is not yet active.

const DEFAULT_MEALS = [
  {
    id: 1,
    description: "High Protein Greek Yogurt with Blueberries and Honey",
    calories: 280,
    protein_g: 18,
    carbs_g: 28,
    fat_g: 3.5,
    vitamin_d_mcg: 3.2,
    iron_mg: 0.4,
    zinc_mg: 0.7,
    b12_mcg: 0.8,
    created_at: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString() // 36h ago
  },
  {
    id: 2,
    description: "Baked Salmon fillet with Broccoli florets and Jasmine Rice",
    calories: 640,
    protein_g: 45,
    carbs_g: 48,
    fat_g: 22,
    vitamin_d_mcg: 14.5,
    iron_mg: 2.1,
    zinc_mg: 1.8,
    b12_mcg: 4.8,
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 24h ago
  },
  {
    id: 3,
    description: "Lean Beef Stir Fry with Bell Peppers and Rice Noodles",
    calories: 590,
    protein_g: 36,
    carbs_g: 52,
    fat_g: 16,
    vitamin_d_mcg: 0.8,
    iron_mg: 4.2,
    zinc_mg: 5.8,
    b12_mcg: 2.1,
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString() // 4h ago
  }
];

const RDI = {
  vitamin_d_mcg: 15,
  iron_mg: 12,
  zinc_mg: 8,
  b12_mcg: 2.4
};

// Simple generative simulation of meal parsing
const simulateMealAnalysis = (description) => {
  const desc = description.toLowerCase();
  
  let calories = 350;
  let protein_g = 15;
  let carbs_g = 35;
  let fat_g = 10;
  let vitamin_d_mcg = 0.5;
  let iron_mg = 1.0;
  let zinc_mg = 0.8;
  let b12_mcg = 0.2;

  // Keyword matchers to make mock estimates responsive to user input
  if (desc.includes("salmon") || desc.includes("fish") || desc.includes("tuna")) {
    calories = 520; protein_g = 38; carbs_g = 5; fat_g = 18; vitamin_d_mcg = 12.0; b12_mcg = 4.2;
  } else if (desc.includes("chicken") || desc.includes("turkey") || desc.includes("poultry")) {
    calories = 450; protein_g = 35; carbs_g = 10; fat_g = 12; iron_mg = 1.5; zinc_mg = 1.2;
  } else if (desc.includes("beef") || desc.includes("steak") || desc.includes("meat")) {
    calories = 620; protein_g = 36; carbs_g = 8; fat_g = 24; iron_mg = 4.5; zinc_mg = 5.2; b12_mcg = 2.0;
  } else if (desc.includes("egg") || desc.includes("eggs") || desc.includes("omelet")) {
    calories = 220; protein_g = 14; carbs_g = 2; fat_g = 12; vitamin_d_mcg = 2.0; b12_mcg = 0.6;
  } else if (desc.includes("yogurt") || desc.includes("milk") || desc.includes("cheese") || desc.includes("dairy")) {
    calories = 260; protein_g = 16; carbs_g = 15; fat_g = 6; vitamin_d_mcg = 2.8; b12_mcg = 0.9;
  } else if (desc.includes("salad") || desc.includes("broccoli") || desc.includes("vegetable") || desc.includes("greens")) {
    calories = 180; protein_g = 4; carbs_g = 12; fat_g = 8; iron_mg = 1.2; zinc_mg = 0.5;
  }

  return {
    calories,
    protein_g,
    carbs_g,
    fat_g,
    vitamin_d_mcg,
    iron_mg,
    zinc_mg,
    b12_mcg
  };
};

export const getOfflineMeals = () => {
  const data = localStorage.getItem("nutriq_meals");
  if (!data) {
    localStorage.setItem("nutriq_meals", JSON.stringify(DEFAULT_MEALS));
    return DEFAULT_MEALS;
  }
  return JSON.parse(data);
};

export const addOfflineMeal = (description) => {
  const meals = getOfflineMeals();
  const nutrients = simulateMealAnalysis(description);
  const newMeal = {
    id: Date.now(),
    description,
    ...nutrients,
    created_at: new Date().toISOString()
  };
  meals.push(newMeal);
  localStorage.setItem("nutriq_meals", JSON.stringify(meals));
  return newMeal;
};

export const getOfflineDashboard = () => {
  const meals = getOfflineMeals();
  
  // Sort descending by date
  const sortedMeals = [...meals].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  
  const recentMeals = sortedMeals.slice(0, 3).map(m => {
    const date = new Date(m.created_at);
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; 
    return {
      name: m.description,
      cals: m.calories,
      time: `${hours}:${minutes} ${ampm}`
    };
  });

  // Rolling 7-day average calories
  const last7DaysMeals = meals.filter(m => {
    const diffTime = Math.abs(new Date() - new Date(m.created_at));
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  });

  const uniqueDays = new Set(last7DaysMeals.map(m => m.created_at.split('T')[0])).size || 1;
  const totalCalories = last7DaysMeals.reduce((acc, m) => acc + m.calories, 0);
  const avgCalories = Math.round(totalCalories / uniqueDays);

  // Group Vitamin D by day for past 7 days
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayTotals = {};
  
  // Initialize last 7 days
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const label = daysOfWeek[d.getDay()];
    dayTotals[label] = 0;
  }

  last7DaysMeals.forEach(m => {
    const dayLabel = daysOfWeek[new Date(m.created_at).getDay()];
    if (dayTotals[dayLabel] !== undefined) {
      dayTotals[dayLabel] += m.vitamin_d_mcg;
    }
  });

  const chartData = Object.entries(dayTotals).map(([name, completion]) => ({
    name,
    completion: parseFloat(completion.toFixed(1)),
    optimal: RDI.vitamin_d_mcg
  }));

  // Averages for deficiency checks
  const totalVitD = last7DaysMeals.reduce((acc, m) => acc + m.vitamin_d_mcg, 0);
  const avgVitD = totalVitD / last7DaysMeals.length || 0;

  const alerts = [];
  if (avgVitD < RDI.vitamin_d_mcg * 0.6) {
    alerts.push({
      target: "Vitamin D",
      message: "Your Vitamin D synthesis is low. Consider incorporating fatty fish or fortified dairy tomorrow."
    });
  }

  const score = Math.min(100, Math.round((avgVitD / RDI.vitamin_d_mcg) * 100)) || 75;

  return {
    recentMeals,
    chartData,
    alerts,
    alertData: alerts.length > 0 ? alerts[0] : null,
    topMetrics: {
      score: alerts.length === 0 ? 94 : Math.max(55, score),
      calories: avgCalories || 2100
    }
  };
};

export const getOfflineInsights = () => {
  const meals = getOfflineMeals();
  const last7DaysMeals = meals.filter(m => {
    const diffTime = Math.abs(new Date() - new Date(m.created_at));
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  });

  const totalMeals = last7DaysMeals.length;
  const hasMeals = totalMeals > 0;

  let avg_vit_d = 0;
  let avg_iron = 0;
  let avg_zinc = 0;
  let avg_b12 = 0;
  let avg_protein = 0;
  let avg_carbs = 0;
  let avg_fat = 0;
  let avg_calories = 0;

  if (hasMeals) {
    const sum = (key) => last7DaysMeals.reduce((acc, m) => acc + m[key], 0);
    const uniqueDays = new Set(last7DaysMeals.map(m => m.created_at.split('T')[0])).size || 1;
    
    avg_vit_d = parseFloat((sum('vitamin_d_mcg') / uniqueDays).toFixed(2));
    avg_iron = parseFloat((sum('iron_mg') / uniqueDays).toFixed(2));
    avg_zinc = parseFloat((sum('zinc_mg') / uniqueDays).toFixed(2));
    avg_b12 = parseFloat((sum('b12_mcg') / uniqueDays).toFixed(2));
    avg_protein = parseFloat((sum('protein_g') / uniqueDays).toFixed(1));
    avg_carbs = parseFloat((sum('carbs_g') / uniqueDays).toFixed(1));
    avg_fat = parseFloat((sum('fat_g') / uniqueDays).toFixed(1));
    avg_calories = Math.round(sum('calories') / uniqueDays);
  }

  // Daily trends for micro bar chart
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dailyTrendsMap = {};
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const label = daysOfWeek[d.getDay()];
    dailyTrendsMap[label] = { day: label, vit_d: 0, iron: 0, zinc: 0, b12: 0 };
  }

  last7DaysMeals.forEach(m => {
    const dayLabel = daysOfWeek[new Date(m.created_at).getDay()];
    if (dailyTrendsMap[dayLabel]) {
      dailyTrendsMap[dayLabel].vit_d += m.vitamin_d_mcg;
      dailyTrendsMap[dayLabel].iron += m.iron_mg;
      dailyTrendsMap[dayLabel].zinc += m.zinc_mg;
      dailyTrendsMap[dayLabel].b12 += m.b12_mcg;
    }
  });

  const dailyTrends = Object.values(dailyTrendsMap);

  // Deficiency detection
  const nutrientChecks = [
    { key: 'avg_vit_d', label: 'Vitamin D', rdi: RDI.vitamin_d_mcg, unit: 'mcg' },
    { key: 'avg_iron',  label: 'Iron',      rdi: RDI.iron_mg,       unit: 'mg' },
    { key: 'avg_zinc',  label: 'Zinc',      rdi: RDI.zinc_mg,       unit: 'mg' },
    { key: 'avg_b12',   label: 'Vitamin B12', rdi: RDI.b12_mcg,    unit: 'mcg' },
  ];

  const deficiencies = [];
  const nutrientStatus = nutrientChecks.map(({ key, label, rdi, unit }) => {
    const val = { avg_vit_d, avg_iron, avg_zinc, avg_b12 }[key];
    const pct = Math.min(100, Math.round((val / rdi) * 100));
    const status = pct >= 80 ? 'good' : pct >= 50 ? 'low' : 'deficient';
    if (status === 'deficient') deficiencies.push(label);
    return { label, avg: val, rdi, unit, pct, status };
  });

  // AI Weekly Summary Generator
  let aiSummary = "Keep logging your meals consistently to unlock deeper AI-powered insights into your nutritional health.";
  if (hasMeals) {
    if (deficiencies.length > 0) {
      aiSummary = `You are maintaining a strong dietary base, but you are currently running low on ${deficiencies.join(' and ')}. Focus on adjusting tomorrow's meals to include nutrient-dense foods such as seafood, leafy greens, or lean meat to restore optimal metabolic energy.`;
    } else {
      aiSummary = "Spectacular work this week! Your micronutrient levels are outstanding across all categories. You are matching optimal daily recommendations, promoting stellar cellular energy and natural immunity.";
    }
  }

  return {
    hasMeals,
    totalMeals,
    dailyTrends,
    nutrientStatus,
    macros: {
      protein: avg_protein,
      carbs: avg_carbs,
      fat: avg_fat,
      calories: avg_calories
    },
    aiSummary,
    deficiencies
  };
};
