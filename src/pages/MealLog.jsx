import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera, Send, Loader2, CheckCircle2, X, Upload, AlertCircle, WifiOff,
  Database, Sparkles, Plus, Trash2, HelpCircle, Check, RefreshCw, ChevronDown, Info
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSync } from '../hooks/useSync';
import {
  searchFoods,
  getFoodById,
  calculateFoodNutrients,
  calculateMealNutrition
} from '../utils/localNutritionEngine';

const MealLog = () => {
  // Engine Tab: 'local' (Deterministic USDA) vs 'gemini' (AI Alternative)
  const [activeEngine, setActiveEngine] = useState('local');

  // Input states
  const [mealText, setMealText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successData, setSuccessData] = useState(null);

  // Local Engine State
  const [ingredients, setIngredients] = useState([]);
  const [ambiguousItems, setAmbiguousItems] = useState([]);
  const [foodSearchQuery, setFoodSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedFood, setSelectedFood] = useState(null);
  const [inputQuantity, setInputQuantity] = useState('100');
  const [inputUnit, setInputUnit] = useState('g');

  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const { session } = useAuth();
  const { isOnline, logMealOffline } = useSync();

  // Search local database when query changes
  useEffect(() => {
    if (!foodSearchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const results = searchFoods(foodSearchQuery, 6);
    setSearchResults(results);
  }, [foodSearchQuery]);

  // Available units for selected food
  const availableUnits = useMemo(() => {
    const base = ['g', 'cup', 'tbsp', 'serving'];
    if (selectedFood?.serving_weights_g) {
      const specific = Object.keys(selectedFood.serving_weights_g).filter(u => u !== 'g' && u !== 'kg');
      return Array.from(new Set(['g', ...specific, 'kg', 'oz']));
    }
    return base;
  }, [selectedFood]);

  // Live calculation of confirmed ingredients
  const liveNutrition = useMemo(() => {
    if (ingredients.length === 0) return null;
    return calculateMealNutrition(ingredients);
  }, [ingredients]);

  // Handle image upload
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
      setErrorMessage('');
      setActiveEngine('gemini'); // Image analysis is handled by Gemini Vision
    }
  };

  const handleDragOver = (e) => { e.preventDefault(); };
  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
      setErrorMessage('');
      setActiveEngine('gemini');
    }
  };

  // Add ingredient manually via search
  const handleAddManualIngredient = (food) => {
    const chosenFood = food || selectedFood;
    if (!chosenFood) return;

    const qty = parseFloat(inputQuantity);
    if (isNaN(qty) || qty <= 0) {
      setErrorMessage('Please enter a valid serving quantity greater than 0.');
      return;
    }

    const calculated = calculateFoodNutrients(chosenFood, qty, inputUnit);
    if (!calculated) return;

    setIngredients(prev => [
      ...prev,
      {
        id: `ing_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        food: chosenFood,
        food_id: chosenFood.id,
        quantity: qty,
        unit: inputUnit,
        confirmed: true,
        calculated,
      }
    ]);

    setSelectedFood(null);
    setFoodSearchQuery('');
    setInputQuantity('100');
    setInputUnit('g');
    setErrorMessage('');
  };

  const handleRemoveIngredient = (id) => {
    setIngredients(prev => prev.filter(item => item.id !== id));
  };

  // Parse natural language composite meal via local engine
  const handleDecomposeTextMeal = async () => {
    if (!mealText.trim()) {
      setErrorMessage('Please enter a meal description to parse.');
      return;
    }

    setIsParsing(true);
    setErrorMessage('');

    try {
      const apiURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiURL}/api/nutrition/parse-meal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: mealText.trim() }),
      });

      let parseResult = null;
      if (response.ok) {
        parseResult = await response.json();
      } else {
        throw new Error('API parse returned error');
      }

      // Map confirmed ingredients
      const confirmedList = (parseResult.confirmed_ingredients || []).map((ci, idx) => ({
        id: `parsed_${Date.now()}_${idx}`,
        food: ci.food,
        food_id: ci.food.id,
        quantity: ci.quantity,
        unit: ci.unit,
        confirmed: true,
        calculated: calculateFoodNutrients(ci.food, ci.quantity, ci.unit),
      }));

      setIngredients(confirmedList);

      // Handle ambiguous items needing confirmation
      if (parseResult.ambiguous_ingredients && parseResult.ambiguous_ingredients.length > 0) {
        setAmbiguousItems(parseResult.ambiguous_ingredients);
      } else {
        setAmbiguousItems([]);
      }
    } catch (err) {
      console.warn('API parsing failed, falling back to client-side local engine:', err.message);
      // Client-side fallback decomposition
      const phrases = mealText.split(/,|\band\b|\+|\bwith\b|&|\n/i).map(p => p.trim()).filter(Boolean);
      const confirmed = [];
      const ambiguous = [];

      for (let i = 0; i < phrases.length; i++) {
        const phrase = phrases[i];
        const match = phrase.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?\s+(.+)$/i);
        let qty = 100, unit = 'g', query = phrase;
        if (match) {
          qty = parseFloat(match[1]);
          unit = match[2] || 'g';
          query = match[3];
        }

        const hits = searchFoods(query, 3);
        if (hits.length === 1) {
          confirmed.push({
            id: `client_parsed_${Date.now()}_${i}`,
            food: hits[0],
            food_id: hits[0].id,
            quantity: qty,
            unit: unit,
            confirmed: true,
            calculated: calculateFoodNutrients(hits[0], qty, unit),
          });
        } else if (hits.length > 1) {
          ambiguous.push({
            raw_text: phrase,
            food_query: query,
            parsed_quantity: qty,
            parsed_unit: unit,
            candidates: hits.map(h => ({ id: h.id, name: h.common_name, group: h.food_group })),
            reasons: [`Multiple matches found for '${query}'. Please select the specific item.`],
          });
        } else {
          ambiguous.push({
            raw_text: phrase,
            food_query: query,
            parsed_quantity: qty,
            parsed_unit: unit,
            candidates: searchFoods('', 4),
            reasons: [`'${query}' was not recognized. Please choose a substitute from the catalog.`],
          });
        }
      }

      setIngredients(confirmed);
      setAmbiguousItems(ambiguous);
    } finally {
      setIsParsing(false);
    }
  };

  // Resolve an ambiguous item with user selection
  const handleResolveAmbiguity = (ambIndex, selectedCandidateId, qty, unit) => {
    const candidateFood = getFoodById(selectedCandidateId);
    if (!candidateFood) return;

    const finalQty = parseFloat(qty) || 100;
    const finalUnit = unit || 'g';

    const calculated = calculateFoodNutrients(candidateFood, finalQty, finalUnit);

    setIngredients(prev => [
      ...prev,
      {
        id: `resolved_${Date.now()}_${ambIndex}`,
        food: candidateFood,
        food_id: candidateFood.id,
        quantity: finalQty,
        unit: finalUnit,
        confirmed: true,
        calculated,
      }
    ]);

    // Remove resolved ambiguous item
    setAmbiguousItems(prev => prev.filter((_, idx) => idx !== ambIndex));
  };

  // Submit and log meal to Supabase (or offline queue)
  const handleLogMeal = async (e) => {
    if (e) e.preventDefault();

    setIsSubmitting(true);
    setErrorMessage('');

    // If in Local Engine mode and ingredients are present
    const isLocalMode = activeEngine === 'local';

    if (isLocalMode && ingredients.length === 0) {
      setErrorMessage('Please add or decompose at least one confirmed ingredient before logging.');
      setIsSubmitting(false);
      return;
    }

    if (!isLocalMode && !mealText && !selectedFile) {
      setErrorMessage('Please provide a meal description or photo.');
      setIsSubmitting(false);
      return;
    }

    const calculatedTotals = isLocalMode && liveNutrition
      ? liveNutrition.db_compatible_nutrition
      : null;

    const mealDescription = isLocalMode
      ? mealText.trim() || ingredients.map(i => `${i.quantity}${i.unit} ${i.food.common_name}`).join(', ')
      : mealText.trim();

    // 0. Offline handling
    if ((!isOnline || !navigator.onLine) && !selectedFile) {
      try {
        const { localMeal } = logMealOffline(mealDescription);
        // If local mode, override mock numbers with exact USDA deterministic values!
        const finalPayload = calculatedTotals || {
          calories: localMeal.calories,
          protein_g: localMeal.protein_g,
          carbs_g: localMeal.carbs_g,
          fat_g: localMeal.fat_g,
          vitamin_d_mcg: localMeal.vitamin_d_mcg,
          iron_mg: localMeal.iron_mg,
          zinc_mg: localMeal.zinc_mg,
          b12_mcg: localMeal.b12_mcg,
        };

        setSuccessData({
          text: mealDescription,
          payload: finalPayload,
          isOffline: true,
          engine: isLocalMode ? 'local_usda' : 'gemini',
          ingredients: isLocalMode ? ingredients : null,
          totalsMeta: isLocalMode && liveNutrition ? liveNutrition.totals : null,
        });

        setMealText('');
        setIngredients([]);
        setAmbiguousItems([]);
      } catch (err) {
        setErrorMessage('Failed to queue offline meal: ' + err.message);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // 1. Online request to Backend
    try {
      const apiURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const headers = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      let response;

      if (selectedFile) {
        // Image logging (Gemini Vision)
        const formData = new FormData();
        formData.append('description', mealText || 'Meal Photo');
        formData.append('image', selectedFile);
        response = await fetch(`${apiURL}/api/meals/image`, {
          method: 'POST',
          headers,
          body: formData,
        });
      } else if (isLocalMode) {
        // Deterministic USDA multi-ingredient logging
        headers['Content-Type'] = 'application/json';
        const payload = {
          description: mealDescription,
          ingredients: ingredients.map(i => ({
            food_id: i.food_id,
            quantity: i.quantity,
            unit: i.unit,
            confirmed: true,
            food: i.food,
          })),
          engine: 'local',
          useLocalEngine: true,
        };
        response = await fetch(`${apiURL}/api/meals`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });
      } else {
        // Gemini Text AI NLP Logging
        headers['Content-Type'] = 'application/json';
        response = await fetch(`${apiURL}/api/meals`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ description: mealText, engine: 'gemini' }),
        });
      }

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        throw new Error(errJson?.error || `Server error (${response.status})`);
      }

      const resData = await response.json();

      setSuccessData({
        text: mealDescription,
        payload: resData.data,
        isOffline: false,
        engine: resData.engine || (isLocalMode ? 'local_usda' : 'gemini'),
        ingredients: isLocalMode ? ingredients : null,
        totalsMeta: isLocalMode && liveNutrition ? liveNutrition.totals : null,
      });

      setMealText('');
      setIngredients([]);
      setAmbiguousItems([]);
      setSelectedFile(null);
      setPreview(null);
    } catch (err) {
      console.warn('API request failed:', err.message);
      // Offline fallback
      if (!selectedFile && (err.name === 'TypeError' || err.message.includes('fetch') || err.message.includes('network'))) {
        try {
          const { localMeal } = logMealOffline(mealDescription);
          setSuccessData({
            text: mealDescription,
            payload: calculatedTotals || {
              calories: localMeal.calories,
              protein_g: localMeal.protein_g,
              carbs_g: localMeal.carbs_g,
              fat_g: localMeal.fat_g,
              vitamin_d_mcg: localMeal.vitamin_d_mcg,
              iron_mg: localMeal.iron_mg,
              zinc_mg: localMeal.zinc_mg,
              b12_mcg: localMeal.b12_mcg,
            },
            isOffline: true,
            engine: isLocalMode ? 'local_usda' : 'gemini',
            ingredients: isLocalMode ? ingredients : null,
          });
          setMealText('');
          setIngredients([]);
          return;
        } catch (queueErr) {
          setErrorMessage('Could not save meal offline: ' + queueErr.message);
        }
      }
      setErrorMessage(err.message || 'Failed to process meal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div>
        <h1 className="heading-font" style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Log Your Meal</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Calculate exact nutrients using the deterministic USDA FoodData Central engine or choose the Gemini AI assistant.
        </p>
      </div>

      {/* Engine Switch Tabs */}
      <div style={{
        display: 'flex',
        gap: '12px',
        background: 'rgba(255,255,255,0.4)',
        padding: '6px',
        borderRadius: '16px',
        border: '1px solid var(--glass-border)'
      }}>
        <button
          type="button"
          onClick={() => setActiveEngine('local')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '12px 18px',
            borderRadius: '12px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.95rem',
            transition: 'all 0.2s',
            background: activeEngine === 'local' ? 'var(--accent-primary)' : 'transparent',
            color: activeEngine === 'local' ? '#ffffff' : 'var(--text-main)',
            boxShadow: activeEngine === 'local' ? '0 4px 12px rgba(42, 140, 110, 0.25)' : 'none',
          }}
        >
          <Database size={18} />
          <span>USDA Local Nutrition Engine</span>
          <span style={{
            fontSize: '0.72rem',
            padding: '2px 8px',
            borderRadius: '10px',
            background: activeEngine === 'local' ? 'rgba(255,255,255,0.25)' : 'rgba(42,140,110,0.12)',
            color: activeEngine === 'local' ? '#fff' : 'var(--accent-primary)',
            fontWeight: 700
          }}>
            DETERMINISTIC
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveEngine('gemini')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '12px 18px',
            borderRadius: '12px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.95rem',
            transition: 'all 0.2s',
            background: activeEngine === 'gemini' ? 'var(--accent-primary)' : 'transparent',
            color: activeEngine === 'gemini' ? '#ffffff' : 'var(--text-main)',
            boxShadow: activeEngine === 'gemini' ? '0 4px 12px rgba(42, 140, 110, 0.25)' : 'none',
          }}
        >
          <Sparkles size={18} />
          <span>Gemini AI (Existing Alternative)</span>
          <span style={{
            fontSize: '0.72rem',
            padding: '2px 8px',
            borderRadius: '10px',
            background: activeEngine === 'gemini' ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.06)',
            color: activeEngine === 'gemini' ? '#fff' : 'var(--text-muted)',
            fontWeight: 700
          }}>
            AI FALLBACK
          </span>
        </button>
      </div>

      {errorMessage && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '12px',
            padding: '14px 18px',
            fontSize: '0.9rem',
            color: '#ef4444',
            display: 'flex',
            gap: '10px',
            alignItems: 'center',
          }}
        >
          <AlertCircle size={20} style={{ flexShrink: 0 }} />
          <span>{errorMessage}</span>
        </motion.div>
      )}

      {/* ─── TAB 1: LOCAL DETERMINISTIC ENGINE ──────────────────────────── */}
      {activeEngine === 'local' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Natural Language Decomposer Panel */}
          <motion.div className="glass-panel" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>1. Describe Composite Meal</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Enter ingredients with quantities (e.g. "150g basmati rice, 1 cup cooked lentils and 100g boiled spinach").
                </p>
              </div>
            </div>

            <textarea
              value={mealText}
              onChange={(e) => setMealText(e.target.value)}
              placeholder="e.g. 150g rice, 1 cup lentils and 100g spinach (or describe: rice, dal and vegetables)..."
              disabled={isParsing || isSubmitting}
              style={{
                width: '100%', minHeight: '90px', background: 'rgba(255,255,255,0.7)',
                border: '1px solid var(--glass-border)', borderRadius: '14px',
                padding: '16px', color: 'var(--text-main)', fontSize: '1rem',
                outline: 'none', resize: 'vertical', fontFamily: 'inherit'
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px' }}>
              <button
                type="button"
                onClick={handleDecomposeTextMeal}
                disabled={isParsing || !mealText.trim()}
                className="btn btn-outline"
                style={{ padding: '10px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {isParsing ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
                <span>Decompose & Verify Ingredients</span>
              </button>
            </div>
          </motion.div>

          {/* Ambiguity & Portion Confirmation Panel (Requirement 3) */}
          <AnimatePresence>
            {ambiguousItems.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="glass-panel"
                style={{
                  padding: '24px',
                  border: '1px solid rgba(234, 88, 12, 0.4)',
                  background: 'rgba(234, 88, 12, 0.05)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                  <HelpCircle color="#ea580c" size={22} />
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#ea580c' }}>
                      Clarification Required ({ambiguousItems.length} item{ambiguousItems.length > 1 ? 's' : ''})
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Nutriq does not invent values for ambiguous foods or unspecified portions. Please confirm below:
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {ambiguousItems.map((amb, idx) => (
                    <AmbiguousItemCard
                      key={`amb_${idx}`}
                      item={amb}
                      index={idx}
                      onResolve={(candidateId, qty, unit) => handleResolveAmbiguity(idx, candidateId, qty, unit)}
                      onDismiss={() => setAmbiguousItems(prev => prev.filter((_, i) => i !== idx))}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Manual Ingredient Search & Add Panel */}
          <motion.div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '12px' }}>
              2. Or Add Ingredients from USDA Food Database
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) 100px 120px auto', gap: '12px', alignItems: 'flex-start' }}>
              {/* Food Autocomplete Input */}
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={foodSearchQuery}
                  onChange={(e) => {
                    setFoodSearchQuery(e.target.value);
                    setSelectedFood(null);
                  }}
                  placeholder="Search USDA foods (e.g. salmon, lentils, rice, egg)..."
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: '10px',
                    border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.8)',
                    fontSize: '0.95rem'
                  }}
                />
                {searchResults.length > 0 && !selectedFood && (
                  <div style={{
                    position: 'absolute', top: '105%', left: 0, right: 0, zIndex: 30,
                    background: '#ffffff', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                    border: '1px solid var(--glass-border)', maxHeight: '240px', overflowY: 'auto'
                  }}>
                    {searchResults.map(food => (
                      <div
                        key={food.id}
                        onClick={() => {
                          setSelectedFood(food);
                          setFoodSearchQuery(food.common_name);
                          setSearchResults([]);
                        }}
                        style={{
                          padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(42,140,110,0.08)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{food.common_name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#666' }}>{food.food_group} • {food.source.type} #{food.source.source_id}</div>
                        </div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--accent-primary)' }}>
                          {food.nutrients_per_100g.calories.value} kcal/100g
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quantity Input */}
              <input
                type="number"
                min="0.1"
                step="any"
                value={inputQuantity}
                onChange={(e) => setInputQuantity(e.target.value)}
                placeholder="Qty"
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: '10px',
                  border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.8)',
                  fontSize: '0.95rem', textAlign: 'center'
                }}
              />

              {/* Unit Dropdown */}
              <select
                value={inputUnit}
                onChange={(e) => setInputUnit(e.target.value)}
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: '10px',
                  border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.8)',
                  fontSize: '0.95rem', cursor: 'pointer'
                }}
              >
                {availableUnits.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>

              {/* Add Button */}
              <button
                type="button"
                onClick={() => handleAddManualIngredient()}
                disabled={!selectedFood}
                className="btn btn-gradient"
                style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={16} /> Add
              </button>
            </div>
          </motion.div>

          {/* Confirmed Ingredients List & Summary */}
          {ingredients.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel" style={{ padding: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>
                  Confirmed Meal Ingredients ({ingredients.length})
                </h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Total Weight: {liveNutrition?.total_weight_grams || 0} g
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                {ingredients.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      background: 'rgba(255,255,255,0.6)', padding: '12px 18px', borderRadius: '12px',
                      border: '1px solid var(--glass-border)'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{item.food.common_name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Portion: {item.quantity} {item.unit} ({item.calculated.gram_weight} g) • Source: {item.food.source.name} ({item.food.source.source_id})
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>
                          {item.calculated.nutrients.calories.value} kcal
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          P: {item.calculated.nutrients.protein_g.value}g • C: {item.calculated.nutrients.carbs_g.value}g • F: {item.calculated.nutrients.fat_g.value}g
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveIngredient(item.id)}
                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '6px' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Real-time Deterministic Totals Grid */}
              {liveNutrition && (
                <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '20px', marginBottom: '24px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase' }}>
                    Deterministic Meal Totals (Formula: Amount = per 100g × grams / 100)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '10px' }}>
                    {Object.entries(liveNutrition.totals).map(([key, info]) => (
                      <div
                        key={key}
                        style={{
                          background: info.isComplete ? 'rgba(42, 140, 110, 0.08)' : 'rgba(234, 88, 12, 0.08)',
                          border: info.isComplete ? '1px solid rgba(42, 140, 110, 0.2)' : '1px solid rgba(234, 88, 12, 0.3)',
                          borderRadius: '10px',
                          padding: '10px',
                          textAlign: 'center',
                        }}
                      >
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                          {key.replace('_', ' ').replace('mcg', '').replace('mg', '').replace('g', '')}
                        </div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, margin: '2px 0' }}>
                          {info.amount} <span style={{ fontSize: '0.75rem', fontWeight: 400 }}>{info.unit}</span>
                        </div>
                        {!info.isComplete && (
                          <div style={{ fontSize: '0.65rem', color: '#ea580c', fontWeight: 600 }}>
                            Partial (Unknown in {info.missingIn.length})
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={handleLogMeal}
                  disabled={isSubmitting || ingredients.length === 0}
                  className="btn btn-gradient"
                  style={{ padding: '14px 36px', fontSize: '1rem', fontWeight: 600 }}
                >
                  {isSubmitting ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Loader2 size={18} className="spin" /> Logging Deterministic Meal...
                    </span>
                  ) : (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CheckCircle2 size={18} /> Confirm & Log Meal
                    </span>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* ─── TAB 2: GEMINI AI ALTERNATIVE (LEGACY) ──────────────────────── */}
      {activeEngine === 'gemini' && (
        <motion.div className="glass-panel" style={{ padding: '32px', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: 'var(--accent-primary)' }}>
            <Sparkles size={20} />
            <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Google Gemini 2.0 Flash AI Alternative</span>
          </div>

          <form onSubmit={handleLogMeal} style={{ position: 'relative' }}>
            <div 
              onDragOver={handleDragOver} 
              onDrop={handleDrop}
              style={{ marginBottom: '24px', border: '2px dashed var(--glass-border)', padding: '24px', borderRadius: '16px', textAlign: 'center', position: 'relative', cursor: 'pointer' }}
              onClick={() => fileInputRef.current?.click()}
            >
              {preview ? (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <img src={preview} alt="Preview" style={{ maxHeight: '200px', borderRadius: '8px' }} />
                  <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setPreview(null); }} style={{ position: 'absolute', top: -10, right: -10, background: 'red', color: 'white', borderRadius: '50%', border: 'none', cursor: 'pointer', padding: '4px' }}><X size={16} /></button>
                </div>
              ) : (
                <div style={{ color: 'var(--text-muted)' }}>
                  <Upload size={40} style={{ margin: '0 auto 8px', color: 'var(--accent-primary)' }} />
                  <p style={{ fontWeight: 500, marginBottom: '4px' }}>Drag food photo here or click to upload</p>
                  <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>JPEG, PNG, WebP up to 10MB</span>
                </div>
              )}
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} />
            </div>

            <textarea
              value={mealText}
              onChange={(e) => setMealText(e.target.value)}
              placeholder="Or describe what you ate (e.g. 2 scrambled eggs, avocado toast, and black coffee)..."
              disabled={isSubmitting}
              style={{
                width: '100%', minHeight: '110px', background: 'rgba(255,255,255,0.65)',
                border: '1px solid var(--glass-border)', borderRadius: '16px',
                padding: '20px', color: 'var(--text-main)', fontSize: '1.05rem',
                outline: 'none', resize: 'vertical', fontFamily: 'inherit'
              }}
            />
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button type="submit" disabled={isSubmitting || (!mealText && !selectedFile)} className="btn btn-gradient" style={{ padding: '12px 32px' }}>
                {isSubmitting ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Loader2 size={18} className="spin" />
                    Analyzing with Gemini...
                  </span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Send size={18} /> Process with Gemini AI
                  </span>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* ─── SUCCESS DISPLAY PANEL ───────────────────────────────────────── */}
      <AnimatePresence>
        {successData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass-panel"
            style={{
              padding: '32px',
              border: successData.isOffline
                ? '1px solid rgba(234, 88, 12, 0.4)'
                : '1px solid rgba(42, 140, 110, 0.3)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              {successData.isOffline ? (
                <WifiOff color="#ea580c" size={28} />
              ) : (
                <CheckCircle2 color="var(--accent-primary)" size={28} />
              )}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h2 className="heading-font" style={{ fontSize: '1.5rem', color: successData.isOffline ? '#ea580c' : 'var(--accent-primary)' }}>
                    {successData.isOffline ? 'Saved Offline (Queued for Sync)' : 'Successfully Logged to Supabase'}
                  </h2>
                  <span style={{
                    fontSize: '0.75rem',
                    padding: '3px 8px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    background: successData.engine === 'local_usda' ? 'rgba(42,140,110,0.15)' : 'rgba(0,0,0,0.08)',
                    color: successData.engine === 'local_usda' ? 'var(--accent-primary)' : 'var(--text-muted)'
                  }}>
                    {successData.engine === 'local_usda' ? 'USDA DETERMINISTIC' : 'GEMINI AI'}
                  </span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {successData.text}
                </p>
              </div>
            </div>

            {/* If local engine with confirmed ingredients */}
            {successData.ingredients && successData.ingredients.length > 0 && (
              <div style={{ marginBottom: '20px', background: 'rgba(255,255,255,0.4)', borderRadius: '12px', padding: '14px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                  INDIVIDUAL INGREDIENTS BREAKDOWN:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {successData.ingredients.map(ing => (
                    <span
                      key={ing.id}
                      style={{
                        background: '#ffffff',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        border: '1px solid var(--glass-border)'
                      }}
                    >
                      {ing.food.common_name} ({ing.quantity} {ing.unit})
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Nutrients Grid */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '28px' }}>
              {Object.entries(successData.payload).map(([k, v]) => {
                if (k === 'description' || k === 'id' || k === 'user_id' || k === 'meal_id' || k === 'created_at') return null;
                const isUnknown = v === null;
                return (
                  <div
                    key={k}
                    style={{
                      background: successData.isOffline ? 'rgba(234, 88, 12, 0.08)' : 'rgba(42,140,110,0.10)',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      flex: '1 1 120px'
                    }}
                  >
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>
                      {k.replace('_', ' ')}
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 600, color: isUnknown ? '#ea580c' : 'inherit' }}>
                      {isUnknown ? 'Unknown' : v}
                    </div>
                  </div>
                );
              })}
            </div>

            <button onClick={() => navigate('/app/dashboard')} className="btn btn-outline" style={{ width: '100%' }}>
              Return to Dashboard
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * Ambiguous Item Card Component for requesting user confirmation (Requirement 3)
 */
function AmbiguousItemCard({ item, onResolve, onDismiss }) {
  const [selectedCandidateId, setSelectedCandidateId] = useState(
    item.candidates && item.candidates.length > 0 ? item.candidates[0].id : ''
  );
  const [quantity, setQuantity] = useState(item.parsed_quantity || 100);
  const [unit, setUnit] = useState(item.parsed_unit || 'g');

  const selectedCandidate = useMemo(() => {
    return getFoodById(selectedCandidateId);
  }, [selectedCandidateId]);

  const unitsList = useMemo(() => {
    if (selectedCandidate?.serving_weights_g) {
      return Object.keys(selectedCandidate.serving_weights_g).filter(u => u !== 'g' && u !== 'kg');
    }
    return ['cup', 'tbsp', 'serving', 'piece'];
  }, [selectedCandidate]);

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: '12px',
      padding: '16px 20px',
      border: '1px solid rgba(234, 88, 12, 0.3)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: '#ea580c' }}>
            Item: "{item.raw_text}"
          </div>
          <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '2px' }}>
            {item.reasons?.join(' • ') || 'Please select exact food and quantity'}
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          style={{ background: 'transparent', border: 'none', color: '#999', cursor: 'pointer' }}
        >
          <X size={16} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 1.5fr) 90px 100px auto', gap: '10px', alignItems: 'center' }}>
        {/* Candidate food selector */}
        {item.candidates && item.candidates.length > 0 ? (
          <select
            value={selectedCandidateId}
            onChange={(e) => setSelectedCandidateId(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '0.9rem' }}
          >
            {item.candidates.map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.group})</option>
            ))}
          </select>
        ) : (
          <span style={{ fontSize: '0.9rem', color: '#333', fontWeight: 500 }}>{item.food_query}</span>
        )}

        {/* Quantity */}
        <input
          type="number"
          min="0.1"
          step="any"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="Quantity"
          style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '0.9rem', textAlign: 'center' }}
        />

        {/* Unit */}
        <select
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '0.9rem' }}
        >
          <option value="g">grams (g)</option>
          {unitsList.map(u => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>

        {/* Confirm Button */}
        <button
          type="button"
          onClick={() => onResolve(selectedCandidateId, quantity, unit)}
          style={{
            background: '#ea580c',
            color: '#fff',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Check size={14} /> Confirm
        </button>
      </div>
    </div>
  );
}

export default MealLog;
