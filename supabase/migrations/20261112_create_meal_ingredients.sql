-- ==============================================================================
-- Nutriq: Supabase Migration - Meal Ingredients Table for Local Nutrition Engine
-- ==============================================================================

-- 1. Ensure pgcrypto / uuid-ossp are enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Optional meal_type support on meals table
ALTER TABLE public.meals ADD COLUMN IF NOT EXISTS meal_type TEXT DEFAULT 'meal';

-- 3. Create meal_ingredients table
CREATE TABLE IF NOT EXISTS public.meal_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id UUID NOT NULL REFERENCES public.meals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fdc_id INT NOT NULL,
  food_name TEXT NOT NULL,
  quantity_g NUMERIC(8,2) NOT NULL CHECK (quantity_g > 0),
  portion_description TEXT,
  nutrient_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. High-Performance Indexes
CREATE INDEX IF NOT EXISTS idx_meal_ingredients_meal_id ON public.meal_ingredients(meal_id);
CREATE INDEX IF NOT EXISTS idx_meal_ingredients_user_id ON public.meal_ingredients(user_id);
CREATE INDEX IF NOT EXISTS idx_meal_ingredients_fdc_id ON public.meal_ingredients(fdc_id);
CREATE INDEX IF NOT EXISTS idx_meal_ingredients_user_meal ON public.meal_ingredients(user_id, meal_id);

-- 5. Row Level Security (RLS)
ALTER TABLE public.meal_ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own meal ingredients"
  ON public.meal_ingredients FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own meal ingredients"
  ON public.meal_ingredients FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meal ingredients"
  ON public.meal_ingredients FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own meal ingredients"
  ON public.meal_ingredients FOR DELETE
  USING (auth.uid() = user_id);

