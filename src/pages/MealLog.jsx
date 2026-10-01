import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Send, Loader2, CheckCircle2, X, Upload, AlertCircle, WifiOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSync } from '../hooks/useSync';

const MealLog = () => {
  const [mealText, setMealText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successData, setSuccessData] = useState(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const { session } = useAuth();
  const { isOnline, logMealOffline } = useSync();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
      setErrorMessage('');
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
    }
  };

  const handleLogMeal = async (e) => {
    e.preventDefault();
    if (!mealText && !selectedFile) return;

    setIsSubmitting(true);
    setErrorMessage('');

    // If device is offline and user entered text, queue meal offline immediately
    if ((!isOnline || !navigator.onLine) && mealText && !selectedFile) {
      try {
        const { localMeal } = logMealOffline(mealText);
        setSuccessData({
          text: mealText,
          payload: {
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
        });
        setMealText('');
      } catch (err) {
        setErrorMessage('Failed to queue offline meal: ' + err.message);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    try {
      const apiURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      
      const formData = new FormData();
      formData.append('description', mealText);
      if (selectedFile) formData.append('image', selectedFile);

      const endpoint = selectedFile ? `${apiURL}/api/meals/image` : `${apiURL}/api/meals`;

      const headers = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      if (!selectedFile) {
        headers['Content-Type'] = 'application/json';
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        body: selectedFile ? formData : JSON.stringify({ description: mealText }),
        headers,
      });
      
      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        throw new Error(errJson?.error || `Server returned error (${response.status})`);
      }
      
      const data = await response.json();
      
      setSuccessData({ text: mealText || 'Image uploaded', payload: data.data, isOffline: false });
      setMealText('');
      setSelectedFile(null);
      setPreview(null);
    } catch (err) {
      console.warn("API request failed:", err.message);
      // If network error occurred and it's a text meal, fallback to offline queue
      if (!selectedFile && mealText && (err.name === 'TypeError' || err.message.includes('fetch') || err.message.includes('network'))) {
        try {
          const { localMeal } = logMealOffline(mealText);
          setSuccessData({
            text: mealText,
            payload: {
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
          });
          setMealText('');
          return;
        } catch (queueErr) {
          setErrorMessage('Could not save meal offline: ' + queueErr.message);
        }
      }
      setErrorMessage(err.message || 'Failed to process meal. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div style={{ marginBottom: '16px' }}>
        <h1 className="heading-font" style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Log Your Meal</h1>
        <p style={{ color: 'var(--text-muted)' }}>Describe your meal or upload a photo. Server-side AI will extract all micros.</p>
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

      <motion.div className="glass-panel" style={{ padding: '32px', position: 'relative' }}>
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
                   <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                     <Loader2 size={18} />
                   </motion.div>
                   Analyzing with Gemini...
                 </span>
               ) : (
                 <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                   <Send size={18} /> Process Meal
                 </span>
               )}
             </button>
          </div>
        </form>
      </motion.div>

      <AnimatePresence>
        {successData && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-panel" style={{ padding: '32px', border: successData.isOffline ? '1px solid rgba(234, 88, 12, 0.4)' : '1px solid rgba(42, 140, 110, 0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              {successData.isOffline ? (
                <WifiOff color="#ea580c" size={28} />
              ) : (
                <CheckCircle2 color="var(--accent-primary)" size={28} />
              )}
              <div>
                <h2 className="heading-font" style={{ fontSize: '1.5rem', color: successData.isOffline ? '#ea580c' : 'var(--accent-primary)' }}>
                  {successData.isOffline ? 'Saved Offline (Queued for Sync)' : 'Successfully Logged to Supabase'}
                </h2>
                {successData.isOffline && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Nutritional estimates calculated locally. This meal will automatically synchronize with your cloud account once your connection returns.
                  </p>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '32px' }}>
               {Object.entries(successData.payload).map(([k, v]) => (
                  <div key={k} style={{ background: successData.isOffline ? 'rgba(234, 88, 12, 0.08)' : 'rgba(42,140,110,0.10)', padding: '12px 16px', borderRadius: '12px', flex: '1 1 120px' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>{k.replace('_', ' ')}</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>{v}</div>
                  </div>
               ))}
            </div>
            <button onClick={() => navigate('/app/dashboard')} className="btn btn-outline" style={{ width: '100%' }}>Return to Dashboard</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MealLog;
