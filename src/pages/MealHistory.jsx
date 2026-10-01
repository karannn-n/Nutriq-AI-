import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Calendar, Edit3, Trash2, Eye, X, ChevronLeft, ChevronRight,
  Plus, Loader2, AlertCircle, Utensils, Check, RotateCcw
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getOfflineMeals } from '../utils/offlineDb';
import { getPendingItems } from '../utils/offlineSync';

const RDI = {
  vitamin_d_mcg: 15,
  iron_mg: 12,
  zinc_mg: 8,
  b12_mcg: 2.4,
};

const MealHistory = () => {
  const { session, user } = useAuth();
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Pagination State
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  // Modal States
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [editingMeal, setEditingMeal] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');

  const fetchMeals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const apiURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const params = new URLSearchParams({
        page: String(page),
        limit: '10',
      });
      if (search.trim()) params.append('search', search.trim());
      if (startDate) params.append('startDate', new Date(startDate).toISOString());
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        params.append('endDate', end.toISOString());
      }

      const headers = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`${apiURL}/api/meals?${params.toString()}`, { headers });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();

      setMeals(data.meals || []);
      setPagination(data.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
      setError(null);
    } catch (err) {
      console.warn('Error fetching meal history:', err.message);
      if (!navigator.onLine || err.message.includes('fetch') || err.message.includes('Failed to fetch')) {
        const offlineMeals = getOfflineMeals();
        const pending = getPendingItems(user?.id);
        const mappedOffline = offlineMeals.map(m => ({
          ...m,
          isPendingSync: pending.some(p => p.description === m.description),
          nutrition: {
            calories: m.calories,
            protein_g: m.protein_g,
            carbs_g: m.carbs_g,
            fat_g: m.fat_g,
            vitamin_d_mcg: m.vitamin_d_mcg,
            iron_mg: m.iron_mg,
            zinc_mg: m.zinc_mg,
            b12_mcg: m.b12_mcg,
          },
        }));
        setMeals(mappedOffline);
        setPagination({ page: 1, limit: 10, total: mappedOffline.length, totalPages: 1 });
        setError(null);
      } else {
        setError(err.message || 'Failed to load meal history.');
      }
    } finally {
      setLoading(false);
    }
  }, [page, search, startDate, endDate, session, user]);

  useEffect(() => {
    fetchMeals();
  }, [fetchMeals]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchMeals();
  };

  const handleClearFilters = () => {
    setSearch('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  // Open Edit Modal
  const startEdit = (meal) => {
    setEditingMeal(meal);
    const nut = meal.nutrition || {};
    setEditForm({
      description: meal.description || '',
      calories: nut.calories ?? 0,
      protein_g: nut.protein_g ?? 0,
      carbs_g: nut.carbs_g ?? 0,
      fat_g: nut.fat_g ?? 0,
      vitamin_d_mcg: nut.vitamin_d_mcg ?? 0,
      iron_mg: nut.iron_mg ?? 0,
      zinc_mg: nut.zinc_mg ?? 0,
      b12_mcg: nut.b12_mcg ?? 0,
    });
  };

  // Save Edit
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingMeal) return;

    setIsUpdating(true);
    try {
      const apiURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const headers = {
        'Content-Type': 'application/json',
      };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`${apiURL}/api/meals/${editingMeal.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(editForm),
      });

      if (!response.ok) throw new Error('Failed to update meal record.');
      const result = await response.json();

      // Update local state
      setMeals((prev) => prev.map((m) => (m.id === editingMeal.id ? result.meal : m)));
      setEditingMeal(null);
      setActionSuccess('Meal updated successfully.');
      setTimeout(() => setActionSuccess(''), 3000);
    } catch (err) {
      alert(`Could not save changes: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // Delete Meal
  const handleDeleteMeal = async (mealId) => {
    if (!window.confirm('Are you sure you want to permanently delete this meal log?')) {
      return;
    }

    try {
      const apiURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const headers = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`${apiURL}/api/meals/${mealId}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) throw new Error('Failed to delete meal.');

      setMeals((prev) => prev.filter((m) => m.id !== mealId));
      if (selectedMeal?.id === mealId) setSelectedMeal(null);
      setActionSuccess('Meal deleted.');
      setTimeout(() => setActionSuccess(''), 3000);
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="heading-font" style={{ fontSize: '2.2rem', marginBottom: '6px' }}>Meal History & Logs</h1>
          <p style={{ color: 'var(--text-muted)' }}>Search, inspect, and manage your complete dietary archive.</p>
        </div>
        <Link to="/app/meal-log" className="btn btn-gradient" style={{ border: 'none', padding: '12px 24px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={18} /> Log New Meal
        </Link>
      </div>

      {/* Success Notification Banner */}
      <AnimatePresence>
        {actionSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              background: 'rgba(42, 140, 110, 0.15)',
              border: '1px solid rgba(42, 140, 110, 0.4)',
              color: 'var(--accent-primary)',
              borderRadius: '12px',
              padding: '12px 20px',
              display: 'flex', alignItems: 'center', gap: '10px',
              fontWeight: 500,
            }}
          >
            <Check size={18} />
            <span>{actionSuccess}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters Bar */}
      <div className="glass-panel" style={{ padding: '20px', borderRadius: '16px' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center' }}>
          
          {/* Search Input */}
          <div style={{ position: 'relative', flex: '1 1 240px' }}>
            <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search meals by food name..."
              style={{
                width: '100%', padding: '10px 14px 10px 42px',
                borderRadius: '10px', background: 'rgba(255,255,255,0.6)',
                border: '1px solid var(--glass-border)', color: 'var(--text-main)',
                outline: 'none', fontSize: '0.92rem',
              }}
            />
          </div>

          {/* Start Date */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '0 1 180px' }}>
            <Calendar size={18} color="var(--text-muted)" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              title="Start Date"
              style={{
                width: '100%', padding: '9px 12px',
                borderRadius: '10px', background: 'rgba(255,255,255,0.6)',
                border: '1px solid var(--glass-border)', color: 'var(--text-main)',
                outline: 'none', fontSize: '0.88rem',
              }}
            />
          </div>

          {/* End Date */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '0 1 180px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              title="End Date"
              style={{
                width: '100%', padding: '9px 12px',
                borderRadius: '10px', background: 'rgba(255,255,255,0.6)',
                border: '1px solid var(--glass-border)', color: 'var(--text-main)',
                outline: 'none', fontSize: '0.88rem',
              }}
            />
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
            <button type="submit" className="btn btn-gradient" style={{ padding: '9px 20px', fontSize: '0.9rem', border: 'none' }}>
              Filter
            </button>
            {(search || startDate || endDate) && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="btn btn-outline"
                style={{ padding: '9px 14px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                title="Reset filters"
              >
                <RotateCcw size={16} /> Reset
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Main Meals Content */}
      {loading ? (
        <div style={{ minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
            <Loader2 size={40} color="var(--accent-primary)" />
          </motion.div>
        </div>
      ) : error ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>
          <AlertCircle size={40} style={{ margin: '0 auto 12px' }} />
          <p>{error}</p>
          <button onClick={fetchMeals} className="btn btn-outline" style={{ marginTop: '16px' }}>Retry</button>
        </div>
      ) : meals.length === 0 ? (
        <div className="glass-panel" style={{ padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(42, 140, 110, 0.12)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <Utensils size={32} />
          </div>
          <h3 className="heading-font" style={{ fontSize: '1.4rem', marginBottom: '8px' }}>No meals found</h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto 24px', fontSize: '0.92rem' }}>
            {search || startDate || endDate
              ? 'No meals matched your search filters. Try widening your date range or clearing your query.'
              : 'You have not logged any meals yet. Describe your food or upload a photo to start tracking.'}
          </p>
          <Link to="/app/meal-log" className="btn btn-gradient" style={{ textDecoration: 'none', padding: '12px 28px' }}>
            Log Meal Now
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {meals.map((meal) => {
            const nut = meal.nutrition || {};
            const timeStr = new Date(meal.logged_at || meal.created_at).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            });

            return (
              <motion.div
                key={meal.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel"
                style={{
                  padding: '20px 24px',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '16px',
                  transition: 'transform 0.2s',
                }}
              >
                {/* Left Description & Time */}
                <div style={{ flex: '1 1 280px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-main)' }}>{meal.description}</span>
                    {meal.isPendingSync && (
                      <span style={{ padding: '2px 8px', borderRadius: '12px', background: 'rgba(234, 88, 12, 0.15)', color: '#ea580c', fontSize: '0.72rem', fontWeight: 600 }}>
                        Pending Cloud Sync
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{timeStr}</div>
                </div>

                {/* Center Quick Nutrient Chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
                  <span style={{ padding: '5px 12px', borderRadius: '8px', background: 'rgba(42,140,110,0.12)', color: 'var(--accent-primary)', fontWeight: 600, fontSize: '0.85rem' }}>
                    {Math.round(nut.calories || 0)} kcal
                  </span>
                  <span style={{ padding: '5px 10px', borderRadius: '8px', background: 'rgba(0,0,0,0.06)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    P: {nut.protein_g || 0}g
                  </span>
                  <span style={{ padding: '5px 10px', borderRadius: '8px', background: 'rgba(0,0,0,0.06)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    C: {nut.carbs_g || 0}g
                  </span>
                  <span style={{ padding: '5px 10px', borderRadius: '8px', background: 'rgba(0,0,0,0.06)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    F: {nut.fat_g || 0}g
                  </span>
                  <span style={{ padding: '5px 10px', borderRadius: '8px', background: 'rgba(232, 200, 106, 0.15)', color: '#b45309', fontSize: '0.8rem', fontWeight: 500 }}>
                    Vit D: {nut.vitamin_d_mcg || 0} mcg
                  </span>
                </div>

                {/* Right Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => setSelectedMeal(meal)}
                    title="View Full Breakdown"
                    style={{
                      background: 'rgba(42,140,110,0.1)', border: 'none', borderRadius: '8px',
                      padding: '8px', color: 'var(--accent-primary)', cursor: 'pointer',
                    }}
                  >
                    <Eye size={18} />
                  </button>
                  <button
                    onClick={() => startEdit(meal)}
                    title="Edit Meal"
                    style={{
                      background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: '8px',
                      padding: '8px', color: 'var(--text-main)', cursor: 'pointer',
                    }}
                  >
                    <Edit3 size={18} />
                  </button>
                  <button
                    onClick={() => handleDeleteMeal(meal.id)}
                    title="Delete Log"
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)', border: 'none', borderRadius: '8px',
                      padding: '8px', color: '#ef4444', cursor: 'pointer',
                    }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </motion.div>
            );
          })}

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '20px' }}>
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="btn btn-outline"
                style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px', opacity: page <= 1 ? 0.5 : 1 }}
              >
                <ChevronLeft size={16} /> Previous
              </button>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                Page <strong>{page}</strong> of <strong>{pagination.totalPages}</strong> ({pagination.total} meals)
              </span>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                className="btn btn-outline"
                style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px', opacity: page >= pagination.totalPages ? 0.5 : 1 }}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── Detail Modal ─── */}
      <AnimatePresence>
        {selectedMeal && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 999,
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
          }} onClick={() => setSelectedMeal(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-panel"
              style={{ maxWidth: '580px', width: '100%', padding: '32px', borderRadius: '24px', maxHeight: '90vh', overflowY: 'auto' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                  <h2 className="heading-font" style={{ fontSize: '1.6rem', marginBottom: '4px' }}>{selectedMeal.description}</h2>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Logged on {new Date(selectedMeal.logged_at || selectedMeal.created_at).toLocaleString()}
                  </span>
                </div>
                <button onClick={() => setSelectedMeal(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  <X size={22} />
                </button>
              </div>

              {/* Nutrition Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                {[
                  { label: 'Calories', val: `${selectedMeal.nutrition?.calories || 0} kcal`, color: 'var(--accent-primary)' },
                  { label: 'Protein', val: `${selectedMeal.nutrition?.protein_g || 0} g`, color: 'var(--accent-secondary)' },
                  { label: 'Carbs', val: `${selectedMeal.nutrition?.carbs_g || 0} g`, color: '#6366f1' },
                  { label: 'Fat', val: `${selectedMeal.nutrition?.fat_g || 0} g`, color: '#ec4899' },
                  { label: 'Vitamin D', val: `${selectedMeal.nutrition?.vitamin_d_mcg || 0} mcg`, color: '#f59e0b' },
                  { label: 'Iron', val: `${selectedMeal.nutrition?.iron_mg || 0} mg`, color: '#10b981' },
                  { label: 'Zinc', val: `${selectedMeal.nutrition?.zinc_mg || 0} mg`, color: '#3b82f6' },
                  { label: 'Vitamin B12', val: `${selectedMeal.nutrition?.b12_mcg || 0} mcg`, color: '#8b5cf6' },
                ].map((item, i) => (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.65)', padding: '14px', borderRadius: '12px', border: '1px solid var(--glass-border)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>{item.label}</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: item.color }}>{item.val}</div>
                  </div>
                ))}
              </div>

              {/* RDI Benchmarks comparison */}
              <div style={{ background: 'rgba(42,140,110,0.08)', borderRadius: '14px', padding: '16px', marginBottom: '24px' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '8px', color: 'var(--accent-primary)' }}>Recommended Daily Intake (RDI) Contribution</h4>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div>Vitamin D: {Math.round(((selectedMeal.nutrition?.vitamin_d_mcg || 0) / RDI.vitamin_d_mcg) * 100)}% of daily target ({RDI.vitamin_d_mcg} mcg)</div>
                  <div>Iron: {Math.round(((selectedMeal.nutrition?.iron_mg || 0) / RDI.iron_mg) * 100)}% of daily target ({RDI.iron_mg} mg)</div>
                  <div>Zinc: {Math.round(((selectedMeal.nutrition?.zinc_mg || 0) / RDI.zinc_mg) * 100)}% of daily target ({RDI.zinc_mg} mg)</div>
                  <div>Vitamin B12: {Math.round(((selectedMeal.nutrition?.b12_mcg || 0) / RDI.b12_mcg) * 100)}% of daily target ({RDI.b12_mcg} mcg)</div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button onClick={() => { setSelectedMeal(null); startEdit(selectedMeal); }} className="btn btn-outline" style={{ padding: '10px 20px' }}>
                  Edit Values
                </button>
                <button onClick={() => setSelectedMeal(null)} className="btn btn-gradient" style={{ padding: '10px 24px', border: 'none' }}>
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Edit Modal ─── */}
      <AnimatePresence>
        {editingMeal && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 999,
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
          }} onClick={() => setEditingMeal(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-panel"
              style={{ maxWidth: '600px', width: '100%', padding: '32px', borderRadius: '24px', maxHeight: '90vh', overflowY: 'auto' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 className="heading-font" style={{ fontSize: '1.5rem' }}>Edit Meal Record</h2>
                <button onClick={() => setEditingMeal(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  <X size={22} />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>Description</label>
                  <input
                    type="text"
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    required
                    style={{
                      width: '100%', padding: '12px 14px', borderRadius: '10px',
                      background: 'rgba(255,255,255,0.7)', border: '1px solid var(--glass-border)',
                      fontSize: '0.95rem', color: 'var(--text-main)', outline: 'none'
                    }}
                  />
                </div>

                {/* Macronutrient Fields */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Calories (kcal)</label>
                    <input
                      type="number" min="0" step="1"
                      value={editForm.calories}
                      onChange={(e) => setEditForm({ ...editForm, calories: e.target.value })}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.7)', border: '1px solid var(--glass-border)', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Protein (g)</label>
                    <input
                      type="number" min="0" step="0.1"
                      value={editForm.protein_g}
                      onChange={(e) => setEditForm({ ...editForm, protein_g: e.target.value })}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.7)', border: '1px solid var(--glass-border)', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Carbs (g)</label>
                    <input
                      type="number" min="0" step="0.1"
                      value={editForm.carbs_g}
                      onChange={(e) => setEditForm({ ...editForm, carbs_g: e.target.value })}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.7)', border: '1px solid var(--glass-border)', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Fat (g)</label>
                    <input
                      type="number" min="0" step="0.1"
                      value={editForm.fat_g}
                      onChange={(e) => setEditForm({ ...editForm, fat_g: e.target.value })}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.7)', border: '1px solid var(--glass-border)', outline: 'none' }}
                    />
                  </div>
                </div>

                {/* Micronutrient Fields */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Vit D (mcg)</label>
                    <input
                      type="number" min="0" step="0.1"
                      value={editForm.vitamin_d_mcg}
                      onChange={(e) => setEditForm({ ...editForm, vitamin_d_mcg: e.target.value })}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.7)', border: '1px solid var(--glass-border)', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Iron (mg)</label>
                    <input
                      type="number" min="0" step="0.1"
                      value={editForm.iron_mg}
                      onChange={(e) => setEditForm({ ...editForm, iron_mg: e.target.value })}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.7)', border: '1px solid var(--glass-border)', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Zinc (mg)</label>
                    <input
                      type="number" min="0" step="0.1"
                      value={editForm.zinc_mg}
                      onChange={(e) => setEditForm({ ...editForm, zinc_mg: e.target.value })}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.7)', border: '1px solid var(--glass-border)', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>B12 (mcg)</label>
                    <input
                      type="number" min="0" step="0.01"
                      value={editForm.b12_mcg}
                      onChange={(e) => setEditForm({ ...editForm, b12_mcg: e.target.value })}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.7)', border: '1px solid var(--glass-border)', outline: 'none' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                  <button type="button" onClick={() => setEditingMeal(null)} className="btn btn-outline" style={{ padding: '10px 20px' }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={isUpdating} className="btn btn-gradient" style={{ padding: '10px 24px', border: 'none' }}>
                    {isUpdating ? 'Saving...' : 'Save Updates'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default MealHistory;
