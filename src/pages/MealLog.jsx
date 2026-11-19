import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera, Send, Loader2, CheckCircle2, X, Upload, AlertCircle, WifiOff,
  Database, Sparkles, Plus, Trash2, HelpCircle, Check, RefreshCw, ChevronDown, Info,
  Search, Utensils, Edit3, ArrowRight
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSync } from '../hooks/useSync';
import {
  searchFoods as localSearchFallback,
  getFoodById as localGetByIdFallback,
  calculateMealNutrition as localCalculateFallback
} from '../utils/localNutritionEngine';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const MealLog = () => {
  // ─── 1. Navigation & Auth State ──────────────────────────────────────────
  const navigate = useNavigate();
  const { session } = useAuth();
  const { isOnline, logMealOffline } = useSync();

  // ─── 2. Top-level Tab Mode: 'build' | 'describe' | 'photo' ───────────────
  const [activeTab, setActiveTab] = useState('build');

  // ─── 3. Shared Submission & Feedback States ──────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successData, setSuccessData] = useState(null);

  // ─── 4. Build Meal Tab (Local Nutrition Engine) State ────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchAmbiguity, setSearchAmbiguity] = useState(null); // { prompt, candidates }

  // Selected food item for portion/quantity assignment
  const [stagedFood, setStagedFood] = useState(null);
  const [stagedPortionId, setStagedPortionId] = useState('g'); // 'g' or portion_id
  const [stagedQuantity, setStagedQuantity] = useState('100'); // numeric string

  // Confirmed meal composition ingredients
  const [mealIngredients, setMealIngredients] = useState([]);
  const [mealName, setMealName] = useState('');
  const [mealType, setMealType] = useState('lunch');

  // Live calculation results from backend
  const [liveTotals, setLiveTotals] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Editing ingredient modal / inline
  const [editingIngredientId, setEditingIngredientId] = useState(null);
  const [editQty, setEditQty] = useState('100');

  // ─── 5. Describe Meal Tab (Local NLP Parser) State ───────────────────────
  const [textDescription, setTextDescription] = useState('');
  const [parsedDraft, setParsedDraft] = useState(null);
  const [isParsingMeal, setIsParsingMeal] = useState(false);
  const [draftIngredients, setDraftIngredients] = useState([]);
  const [draftClarifications, setDraftClarifications] = useState([]);
  const [draftTotals, setDraftTotals] = useState(null);
  const [isCalculatingDraft, setIsCalculatingDraft] = useState(false);
  const [customPortionInputs, setCustomPortionInputs] = useState({});

  // ─── 6. Upload Photo Tab (Gemini Vision) State ───────────────────────────
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [photoCaption, setPhotoCaption] = useState('');
  const fileInputRef = useRef(null);

  // ─── Debounced Search against GET /api/foods/search ───────────────────────
  const searchTimeoutRef = useRef(null);

  const performFoodSearch = useCallback(async (queryText) => {
    const trimmed = queryText.trim();
    if (!trimmed) {
      setSearchResults([]);
      setSearchAmbiguity(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setErrorMessage('');

    try {
      const resp = await fetch(`${API_BASE_URL}/api/foods/search?q=${encodeURIComponent(trimmed)}&limit=15`);
      if (resp.ok) {
        const data = await resp.json();
        setSearchResults(data.foods || []);

        if (data.is_ambiguous && Array.isArray(data.candidates) && data.candidates.length > 1) {
          setSearchAmbiguity({
            prompt: data.clarification_prompt || `Multiple varieties found for '${trimmed}'. Please select one:`,
            candidates: data.candidates,
          });
        } else {
          setSearchAmbiguity(null);
        }
      } else {
        throw new Error('Catalog search returned ' + resp.status);
      }
    } catch (err) {
      console.warn('Backend search unreachable, using fallback dataset:', err.message);
      const fallbackList = localSearchFallback(trimmed, 8);
      setSearchResults(fallbackList);
      setSearchAmbiguity(null);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchAmbiguity(null);
      setIsSearching(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      performFoodSearch(searchQuery);
    }, 280);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery, performFoodSearch]);

  // When a food item is clicked from search or ambiguity card
  const handleSelectFood = (food) => {
    setStagedFood(food);
    setSearchQuery(food.common_name || food.description || food.name);
    setSearchResults([]);
    setSearchAmbiguity(null);

    // Default to first verified portion if available, else grams
    if (Array.isArray(food.portions) && food.portions.length > 0) {
      const firstP = food.portions[0];
      setStagedPortionId(String(firstP.portion_id || firstP.id));
      setStagedQuantity('1');
    } else {
      setStagedPortionId('g');
      setStagedQuantity('100');
    }
  };

  // Calculated gram weight for the currently staged food
  const stagedGramWeight = useMemo(() => {
    if (!stagedFood) return 0;
    const qty = parseFloat(stagedQuantity);
    if (isNaN(qty) || qty <= 0) return 0;

    if (stagedPortionId === 'g') {
      return Math.round(qty * 10) / 10;
    }

    if (stagedFood.portions) {
      const p = stagedFood.portions.find(pt => String(pt.portion_id || pt.id) === String(stagedPortionId));
      if (p && p.gram_weight) {
        return Math.round((qty * Number(p.gram_weight)) * 10) / 10;
      }
    }
    return Math.round(qty * 10) / 10;
  }, [stagedFood, stagedPortionId, stagedQuantity]);

  // Add the staged food to confirmed meal ingredients
  const handleAddIngredient = () => {
    if (!stagedFood) return;

    const qty = parseFloat(stagedQuantity);
    if (isNaN(qty) || qty <= 0) {
      setErrorMessage('Please enter a valid serving quantity greater than 0.');
      return;
    }

    let portionDesc = `${stagedGramWeight}g`;
    let matchedPortionId = null;

    if (stagedPortionId !== 'g' && stagedFood.portions) {
      const p = stagedFood.portions.find(pt => String(pt.portion_id || pt.id) === String(stagedPortionId));
      if (p) {
        matchedPortionId = p.portion_id || p.id;
        portionDesc = `${qty} × ${p.modifier || p.unit || 'serving'} (${stagedGramWeight}g)`;
      }
    }

    const newIng = {
      id: `ing_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      fdc_id: stagedFood.fdc_id || stagedFood.source?.source_id,
      food_name: stagedFood.common_name || stagedFood.description || stagedFood.name,
      food_category: stagedFood.food_category || stagedFood.food_group || 'General Food',
      quantity: qty,
      unit: stagedPortionId === 'g' ? 'g' : (stagedFood.portions?.find(p => String(p.portion_id || p.id) === stagedPortionId)?.unit || 'serving'),
      portion_id: matchedPortionId,
      portion_description: portionDesc,
      weight_g: stagedGramWeight,
      nutrients_per_100g: stagedFood.nutrients_per_100g,
    };

    setMealIngredients(prev => [...prev, newIng]);
    setStagedFood(null);
    setSearchQuery('');
    setErrorMessage('');
  };

  const handleRemoveIngredient = (id) => {
    setMealIngredients(prev => prev.filter(i => i.id !== id));
  };

  const handleUpdateIngredientWeight = (id, newWeight) => {
    const val = parseFloat(newWeight);
    if (isNaN(val) || val <= 0) return;

    setMealIngredients(prev => prev.map(i => {
      if (i.id !== id) return i;
      return {
        ...i,
        weight_g: val,
        portion_description: `${val}g`,
        quantity: val,
        unit: 'g',
        portion_id: null,
      };
    }));
    setEditingIngredientId(null);
  };

  // ─── Debounced Live Nutrition Calculation ─────────────────────────────────
  const calcTimeoutRef = useRef(null);

  useEffect(() => {
    if (mealIngredients.length === 0) {
      setLiveTotals(null);
      setIsCalculating(false);
      return;
    }

    if (calcTimeoutRef.current) clearTimeout(calcTimeoutRef.current);

    setIsCalculating(true);
    calcTimeoutRef.current = setTimeout(async () => {
      try {
        const payload = {
          ingredients: mealIngredients.map(i => ({
            fdc_id: i.fdc_id,
            weight_g: i.weight_g,
            portion_id: i.portion_id,
            quantity: i.quantity,
            unit: i.unit,
          })),
        };

        const res = await fetch(`${API_BASE_URL}/api/nutrition/calculate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const calcData = await res.json();
          setLiveTotals(calcData);
        } else {
          throw new Error('Live calculation returned ' + res.status);
        }
      } catch (err) {
        console.warn('Backend calculation error, using client-side fallback:', err.message);
        // Client fallback calculation
        const fallbackTotals = localCalculateFallback(mealIngredients.map(i => ({
          food: {
            id: i.fdc_id,
            common_name: i.food_name,
            nutrients_per_100g: i.nutrients_per_100g,
          },
          quantity: i.weight_g,
          unit: 'g',
        })));
        setLiveTotals(fallbackTotals);
      } finally {
        setIsCalculating(false);
      }
    }, 250);

    return () => {
      if (calcTimeoutRef.current) clearTimeout(calcTimeoutRef.current);
    };
  }, [mealIngredients]);

  // ─── Photo Handling for Upload Tab ───────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setErrorMessage('');
    }
  };

  const handleDragOver = (e) => { e.preventDefault(); };
  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setErrorMessage('');
    }
  };

  // ─── Phase 2: Natural Language Meal Parsing Handlers ──────────────────────
  const handleParseMeal = async (e) => {
    if (e) e.preventDefault();
    const text = textDescription.trim();
    if (!text) {
      setErrorMessage('Please enter what you ate to analyze.');
      return;
    }

    setIsParsingMeal(true);
    setErrorMessage('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/meals/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: text }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || `Parsing failed with status ${res.status}`);
      }

      const data = await res.json();
      setParsedDraft(data);
      setDraftIngredients(data.ingredients || []);
      setDraftClarifications(data.clarifications || []);
      if (data.calculated_nutrition) {
        setDraftTotals(data.calculated_nutrition);
      } else {
        recalculateDraftNutrition(data.ingredients || []);
      }
    } catch (err) {
      console.error('Error parsing meal:', err);
      setErrorMessage(err.message || 'Failed to parse meal description.');
    } finally {
      setIsParsingMeal(false);
    }
  };

  const recalculateDraftNutrition = async (ingredients) => {
    const valid = (ingredients || []).filter(i => i.fdc_id && Number(i.weight_g) > 0);
    if (valid.length === 0) {
      setDraftTotals(null);
      return;
    }

    setIsCalculatingDraft(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/nutrition/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredients: valid.map(i => ({
            fdc_id: i.fdc_id,
            weight_g: Number(i.weight_g),
            food_name: i.food_name,
            portion_description: i.portion_description,
          })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setDraftTotals(data);
      }
    } catch (err) {
      console.warn('Live draft calculation error:', err);
    } finally {
      setIsCalculatingDraft(false);
    }
  };

  const handleResolveAmbiguity = (clarification, option) => {
    const updated = draftIngredients.map(ing => {
      if (ing.id === clarification.ingredient_id || ing.raw_text === clarification.raw_text) {
        return {
          ...ing,
          fdc_id: option.fdc_id,
          food_name: option.name,
          food_category: option.food_category || ing.food_category,
          status: 'confirmed',
          weight_g: ing.weight_g || 100,
          confidence: 0.95,
        };
      }
      return ing;
    });

    setDraftIngredients(updated);
    const remaining = draftClarifications.filter(c => c.ingredient_id !== clarification.ingredient_id);
    setDraftClarifications(remaining);
    recalculateDraftNutrition(updated);
  };

  const handleResolvePortion = (clarification, weightG, portionDesc) => {
    const updated = draftIngredients.map(ing => {
      if (ing.id === clarification.ingredient_id || ing.raw_text === clarification.raw_text) {
        return {
          ...ing,
          weight_g: weightG,
          portion_description: portionDesc || `${weightG}g`,
          status: ing.fdc_id ? 'confirmed' : ing.status,
          confidence: 0.90,
        };
      }
      return ing;
    });

    setDraftIngredients(updated);
    const remaining = draftClarifications.filter(c => c.ingredient_id !== clarification.ingredient_id);
    setDraftClarifications(remaining);
    recalculateDraftNutrition(updated);
  };

  const handleAdjustDraftQty = (index, deltaGrams) => {
    const updated = draftIngredients.map((ing, i) => {
      if (i === index) {
        const current = Number(ing.weight_g) || 100;
        const nextWeight = Math.max(10, Math.round((current + deltaGrams) * 10) / 10);
        return {
          ...ing,
          weight_g: nextWeight,
          portion_description: `${nextWeight}g`,
        };
      }
      return ing;
    });
    setDraftIngredients(updated);
    recalculateDraftNutrition(updated);
  };

  const handleDeleteDraftIngredient = (index) => {
    const target = draftIngredients[index];
    const updated = draftIngredients.filter((_, i) => i !== index);
    setDraftIngredients(updated);
    if (target) {
      setDraftClarifications(prev => prev.filter(c => c.ingredient_id !== target.id));
    }
    recalculateDraftNutrition(updated);
  };

  const handleSaveDraftMeal = async () => {
    const valid = draftIngredients.filter(i => i.fdc_id && Number(i.weight_g) > 0);
    if (valid.length === 0) {
      setErrorMessage('Please ensure at least one ingredient is confirmed with a valid weight before saving.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    const headers = { 'Content-Type': 'application/json' };
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    try {
      const payload = {
        description: parsedDraft?.original_text || textDescription.trim() || 'Parsed Meal',
        meal_type: mealType,
        ingredients: valid.map(i => ({
          fdc_id: i.fdc_id,
          weight_g: Number(i.weight_g),
          food_name: i.food_name,
          portion_description: i.portion_description || `${i.weight_g}g`,
        })),
      };

      const res = await fetch(`${API_BASE_URL}/api/meals/catalog`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || `Failed to save meal (${res.status})`);
      }

      const data = await res.json();
      setSuccessData({
        method: 'describe',
        engine: 'local_nlp',
        meal: data.meal,
        isOffline: false,
      });

      setParsedDraft(null);
      setDraftIngredients([]);
      setDraftClarifications([]);
      setDraftTotals(null);
      setTextDescription('');
    } catch (err) {
      setErrorMessage(err.message || 'Failed to save confirmed meal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetDraft = () => {
    setParsedDraft(null);
    setDraftIngredients([]);
    setDraftClarifications([]);
    setDraftTotals(null);
    setErrorMessage('');
  };

  // ─── Meal Submission Handler ─────────────────────────────────────────────
  const handleSubmitMeal = async (e) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    const headers = {};
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    try {
      // ──────────────────────────────────────────────────────────────────────
      // TAB 1: BUILD MEAL (Local Nutrition Engine)
      // ──────────────────────────────────────────────────────────────────────
      if (activeTab === 'build') {
        if (mealIngredients.length === 0) {
          setErrorMessage('Please add at least one ingredient before saving.');
          setIsSubmitting(false);
          return;
        }

        // Offline safety guard: local database saving requires network for USDA verification
        if (!isOnline || !navigator.onLine) {
          setErrorMessage('You are currently offline. Building meals with the USDA database requires an active connection. Switch to "Describe Meal" to queue meals offline.');
          setIsSubmitting(false);
          return;
        }

        headers['Content-Type'] = 'application/json';
        const payload = {
          description: mealName.trim() || undefined,
          meal_type: mealType,
          ingredients: mealIngredients.map(i => ({
            fdc_id: i.fdc_id,
            weight_g: i.weight_g,
            portion_id: i.portion_id,
            quantity: i.quantity,
            unit: i.unit,
            portion_description: i.portion_description,
          })),
        };

        const resp = await fetch(`${API_BASE_URL}/api/meals/catalog`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });

        if (!resp.ok) {
          const errData = await resp.json().catch(() => null);
          throw new Error(errData?.error || `Server error (${resp.status})`);
        }

        const data = await resp.json();
        setSuccessData({
          method: 'build',
          engine: 'local_usda',
          meal: data.meal,
          totals: data.totals || (liveTotals ? liveTotals.totals : null),
          completeness: data.completeness,
          isOffline: false,
        });

        // Reset inputs
        setMealIngredients([]);
        setMealName('');
      }

      // ──────────────────────────────────────────────────────────────────────
      // TAB 2: DESCRIBE MEAL (Gemini AI NLP)
      // ──────────────────────────────────────────────────────────────────────
      else if (activeTab === 'describe') {
        const text = textDescription.trim();
        if (!text) {
          setErrorMessage('Please enter what you ate.');
          setIsSubmitting(false);
          return;
        }

        // Offline queueing support
        if (!isOnline || !navigator.onLine) {
          const { localMeal } = logMealOffline(text);
          setSuccessData({
            method: 'describe',
            engine: 'gemini',
            meal: {
              description: text,
              logged_at: new Date().toISOString(),
              nutrition: localMeal,
            },
            isOffline: true,
          });
          setTextDescription('');
          setIsSubmitting(false);
          return;
        }

        headers['Content-Type'] = 'application/json';
        const resp = await fetch(`${API_BASE_URL}/api/meals`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ description: text, engine: 'gemini' }),
        });

        if (!resp.ok) {
          const errData = await resp.json().catch(() => null);
          throw new Error(errData?.error || `Server error (${resp.status})`);
        }

        const data = await resp.json();
        setSuccessData({
          method: 'describe',
          engine: 'gemini',
          meal: data.meal,
          isOffline: false,
        });
        setTextDescription('');
      }

      // ──────────────────────────────────────────────────────────────────────
      // TAB 3: UPLOAD PHOTO (Gemini Vision)
      // ──────────────────────────────────────────────────────────────────────
      else if (activeTab === 'photo') {
        if (!selectedFile) {
          setErrorMessage('Please choose or drop an image file.');
          setIsSubmitting(false);
          return;
        }

        if (!isOnline || !navigator.onLine) {
          setErrorMessage('Photo analysis requires an internet connection for Gemini Vision AI.');
          setIsSubmitting(false);
          return;
        }

        const formData = new FormData();
        formData.append('image', selectedFile);
        formData.append('description', photoCaption.trim() || 'Food Photo');

        const resp = await fetch(`${API_BASE_URL}/api/meals/image`, {
          method: 'POST',
          headers,
          body: formData,
        });

        if (!resp.ok) {
          const errData = await resp.json().catch(() => null);
          throw new Error(errData?.error || `Vision AI error (${resp.status})`);
        }

        const data = await resp.json();
        setSuccessData({
          method: 'photo',
          engine: 'gemini',
          meal: data.meal,
          isOffline: false,
        });
        setSelectedFile(null);
        setPreviewUrl(null);
        setPhotoCaption('');
      }
    } catch (err) {
      console.error('Submit error:', err);
      setErrorMessage(err.message || 'An error occurred while logging the meal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '920px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div>
        <h1 className="heading-font" style={{ fontSize: '2.4rem', marginBottom: '8px' }}>
          Log Your Meal
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>
          Build meals with exact USDA analytical data, describe in natural language with our local parser, or upload food photos with Gemini Vision.
        </p>
      </div>

      {/* ─── 3-Tab Segmented Control ─────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '8px',
        background: 'rgba(255,255,255,0.6)',
        padding: '6px',
        borderRadius: '18px',
        border: '1px solid var(--glass-border)',
      }}>
        {/* Tab 1: Build Meal */}
        <button
          type="button"
          onClick={() => { setActiveTab('build'); setErrorMessage(''); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '12px 14px',
            borderRadius: '14px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.92rem',
            transition: 'all 0.2s ease',
            background: activeTab === 'build' ? 'var(--accent-primary)' : 'transparent',
            color: activeTab === 'build' ? '#ffffff' : 'var(--text-main)',
            boxShadow: activeTab === 'build' ? '0 4px 14px rgba(16, 185, 129, 0.28)' : 'none',
          }}
        >
          <Database size={18} />
          <span>Build Meal</span>
          <span style={{
            fontSize: '0.68rem',
            padding: '2px 6px',
            borderRadius: '6px',
            fontWeight: 700,
            background: activeTab === 'build' ? 'rgba(255,255,255,0.25)' : 'rgba(16, 185, 129, 0.14)',
            color: activeTab === 'build' ? '#fff' : 'var(--accent-primary)',
          }}>
            USDA LOCAL
          </span>
        </button>

        {/* Tab 2: Describe Meal */}
        <button
          type="button"
          onClick={() => { setActiveTab('describe'); setErrorMessage(''); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '12px 14px',
            borderRadius: '14px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.92rem',
            transition: 'all 0.2s ease',
            background: activeTab === 'describe' ? 'var(--accent-primary)' : 'transparent',
            color: activeTab === 'describe' ? '#ffffff' : 'var(--text-main)',
            boxShadow: activeTab === 'describe' ? '0 4px 14px rgba(16, 185, 129, 0.28)' : 'none',
          }}
        >
          <Sparkles size={18} />
          <span>Describe Meal</span>
          <span style={{
            fontSize: '0.68rem',
            padding: '2px 6px',
            borderRadius: '6px',
            fontWeight: 700,
            background: activeTab === 'describe' ? 'rgba(255,255,255,0.25)' : 'rgba(16, 185, 129, 0.14)',
            color: activeTab === 'describe' ? '#fff' : 'var(--accent-primary)',
          }}>
            LOCAL NLP
          </span>
        </button>

        {/* Tab 3: Upload Photo */}
        <button
          type="button"
          onClick={() => { setActiveTab('photo'); setErrorMessage(''); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '12px 14px',
            borderRadius: '14px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.92rem',
            transition: 'all 0.2s ease',
            background: activeTab === 'photo' ? 'var(--accent-primary)' : 'transparent',
            color: activeTab === 'photo' ? '#ffffff' : 'var(--text-main)',
            boxShadow: activeTab === 'photo' ? '0 4px 14px rgba(16, 185, 129, 0.28)' : 'none',
          }}
        >
          <Camera size={18} />
          <span>Upload Photo</span>
          <span style={{
            fontSize: '0.68rem',
            padding: '2px 6px',
            borderRadius: '6px',
            fontWeight: 700,
            background: activeTab === 'photo' ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.06)',
            color: activeTab === 'photo' ? '#fff' : 'var(--text-muted)',
          }}>
            GEMINI VISION
          </span>
        </button>
      </div>

      {/* ─── Error Notification ──────────────────────────────────────────── */}
      {errorMessage && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '14px',
            padding: '14px 18px',
            fontSize: '0.92rem',
            color: '#dc2626',
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
          }}
        >
          <AlertCircle size={20} style={{ flexShrink: 0 }} />
          <span>{errorMessage}</span>
        </motion.div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: BUILD MEAL (LOCAL NUTRITION ENGINE)                          */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'build' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Step 1: Food Search Bar */}
          <div className="glass-panel" style={{ padding: '26px' }}>
            <div style={{ marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Search size={20} color="var(--accent-primary)" />
                <span>Search USDA Food Catalog</span>
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Search over 13,700 curated USDA foods, common Indian staples (e.g. dal, roti, paneer, chana), and whole foods.
              </p>
            </div>

            <div style={{ position: 'relative' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', pointerEvents: 'none' }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Type a food (e.g., lentils, basmati rice, paneer, spinach, salmon, oats)..."
                  style={{
                    width: '100%',
                    padding: '14px 44px 14px 46px',
                    borderRadius: '14px',
                    border: '1px solid var(--glass-border)',
                    background: 'rgba(255,255,255,0.85)',
                    fontSize: '1rem',
                    color: 'var(--text-main)',
                    outline: 'none',
                  }}
                />
                {isSearching && (
                  <Loader2 size={18} className="spin" color="var(--accent-primary)" style={{ position: 'absolute', right: '16px' }} />
                )}
                {!isSearching && searchQuery && (
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(''); setSearchResults([]); setSearchAmbiguity(null); }}
                    style={{ position: 'absolute', right: '14px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                  >
                    <X size={18} />
                  </button>
                )}
              </div>

              {/* Autocomplete Dropdown List */}
              {searchResults.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '105%',
                  left: 0,
                  right: 0,
                  zIndex: 40,
                  background: '#ffffff',
                  borderRadius: '14px',
                  boxShadow: '0 12px 36px rgba(0,0,0,0.12)',
                  border: '1px solid var(--glass-border)',
                  maxHeight: '280px',
                  overflowY: 'auto',
                }}>
                  {searchResults.map((item) => {
                    const fdcId = item.fdc_id || item.source?.source_id;
                    const cals = item.nutrients_per_100g?.calories?.value;
                    const prot = item.nutrients_per_100g?.protein_g?.value;

                    return (
                      <div
                        key={item.id || fdcId}
                        onClick={() => handleSelectFood(item)}
                        style={{
                          padding: '12px 18px',
                          cursor: 'pointer',
                          borderBottom: '1px solid #f2f2f2',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.08)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.94rem', color: 'var(--text-main)' }}>
                            {item.common_name || item.description || item.name}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            <span style={{ fontWeight: 500 }}>{item.food_category || item.food_group}</span>
                            {fdcId && <span> • USDA #{fdcId}</span>}
                          </div>
                        </div>

                        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '12px' }}>
                          <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--accent-primary)' }}>
                            {cals !== null && cals !== undefined ? `${Math.round(cals)} kcal` : '—'}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {prot ? `P: ${prot}g / 100g` : 'per 100g'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* No results state */}
              {!isSearching && searchQuery.trim().length > 1 && searchResults.length === 0 && !searchAmbiguity && (
                <div style={{
                  position: 'absolute',
                  top: '105%',
                  left: 0,
                  right: 0,
                  zIndex: 40,
                  background: '#ffffff',
                  borderRadius: '14px',
                  boxShadow: '0 12px 36px rgba(0,0,0,0.12)',
                  border: '1px solid var(--glass-border)',
                  padding: '20px',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '0.9rem',
                }}>
                  No USDA foods matched "{searchQuery}". Try a generic term like "rice", "beans", or "chicken".
                </div>
              )}
            </div>
          </div>

          {/* Ambiguity Clarification Card (Requirement 3) */}
          <AnimatePresence>
            {searchAmbiguity && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="glass-panel"
                style={{
                  padding: '24px',
                  border: '1.5px solid rgba(245, 158, 11, 0.45)',
                  background: 'rgba(254, 243, 199, 0.35)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' }}>
                  <HelpCircle color="#d97706" size={24} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#b45309' }}>
                      Clarification Needed
                    </h4>
                    <p style={{ fontSize: '0.88rem', color: '#92400e', marginTop: '2px' }}>
                      {searchAmbiguity.prompt}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {searchAmbiguity.candidates.map((cand) => (
                    <button
                      key={cand.fdc_id || cand.id}
                      type="button"
                      onClick={() => handleSelectFood(cand)}
                      style={{
                        padding: '10px 16px',
                        background: '#ffffff',
                        border: '1px solid rgba(217, 119, 6, 0.35)',
                        borderRadius: '10px',
                        fontSize: '0.88rem',
                        fontWeight: 600,
                        color: 'var(--text-main)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#d97706';
                        e.currentTarget.style.color = '#ffffff';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#ffffff';
                        e.currentTarget.style.color = 'var(--text-main)';
                      }}
                    >
                      <Check size={14} />
                      <span>{cand.common_name || cand.name}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Step 2: Portion & Serving Builder for Selected Food */}
          <AnimatePresence>
            {stagedFood && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="glass-panel"
                style={{
                  padding: '24px 28px',
                  border: '1.5px solid rgba(16, 185, 129, 0.35)',
                  background: 'rgba(236, 253, 245, 0.5)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase' }}>
                      Selected Ingredient
                    </span>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      {stagedFood.common_name || stagedFood.description || stagedFood.name}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStagedFood(null)}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                  >
                    <X size={20} />
                  </button>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(200px, 1.8fr) 100px auto auto',
                  gap: '12px',
                  alignItems: 'center',
                }}>
                  {/* Portion Size Dropdown */}
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                      Serving Portion
                    </label>
                    <select
                      value={stagedPortionId}
                      onChange={(e) => setStagedPortionId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '12px',
                        border: '1px solid var(--glass-border)',
                        background: '#ffffff',
                        fontSize: '0.92rem',
                        fontWeight: 500,
                        cursor: 'pointer',
                        outline: 'none',
                      }}
                    >
                      {/* Verified USDA Portions */}
                      {Array.isArray(stagedFood.portions) && stagedFood.portions.map((p) => {
                        const pid = String(p.portion_id || p.id);
                        const label = `${p.amount} ${p.modifier || p.unit || 'portion'} (${p.gram_weight}g)`;
                        return (
                          <option key={pid} value={pid}>
                            {label}
                          </option>
                        );
                      })}
                      <option value="g">Custom Grams (g)</option>
                    </select>
                  </div>

                  {/* Serving Quantity Multiplier */}
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                      {stagedPortionId === 'g' ? 'Grams' : 'Qty'}
                    </label>
                    <input
                      type="number"
                      min="0.1"
                      step="any"
                      value={stagedQuantity}
                      onChange={(e) => setStagedQuantity(e.target.value)}
                      placeholder="1"
                      style={{
                        width: '100%',
                        padding: '12px 10px',
                        borderRadius: '12px',
                        border: '1px solid var(--glass-border)',
                        background: '#ffffff',
                        fontSize: '0.95rem',
                        fontWeight: 600,
                        textAlign: 'center',
                        outline: 'none',
                      }}
                    />
                  </div>

                  {/* Calculated Gram Weight Preview */}
                  <div style={{ textAlign: 'center', padding: '0 8px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                      Calculated
                    </label>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '8px' }}>
                      {stagedGramWeight} <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>g</span>
                    </div>
                  </div>

                  {/* Add Button */}
                  <div style={{ alignSelf: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={handleAddIngredient}
                      className="btn btn-gradient"
                      style={{ padding: '12px 24px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Plus size={18} />
                      <span>Add to Meal</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Step 3: Current Meal Ingredients Breakdown List */}
          {mealIngredients.length > 0 && (
            <div className="glass-panel" style={{ padding: '26px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Utensils size={20} color="var(--accent-primary)" />
                  <span>Meal Composition ({mealIngredients.length} ingredients)</span>
                </h3>
                <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Total Weight: {mealIngredients.reduce((acc, i) => acc + (Number(i.weight_g) || 0), 0)} g
                </span>
              </div>

              {/* Ingredient Rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                {mealIngredients.map((ing) => (
                  <div
                    key={ing.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'rgba(255,255,255,0.7)',
                      padding: '14px 18px',
                      borderRadius: '12px',
                      border: '1px solid var(--glass-border)',
                      gap: '12px',
                    }}
                  >
                    <div style={{ flex: '1 1 240px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.98rem' }}>{ing.food_name}</span>
                        <span style={{
                          fontSize: '0.72rem',
                          padding: '2px 8px',
                          borderRadius: '8px',
                          background: 'rgba(16, 185, 129, 0.1)',
                          color: 'var(--accent-primary)',
                          fontWeight: 600,
                        }}>
                          {ing.food_category}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Portion: <strong>{ing.portion_description}</strong> • {ing.weight_g} grams
                      </div>
                    </div>

                    {/* Inline Quick Gram Edit */}
                    {editingIngredientId === ing.id ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input
                          type="number"
                          min="1"
                          value={editQty}
                          onChange={(e) => setEditQty(e.target.value)}
                          style={{ width: '80px', padding: '6px 8px', borderRadius: '8px', border: '1px solid var(--glass-border)', fontSize: '0.88rem' }}
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateIngredientWeight(ing.id, editQty)}
                          style={{ background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingIngredientId(null)}
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '6px' }}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button
                          type="button"
                          onClick={() => { setEditingIngredientId(ing.id); setEditQty(String(ing.weight_g)); }}
                          title="Edit quantity"
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px' }}
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveIngredient(ing.id)}
                          title="Remove ingredient"
                          style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '6px' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Step 4: Real-time Live Deterministic Totals Grid (Requirement 5) */}
              {liveTotals && liveTotals.totals && (
                <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '20px', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Deterministic Meal Totals
                    </span>
                    {isCalculating && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--accent-primary)' }}>
                        <Loader2 size={14} className="spin" /> Updating nutrients...
                      </span>
                    )}
                  </div>

                  {/* 8 Nutrients Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(105px, 1fr))', gap: '10px' }}>
                    {Object.entries(liveTotals.totals).map(([key, info]) => {
                      const isUnknown = info.amount === null;
                      const isPartial = info.is_partial;

                      return (
                        <div
                          key={key}
                          style={{
                            background: isUnknown
                              ? 'rgba(100, 116, 139, 0.08)'
                              : isPartial
                              ? 'rgba(245, 158, 11, 0.09)'
                              : 'rgba(16, 185, 129, 0.08)',
                            border: isUnknown
                              ? '1px solid rgba(100, 116, 139, 0.2)'
                              : isPartial
                              ? '1px solid rgba(245, 158, 11, 0.3)'
                              : '1px solid rgba(16, 185, 129, 0.22)',
                            borderRadius: '12px',
                            padding: '12px 10px',
                            textAlign: 'center',
                          }}
                        >
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'capitalize', fontWeight: 600 }}>
                            {key.replace('_', ' ').replace('mcg', '').replace('mg', '').replace('g', '')}
                          </div>
                          <div style={{ fontSize: '1.15rem', fontWeight: 700, margin: '4px 0', color: isUnknown ? '#64748b' : 'var(--text-main)' }}>
                            {isUnknown ? 'Unmeasured' : info.amount}
                            {!isUnknown && <span style={{ fontSize: '0.75rem', fontWeight: 400, marginLeft: '2px' }}>{info.unit}</span>}
                          </div>
                          {isPartial && (
                            <div style={{ fontSize: '0.65rem', color: '#b45309', fontWeight: 600 }}>
                              Partial
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 5: Meal Details & Save Button */}
              <div style={{
                background: 'rgba(255,255,255,0.5)',
                borderRadius: '14px',
                padding: '20px',
                border: '1px solid var(--glass-border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) 180px', gap: '14px' }}>
                  {/* Meal Name */}
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                      Meal Title (Optional)
                    </label>
                    <input
                      type="text"
                      value={mealName}
                      onChange={(e) => setMealName(e.target.value)}
                      placeholder={`e.g. Lunch with ${mealIngredients.slice(0, 2).map(i => i.food_name).join(', ')}`}
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: '10px',
                        border: '1px solid var(--glass-border)',
                        background: '#ffffff',
                        fontSize: '0.92rem',
                        outline: 'none',
                      }}
                    />
                  </div>

                  {/* Meal Type */}
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                      Meal Type
                    </label>
                    <select
                      value={mealType}
                      onChange={(e) => setMealType(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: '10px',
                        border: '1px solid var(--glass-border)',
                        background: '#ffffff',
                        fontSize: '0.92rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        outline: 'none',
                      }}
                    >
                      <option value="breakfast">Breakfast</option>
                      <option value="lunch">Lunch</option>
                      <option value="dinner">Dinner</option>
                      <option value="snack">Snack</option>
                    </select>
                  </div>
                </div>

                {/* Offline Warning Notice */}
                {!isOnline && (
                  <div style={{
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    fontSize: '0.84rem',
                    color: '#b45309',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}>
                    <WifiOff size={16} />
                    <span>Food catalog save requires an internet connection. Switch to "Describe Meal" to save offline.</span>
                  </div>
                )}

                {/* Save Meal Button */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={handleSubmitMeal}
                    disabled={isSubmitting || mealIngredients.length === 0 || !isOnline}
                    className="btn btn-gradient"
                    style={{
                      padding: '14px 36px',
                      fontSize: '1.02rem',
                      fontWeight: 600,
                      opacity: (!isOnline || mealIngredients.length === 0) ? 0.6 : 1,
                      cursor: (!isOnline || mealIngredients.length === 0) ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isSubmitting ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Loader2 size={18} className="spin" /> Recalculating & Saving...
                      </span>
                    ) : (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CheckCircle2 size={18} /> Confirm & Save Meal
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: DESCRIBE MEAL (LOCAL NLP MEAL PARSER WORKFLOW)               */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'describe' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel" style={{ padding: '32px' }}>
          
          {/* A. TEXT INPUT STAGE (When no draft is active) */}
          {!parsedDraft && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', color: 'var(--accent-primary)' }}>
                <Sparkles size={22} />
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    Describe What You Ate
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Nutriq's local natural-language food engine extracts ingredients, quantities, and preparation details without external AI APIs.
                  </p>
                </div>
              </div>

              <form onSubmit={handleParseMeal}>
                <textarea
                  value={textDescription}
                  onChange={(e) => setTextDescription(e.target.value)}
                  placeholder="e.g., I had 2 rotis, one bowl of dal and a cup of curd (or: 3 boiled eggs with 2 slices of toast and a banana)..."
                  disabled={isParsingMeal}
                  style={{
                    width: '100%',
                    minHeight: '130px',
                    background: 'rgba(255,255,255,0.7)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '16px',
                    padding: '20px',
                    color: 'var(--text-main)',
                    fontSize: '1.05rem',
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    marginBottom: '16px',
                  }}
                />

                {/* Benchmark Example Chips */}
                <div style={{ marginBottom: '22px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                    Quick Benchmark Examples:
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {[
                      'I had 2 rotis, one bowl of dal and a cup of curd.',
                      'Breakfast was 3 boiled eggs with 2 slices of toast and a banana.',
                      'I ate around 150 grams of paneer with 1 cup cooked rice.',
                      'Had a plate of chicken biryani with a glass of buttermilk.',
                      'One small bowl of moong dal, 2 chapatis and some spinach sabzi.',
                      '200g grilled chicken, 100g rice and some salad.',
                    ].map((exampleText, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setTextDescription(exampleText)}
                        style={{
                          background: 'rgba(255,255,255,0.85)',
                          border: '1px solid var(--glass-border)',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '0.78rem',
                          color: 'var(--text-main)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          textAlign: 'left',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--glass-border)'}
                      >
                        "{exampleText}"
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {!isOnline && (
                    <span style={{ fontSize: '0.82rem', color: '#d97706', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <WifiOff size={16} /> Offline: Parsing runs locally on device
                    </span>
                  )}

                  <button
                    type="submit"
                    disabled={isParsingMeal || !textDescription.trim()}
                    className="btn btn-gradient"
                    style={{ marginLeft: 'auto', padding: '12px 32px' }}
                  >
                    {isParsingMeal ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Loader2 size={18} className="spin" /> Analyzing Meal Locally...
                      </span>
                    ) : (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Sparkles size={18} /> Analyze Meal
                      </span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* B. DRAFT REVIEW & CONFIRMATION STAGE */}
          {parsedDraft && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              
              {/* Draft Header Banner */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                paddingBottom: '16px',
                borderBottom: '1px solid var(--glass-border)',
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      Meal Draft Review
                    </h3>
                    {draftClarifications.length === 0 ? (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: 'var(--accent-primary)',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                      }}>
                        <CheckCircle2 size={14} /> Ready to Log • {Math.round(parsedDraft.confidence_score * 100)}% Confidence
                      </span>
                    ) : (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        background: 'rgba(245, 158, 11, 0.18)',
                        color: '#b45309',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                      }}>
                        <HelpCircle size={14} /> {draftClarifications.length} Clarification{draftClarifications.length > 1 ? 's' : ''} Needed
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginTop: '4px', fontStyle: 'italic' }}>
                    "{parsedDraft.original_text}"
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleResetDraft}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '10px',
                    padding: '8px 14px',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    color: 'var(--text-main)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Edit3 size={15} /> Edit Description
                </button>
              </div>

              {/* Clarifications Panel (if any ambiguities or missing portions) */}
              <AnimatePresence>
                {draftClarifications.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{
                      background: 'rgba(254, 243, 199, 0.4)',
                      border: '1.5px solid rgba(245, 158, 11, 0.45)',
                      borderRadius: '16px',
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <HelpCircle size={22} color="#d97706" style={{ flexShrink: 0 }} />
                      <div>
                        <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#b45309' }}>
                          Clarification Required Before Saving
                        </h4>
                        <p style={{ fontSize: '0.82rem', color: '#92400e', marginTop: '2px' }}>
                          Please confirm the exact variety or serving quantity for the items below:
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {draftClarifications.map((clar, cIdx) => (
                        <div
                          key={clar.ingredient_id || cIdx}
                          style={{
                            background: '#ffffff',
                            borderRadius: '12px',
                            padding: '14px 18px',
                            border: '1px solid rgba(217, 119, 6, 0.25)',
                          }}
                        >
                          <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-main)', marginBottom: '8px' }}>
                            {clar.question}
                          </div>

                          {/* 1. Ambiguous food options */}
                          {clar.type === 'ambiguous_food' && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                              {clar.options.map((opt) => (
                                <button
                                  key={opt.fdc_id}
                                  type="button"
                                  onClick={() => handleResolveAmbiguity(clar, opt)}
                                  style={{
                                    padding: '8px 14px',
                                    borderRadius: '10px',
                                    background: 'rgba(16, 185, 129, 0.08)',
                                    border: '1px solid var(--accent-primary)',
                                    color: 'var(--accent-primary)',
                                    fontSize: '0.84rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'var(--accent-primary)';
                                    e.currentTarget.style.color = '#ffffff';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(16, 185, 129, 0.08)';
                                    e.currentTarget.style.color = 'var(--accent-primary)';
                                  }}
                                >
                                  <Check size={14} />
                                  <span>{opt.name}</span>
                                  <span style={{ fontSize: '0.72rem', opacity: 0.8 }}>({opt.food_category})</span>
                                </button>
                              ))}
                            </div>
                          )}

                          {/* 2. Missing portion serving buttons */}
                          {clar.type === 'missing_portion' && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Quick Portions:</span>
                              {[
                                { label: '50g', grams: 50 },
                                { label: '100g (standard)', grams: 100 },
                                { label: '150g', grams: 150 },
                                { label: '200g (large)', grams: 200 },
                                { label: '1 cup (~150g)', grams: 150 },
                              ].map((preset, pIdx) => (
                                <button
                                  key={pIdx}
                                  type="button"
                                  onClick={() => handleResolvePortion(clar, preset.grams, preset.label)}
                                  style={{
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    background: '#f8fafc',
                                    border: '1px solid #cbd5e1',
                                    color: 'var(--text-main)',
                                    fontSize: '0.82rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                  }}
                                >
                                  {preset.label}
                                </button>
                              ))}
                              
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginLeft: '6px' }}>
                                <input
                                  type="number"
                                  min="1"
                                  placeholder="Grams"
                                  value={customPortionInputs[clar.ingredient_id] || ''}
                                  onChange={(e) => setCustomPortionInputs(prev => ({ ...prev, [clar.ingredient_id]: e.target.value }))}
                                  style={{
                                    width: '80px',
                                    padding: '6px 8px',
                                    borderRadius: '8px',
                                    border: '1px solid #cbd5e1',
                                    fontSize: '0.82rem',
                                    outline: 'none',
                                    textAlign: 'center',
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const g = parseFloat(customPortionInputs[clar.ingredient_id]);
                                    if (g > 0) handleResolvePortion(clar, g, `${g}g`);
                                  }}
                                  style={{
                                    padding: '6px 10px',
                                    borderRadius: '8px',
                                    background: 'var(--accent-primary)',
                                    color: '#ffffff',
                                    border: 'none',
                                    fontSize: '0.82rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                  }}
                                >
                                  Set
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Extracted Ingredients Table */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    Parsed Ingredients ({draftIngredients.length})
                  </h4>
                  {isCalculatingDraft && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Loader2 size={14} className="spin" /> Recalculating nutrients...
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {draftIngredients.map((ing, idx) => {
                    const isConfirmed = ing.status === 'confirmed' || (ing.fdc_id && Number(ing.weight_g) > 0);
                    return (
                      <div
                        key={ing.id || idx}
                        style={{
                          background: '#ffffff',
                          border: isConfirmed ? '1px solid var(--glass-border)' : '1px solid rgba(245, 158, 11, 0.4)',
                          borderRadius: '14px',
                          padding: '14px 18px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '14px',
                          flexWrap: 'wrap',
                        }}
                      >
                        {/* Food Info */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '220px' }}>
                          {isConfirmed ? (
                            <CheckCircle2 size={20} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
                          ) : (
                            <HelpCircle size={20} color="#d97706" style={{ flexShrink: 0 }} />
                          )}
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.94rem', color: 'var(--text-main)' }}>
                              {ing.food_name}
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '3px' }}>
                              {ing.preparation && (
                                <span style={{
                                  fontSize: '0.72rem',
                                  background: 'rgba(16, 185, 129, 0.1)',
                                  color: 'var(--accent-primary)',
                                  padding: '1px 6px',
                                  borderRadius: '6px',
                                  fontWeight: 600,
                                }}>
                                  {ing.preparation}
                                </span>
                              )}
                              {ing.food_category && (
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                  {ing.food_category}
                                </span>
                              )}
                              {ing.fdc_id && (
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                  • USDA #{ing.fdc_id}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Serving Controls */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>
                            {ing.portion_description || `${ing.weight_g || 0}g`}
                          </span>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f8fafc', padding: '4px 8px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <button
                              type="button"
                              onClick={() => handleAdjustDraftQty(idx, -25)}
                              disabled={!ing.weight_g || ing.weight_g <= 10}
                              style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 700, padding: '2px 6px', color: 'var(--text-muted)' }}
                            >
                              -
                            </button>
                            <span style={{ fontWeight: 700, fontSize: '0.92rem', minWidth: '46px', textAlign: 'center' }}>
                              {ing.weight_g ? `${ing.weight_g}g` : '—'}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAdjustDraftQty(idx, 25)}
                              disabled={!ing.weight_g}
                              style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 700, padding: '2px 6px', color: 'var(--text-muted)' }}
                            >
                              +
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteDraftIngredient(idx)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#ef4444',
                              cursor: 'pointer',
                              padding: '6px',
                              borderRadius: '6px',
                            }}
                            title="Remove ingredient"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Live Nutrition Preview */}
              {draftTotals && draftTotals.totals && (
                <div style={{
                  background: 'rgba(255, 255, 255, 0.75)',
                  borderRadius: '16px',
                  padding: '20px',
                  border: '1px solid var(--glass-border)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Calculated Deterministic Nutrition (USDA)
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                      Deterministic Engine • foods.db
                    </span>
                  </div>

                  {/* 4 Macro Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '14px' }}>
                    <div style={{ background: '#ffffff', padding: '12px', borderRadius: '10px', textAlign: 'center', border: '1px solid var(--glass-border)' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>CALORIES</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                        {Math.round(draftTotals.totals.calories?.amount || 0)} <span style={{ fontSize: '0.75rem' }}>kcal</span>
                      </div>
                    </div>

                    <div style={{ background: '#ffffff', padding: '12px', borderRadius: '10px', textAlign: 'center', border: '1px solid var(--glass-border)' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>PROTEIN</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                        {Math.round((draftTotals.totals.protein_g?.amount || 0) * 10) / 10} <span style={{ fontSize: '0.75rem' }}>g</span>
                      </div>
                    </div>

                    <div style={{ background: '#ffffff', padding: '12px', borderRadius: '10px', textAlign: 'center', border: '1px solid var(--glass-border)' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>CARBS</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                        {Math.round((draftTotals.totals.carbs_g?.amount || 0) * 10) / 10} <span style={{ fontSize: '0.75rem' }}>g</span>
                      </div>
                    </div>

                    <div style={{ background: '#ffffff', padding: '12px', borderRadius: '10px', textAlign: 'center', border: '1px solid var(--glass-border)' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>FAT</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                        {Math.round((draftTotals.totals.fat_g?.amount || 0) * 10) / 10} <span style={{ fontSize: '0.75rem' }}>g</span>
                      </div>
                    </div>
                  </div>

                  {/* 4 Tracked Micronutrients */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                    <div style={{ background: 'rgba(255,255,255,0.6)', padding: '8px 12px', borderRadius: '8px', fontSize: '0.82rem', textAlign: 'center' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Vit D: </span>
                      <strong>{draftTotals.totals.vitamin_d_mcg?.amount !== null ? `${Math.round((draftTotals.totals.vitamin_d_mcg.amount) * 10) / 10} mcg` : '—'}</strong>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.6)', padding: '8px 12px', borderRadius: '8px', fontSize: '0.82rem', textAlign: 'center' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Iron: </span>
                      <strong>{draftTotals.totals.iron_mg?.amount !== null ? `${Math.round((draftTotals.totals.iron_mg.amount) * 10) / 10} mg` : '—'}</strong>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.6)', padding: '8px 12px', borderRadius: '8px', fontSize: '0.82rem', textAlign: 'center' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Zinc: </span>
                      <strong>{draftTotals.totals.zinc_mg?.amount !== null ? `${Math.round((draftTotals.totals.zinc_mg.amount) * 10) / 10} mg` : '—'}</strong>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.6)', padding: '8px 12px', borderRadius: '8px', fontSize: '0.82rem', textAlign: 'center' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Vit B12: </span>
                      <strong>{draftTotals.totals.b12_mcg?.amount !== null ? `${Math.round((draftTotals.totals.b12_mcg.amount) * 10) / 10} mcg` : '—'}</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Meal Type & Confirmation Action */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '14px',
                paddingTop: '12px',
                borderTop: '1px solid var(--glass-border)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <label style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    Meal Type:
                  </label>
                  <select
                    value={mealType}
                    onChange={(e) => setMealType(e.target.value)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '10px',
                      border: '1px solid var(--glass-border)',
                      background: '#ffffff',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="dinner">Dinner</option>
                    <option value="snack">Snack</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={handleResetDraft}
                    className="btn btn-outline"
                    style={{ padding: '12px 22px', fontSize: '0.94rem' }}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveDraftMeal}
                    disabled={isSubmitting || draftClarifications.length > 0 || draftIngredients.filter(i => i.fdc_id && Number(i.weight_g) > 0).length === 0}
                    className="btn btn-gradient"
                    style={{
                      padding: '12px 32px',
                      fontSize: '0.98rem',
                      fontWeight: 600,
                      opacity: (draftClarifications.length > 0 || draftIngredients.filter(i => i.fdc_id && Number(i.weight_g) > 0).length === 0) ? 0.6 : 1,
                      cursor: (draftClarifications.length > 0 || draftIngredients.filter(i => i.fdc_id && Number(i.weight_g) > 0).length === 0) ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isSubmitting ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Loader2 size={18} className="spin" /> Saving Meal...
                      </span>
                    ) : (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CheckCircle2 size={18} /> Confirm & Save Meal
                      </span>
                    )}
                  </button>
                </div>
              </div>

            </div>
          )}

        </motion.div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 3: UPLOAD FOOD PHOTO (GEMINI VISION WORKFLOW)                   */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'photo' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', color: 'var(--accent-primary)' }}>
            <Camera size={22} />
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Upload Food Photo
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Gemini Vision AI inspects your meal photo to estimate food components and portion weights.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmitMeal}>
            {/* Dropzone */}
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed var(--glass-border)',
                padding: '32px 20px',
                borderRadius: '16px',
                textAlign: 'center',
                cursor: 'pointer',
                background: 'rgba(255,255,255,0.4)',
                marginBottom: '20px',
                position: 'relative',
              }}
            >
              {previewUrl ? (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <img
                    src={previewUrl}
                    alt="Food preview"
                    style={{ maxHeight: '220px', borderRadius: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                      setPreviewUrl(null);
                    }}
                    style={{
                      position: 'absolute',
                      top: -10,
                      right: -10,
                      background: '#ef4444',
                      color: '#ffffff',
                      borderRadius: '50%',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '6px',
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div>
                  <Upload size={44} color="var(--accent-primary)" style={{ margin: '0 auto 10px' }} />
                  <p style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '4px' }}>
                    Drag & drop your food photo here or click to browse
                  </p>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    JPEG, PNG, WebP up to 10MB
                  </span>
                </div>
              )}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                style={{ display: 'none' }}
              />
            </div>

            {/* Optional Photo Caption */}
            <input
              type="text"
              value={photoCaption}
              onChange={(e) => setPhotoCaption(e.target.value)}
              placeholder="Optional notes (e.g. homemade chicken curry with brown rice)..."
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '12px',
                border: '1px solid var(--glass-border)',
                background: 'rgba(255,255,255,0.7)',
                fontSize: '0.95rem',
                outline: 'none',
                marginBottom: '20px',
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                disabled={isSubmitting || !selectedFile}
                className="btn btn-gradient"
                style={{ padding: '12px 32px' }}
              >
                {isSubmitting ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Loader2 size={18} className="spin" /> Analyzing Photo with Vision AI...
                  </span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Camera size={18} /> Analyze with Vision AI
                  </span>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SUCCESS CONFIRMATION MODAL / PANEL                                  */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {successData && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass-panel"
            style={{
              padding: '32px',
              border: successData.isOffline
                ? '1.5px solid rgba(245, 158, 11, 0.4)'
                : '1.5px solid rgba(16, 185, 129, 0.35)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
              {successData.isOffline ? (
                <WifiOff color="#d97706" size={32} />
              ) : (
                <CheckCircle2 color="var(--accent-primary)" size={32} />
              )}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h2 className="heading-font" style={{ fontSize: '1.5rem', color: successData.isOffline ? '#d97706' : 'var(--accent-primary)' }}>
                    {successData.isOffline ? 'Meal Queued Offline' : 'Meal Successfully Saved!'}
                  </h2>
                  <span style={{
                    fontSize: '0.72rem',
                    padding: '3px 8px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    background: (successData.engine === 'local_usda' || successData.engine === 'local_nlp') ? 'rgba(16,185,129,0.15)' : 'rgba(0,0,0,0.06)',
                    color: (successData.engine === 'local_usda' || successData.engine === 'local_nlp') ? 'var(--accent-primary)' : 'var(--text-muted)',
                  }}>
                    {successData.engine === 'local_usda' ? 'USDA DETERMINISTIC' : (successData.engine === 'local_nlp' ? 'LOCAL NLP ENGINE' : 'GEMINI VISION')}
                  </span>
                </div>
                <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {successData.meal?.description || 'Your meal has been recorded.'}
                </p>
              </div>
            </div>

            {/* Ingredients breakdown if catalog meal */}
            {successData.meal?.ingredients && successData.meal.ingredients.length > 0 && (
              <div style={{ background: 'rgba(255,255,255,0.6)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                  Verified Ingredients Included:
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {successData.meal.ingredients.map((ing, idx) => (
                    <span
                      key={ing.id || idx}
                      style={{
                        background: '#ffffff',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontWeight: 500,
                        border: '1px solid var(--glass-border)',
                      }}
                    >
                      {ing.food_name} ({ing.portion_description || `${ing.quantity_g}g`})
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Nutrition metrics grid */}
            {successData.meal?.nutrition && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '10px', marginBottom: '24px' }}>
                {[
                  { label: 'Calories', val: `${Math.round(successData.meal.nutrition.calories || 0)} kcal` },
                  { label: 'Protein', val: `${successData.meal.nutrition.protein_g || 0} g` },
                  { label: 'Carbs', val: `${successData.meal.nutrition.carbs_g || 0} g` },
                  { label: 'Fat', val: `${successData.meal.nutrition.fat_g || 0} g` },
                  { label: 'Vit D', val: `${successData.meal.nutrition.vitamin_d_mcg || 0} mcg` },
                  { label: 'Iron', val: `${successData.meal.nutrition.iron_mg || 0} mg` },
                  { label: 'Zinc', val: `${successData.meal.nutrition.zinc_mg || 0} mg` },
                  { label: 'B12', val: `${successData.meal.nutrition.b12_mcg || 0} mcg` },
                ].map((item, idx) => (
                  <div key={idx} style={{ background: 'rgba(255,255,255,0.7)', padding: '12px', borderRadius: '10px', textAlign: 'center', border: '1px solid var(--glass-border)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{item.label}</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, marginTop: '2px' }}>{item.val}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Navigation Buttons */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setSuccessData(null)}
                className="btn btn-outline"
                style={{ padding: '10px 20px', fontSize: '0.92rem' }}
              >
                Log Another Meal
              </button>
              <Link
                to="/app/history"
                className="btn btn-gradient"
                style={{ textDecoration: 'none', padding: '10px 24px', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <span>View Meal History</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default MealLog;
