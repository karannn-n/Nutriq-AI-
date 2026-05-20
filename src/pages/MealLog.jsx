import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Send, Loader2, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MealLog = () => {
  const [mealText, setMealText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const navigate = useNavigate();

  const handleLogMeal = async (e) => {
    e.preventDefault();
    if (!mealText) return;

    setIsSubmitting(true);
    try {
      const apiURL = import.meta.env.VITE_API_URL;
      if (!apiURL) throw new Error("VITE_API_URL environment variable is not defined");
      const response = await fetch(`${apiURL}/api/meals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: mealText })
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      
      setSuccessData({ text: mealText, payload: data.data });
      setMealText('');
    } catch (err) {
      console.warn("API Offline, logging meal to local storage database:", err.message);
      // Simulate delay for ultra-realistic response feel
      await new Promise(r => setTimeout(r, 800));
      try {
        const { addOfflineMeal } = await import('../utils/offlineDb');
        const newMeal = addOfflineMeal(mealText);
        // Exclude unneeded fields for visualizer
        const { id, description, created_at, ...payload } = newMeal;
        setSuccessData({ text: mealText, payload });
        setMealText('');
      } catch (localErr) {
        console.error("Local storage log failed:", localErr);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      <div style={{ marginBottom: '16px' }}>
        <h1 className="heading-font" style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Log Your Meal</h1>
        <p style={{ color: 'var(--text-muted)' }}>Describe what you ate or drank. Intelligence will handle the micros.</p>
      </div>

      <motion.div className="glass-panel" style={{ padding: '32px', position: 'relative' }}>
        <form onSubmit={handleLogMeal} style={{ position: 'relative' }}>
          <textarea
            value={mealText}
            onChange={(e) => setMealText(e.target.value)}
            placeholder="I just had a grilled chicken salad with olive oil and a glass of milk..."
            disabled={isSubmitting}
            style={{
              width: '100%', minHeight: '150px', background: 'rgba(255,255,255,0.65)',
              border: '1px solid var(--glass-border)', borderRadius: '16px',
              padding: '24px', color: 'var(--text-main)', fontSize: '1.1rem',
              outline: 'none', resize: 'vertical', transition: 'border-color 0.2s',
              fontFamily: 'inherit'
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--accent-primary)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'}
          />
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px' }}>
             <button type="button" className="btn btn-outline" style={{ padding: '12px 24px', color: 'var(--text-muted)' }}>
               <Camera size={20} /> Upload Image
             </button>

             <button type="submit" disabled={isSubmitting || !mealText} className="btn btn-gradient" style={{ padding: '12px 32px' }}>
               {isSubmitting ? <><Loader2 className="spinner" size={20} /> AI Analyzing...</> : <><Send size={20} /> Process Meal</>}
             </button>
          </div>
        </form>
      </motion.div>
      
      <style>{`.spinner { animation: spin 1s linear infinite; } @keyframes spin { 100% { transform: rotate(360deg); } }`}</style>

      {/* Success Payload Visualizer */}
      <AnimatePresence>
        {successData && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
            className="glass-panel" style={{ padding: '32px', border: '1px solid rgba(16, 185, 129, 0.3)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <CheckCircle2 color="var(--accent-primary)" size={28} />
              <h2 className="heading-font" style={{ fontSize: '1.5rem', color: 'var(--accent-primary)' }}>Successfully Logged</h2>
            </div>
            
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontStyle: 'italic' }}>
              "{successData.text}"
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '32px' }}>
               {Object.entries(successData.payload).map(([k, v]) => (
                  <div key={k} style={{ background: 'rgba(42,140,110,0.10)', padding: '12px 16px', borderRadius: '12px', flex: '1 1 120px' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>{k.replace('_', ' ')}</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>{v}</div>
                  </div>
               ))}
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

export default MealLog;

