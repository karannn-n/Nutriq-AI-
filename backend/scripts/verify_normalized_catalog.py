import csv
import json
import os
import sqlite3

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data"))
RAW_DIR = r"C:\Users\kc701\Desktop\Projects, Bots and ZIPs\FoodData_Central_csv_2026-10-29\FoodData_Central_csv_2026-10-29"

def verify():
    print("="*70)
    print("VERIFICATION OF NORMALIZED FOOD CATALOG & SQLITE DATABASE")
    print("="*70)
    
    db_path = os.path.join(DATA_DIR, "indexes", "foods.db")
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    
    # 1. Table Counts
    cur.execute("SELECT COUNT(*) FROM foods;")
    food_count = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM food_portions;")
    portion_count = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM food_aliases;")
    alias_count = cur.fetchone()[0]
    
    print(f"1. Database Row Counts:")
    print(f"   - foods: {food_count:,}")
    print(f"   - food_portions: {portion_count:,}")
    print(f"   - food_aliases: {alias_count:,}")
    assert food_count == 13723, f"Expected 13723 foods, got {food_count}"
    assert portion_count == 36681, f"Expected 36681 portions, got {portion_count}"
    
    # 2. Index Verification
    print(f"\n2. Index Query Plan Verification:")
    test_queries = [
        ("SELECT * FROM foods WHERE fdc_id = 172421", "Search by fdc_id"),
        ("SELECT * FROM foods WHERE common_name LIKE 'Cooked Lentils%'", "Search by common_name"),
        ("SELECT * FROM food_aliases WHERE alias = 'dal'", "Search alias 'dal'"),
        ("SELECT * FROM food_portions WHERE fdc_id = 172421", "Portions by fdc_id")
    ]
    for sql, label in test_queries:
        cur.execute(f"EXPLAIN QUERY PLAN {sql}")
        plan = cur.fetchall()
        print(f"   - {label}:")
        for step in plan:
            print(f"       {step[3]}")

    # 3. Spot Check Sample Foods Against Raw Source CSV
    print(f"\n3. Spot-Checking Sample Foods Against Raw Source CSV:")
    sample_fdc_ids = [
        172421, # Lentils, mature seeds, cooked, boiled, without salt
        168878, # Rice, white, long-grain, regular, enriched, cooked
        173757, # Chickpeas (garbanzo beans, bengal gram), mature seeds, cooked
        171844, # Bread, chapati or roti, plain, commercially prepared
        2705740 # Cheese, paneer
    ]
    
    # Load raw values from food_nutrient.csv for these specific IDs
    raw_vals = {fid: {} for fid in sample_fdc_ids}
    with open(os.path.join(RAW_DIR, 'food_nutrient.csv'), 'r', encoding='utf-8') as fp:
        reader = csv.reader(fp)
        next(reader)
        for r in reader:
            if len(r) > 3:
                try:
                    fid = int(r[1])
                    if fid in raw_vals:
                        nid = r[2]
                        amt = float(r[3])
                        raw_vals[fid][nid] = amt
                except (ValueError, TypeError):
                    pass

    for fid in sample_fdc_ids:
        cur.execute("SELECT * FROM foods WHERE fdc_id = ?", (fid,))
        f_row = cur.fetchone()
        col_names = [d[0] for d in cur.description]
        food_dict = dict(zip(col_names, f_row))
        
        print(f"\n   >>> FDC ID {fid}: {food_dict['common_name']}")
        print(f"       Official USDA: {food_dict['description']}")
        print(f"       Category: {food_dict['food_category']} (Type: {food_dict['data_type']})")
        print(f"       Portions: {food_dict['portion_count']} available")
        
        # Check nutrients comparison
        raw_map = raw_vals[fid]
        # Calories
        raw_cal = raw_map.get('1008') or raw_map.get('2047') or raw_map.get('2048')
        assert (raw_cal is None and food_dict['calories'] is None) or abs(raw_cal - food_dict['calories']) < 0.05, f"Calories mismatch: raw {raw_cal} vs db {food_dict['calories']}"
        # Protein
        raw_prot = raw_map.get('1003')
        assert (raw_prot is None and food_dict['protein_g'] is None) or abs(raw_prot - food_dict['protein_g']) < 0.05, f"Protein mismatch"
        # Carbs
        raw_carbs = raw_map.get('1005')
        assert (raw_carbs is None and food_dict['carbs_g'] is None) or abs(raw_carbs - food_dict['carbs_g']) < 0.05, f"Carbs mismatch"
        # Fat
        raw_fat = raw_map.get('1004')
        assert (raw_fat is None and food_dict['fat_g'] is None) or abs(raw_fat - food_dict['fat_g']) < 0.05, f"Fat mismatch"
        # Iron
        raw_iron = raw_map.get('1089')
        assert (raw_iron is None and food_dict['iron_mg'] is None) or abs(raw_iron - food_dict['iron_mg']) < 0.05, f"Iron mismatch"
        # Zinc
        raw_zinc = raw_map.get('1095')
        assert (raw_zinc is None and food_dict['zinc_mg'] is None) or abs(raw_zinc - food_dict['zinc_mg']) < 0.05, f"Zinc mismatch"
        # B12
        raw_b12 = raw_map.get('1178')
        assert (raw_b12 is None and food_dict['b12_mcg'] is None) or abs(raw_b12 - food_dict['b12_mcg']) < 0.05, f"B12 mismatch"
        
        print(f"       Nutrients per 100g:")
        print(f"         Calories: {food_dict['calories']} kcal (Raw: {raw_cal})")
        print(f"         Protein:  {food_dict['protein_g']} g (Raw: {raw_prot})")
        print(f"         Carbs:    {food_dict['carbs_g']} g (Raw: {raw_carbs})")
        print(f"         Fat:      {food_dict['fat_g']} g (Raw: {raw_fat})")
        print(f"         Vit D:    {food_dict['vitamin_d_mcg']} mcg")
        print(f"         Iron:     {food_dict['iron_mg']} mg (Raw: {raw_iron})")
        print(f"         Zinc:     {food_dict['zinc_mg']} mg (Raw: {raw_zinc})")
        print(f"         B12:      {food_dict['b12_mcg']} mcg (Raw: {raw_b12})")
        print(f"       Completeness: {food_dict['completeness_score']}%")

    # 4. Portion Calculations Verification
    print(f"\n4. Deterministic Portion Calculation Verification:")
    # For FDC 172421 (Cooked Lentils): 1 cup = 198g
    cur.execute("SELECT * FROM food_portions WHERE fdc_id = 172421", ())
    portions = cur.fetchall()
    print(f"   Available portions for Cooked Lentils (FDC 172421):")
    for p in portions:
        print(f"     - Portion ID {p[0]}: {p[6]} -> {p[7]} grams")
        
    cup_portion = [p for p in portions if 'cup' in p[6].lower()][0]
    gram_weight = cup_portion[7] # 198.0 g
    
    # Calculate nutrients for 1 cup (198g) of Cooked Lentils
    cur.execute("SELECT calories, protein_g, carbs_g, fat_g, iron_mg, zinc_mg FROM foods WHERE fdc_id = 172421")
    c_100, p_100, cb_100, f_100, fe_100, zn_100 = cur.fetchone()
    
    cal_serving = round(c_100 * gram_weight / 100.0, 2)
    prot_serving = round(p_100 * gram_weight / 100.0, 2)
    carbs_serving = round(cb_100 * gram_weight / 100.0, 2)
    iron_serving = round(fe_100 * gram_weight / 100.0, 2)
    zinc_serving = round(zn_100 * gram_weight / 100.0, 2)
    
    print(f"\n   Calculated 1 Cup ({gram_weight}g) of Cooked Lentils:")
    print(f"     Calories: {cal_serving} kcal (Expected: 198 * 116 / 100 = 229.68 kcal)")
    print(f"     Protein:  {prot_serving} g (Expected: 198 * 9.02 / 100 = 17.86 g)")
    print(f"     Carbs:    {carbs_serving} g (Expected: 198 * 20.13 / 100 = 39.86 g)")
    print(f"     Iron:     {iron_serving} mg (Expected: 198 * 3.33 / 100 = 6.59 mg)")
    print(f"     Zinc:     {zinc_serving} mg (Expected: 198 * 1.27 / 100 = 2.51 mg)")
    assert abs(cal_serving - 229.68) < 0.2
    assert abs(prot_serving - 17.86) < 0.2
    assert abs(iron_serving - 6.59) < 0.2

    # 5. Null Preservation Check
    print(f"\n5. Verifying Null Preservation (No Silent Zeros):")
    cur.execute("SELECT COUNT(*) FROM foods WHERE vitamin_d_mcg IS NULL;")
    null_vit_d = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM foods WHERE b12_mcg IS NULL;")
    null_b12 = cur.fetchone()[0]
    print(f"   - Foods with NULL Vitamin D: {null_vit_d} (Preserved as NULL, NOT zero)")
    print(f"   - Foods with NULL Vitamin B12: {null_b12} (Preserved as NULL, NOT zero)")
    assert null_vit_d > 0, "Vitamin D nulls were improperly replaced!"
    assert null_b12 > 0, "Vitamin B12 nulls were improperly replaced!"

    # 6. Alias Lookups Verification
    print(f"\n6. Testing Indian & Colloquial Alias Matches:")
    test_aliases = ['dal', 'roti', 'chawal', 'paneer', 'chana', 'palak', 'ghee', 'dosa', 'biryani']
    for a in test_aliases:
        cur.execute("SELECT alias, ambiguous, fdc_id, common_name, confidence FROM food_aliases WHERE alias = ?", (a,))
        matches = cur.fetchall()
        print(f"   Alias '{a}': {len(matches)} match(es) (Ambiguous: {bool(matches[0][1]) if matches else False})")
        for m in matches[:3]:
            print(f"     -> [{m[2]}] {m[3]} (conf: {m[4]})")

    conn.close()
    print("\n" + "="*70)
    print("ALL VERIFICATION CHECKS PASSED WITH 100% SUCCESS!")
    print("="*70)

if __name__ == '__main__':
    verify()

