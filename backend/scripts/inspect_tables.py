import csv
import os

raw_dir = r"C:\Users\kc701\Desktop\Projects, Bots and ZIPs\FoodData_Central_csv_2026-10-29\FoodData_Central_csv_2026-10-29"

# 1. Inspect food_category.csv
categories = {}
with open(os.path.join(raw_dir, 'food_category.csv'), 'r', encoding='utf-8') as fp:
    reader = csv.DictReader(fp)
    for r in reader:
        categories[r['id']] = r['description']
print(f"Loaded {len(categories)} categories from food_category.csv")

# 2. Inspect measure_unit.csv
units = {}
with open(os.path.join(raw_dir, 'measure_unit.csv'), 'r', encoding='utf-8') as fp:
    reader = csv.DictReader(fp)
    for r in reader:
        units[r['id']] = r['name']
print(f"Loaded {len(units)} measure units")

# 3. Inspect nutrient.csv
nutrients = {}
with open(os.path.join(raw_dir, 'nutrient.csv'), 'r', encoding='utf-8') as fp:
    reader = csv.DictReader(fp)
    for r in reader:
        nutrients[r['id']] = {'name': r['name'], 'unit': r['unit_name'], 'nbr': r['nutrient_nbr']}
print(f"Loaded {len(nutrients)} nutrients")
# Check our target nutrient IDs
target_ids = ['1008', '1003', '1005', '1004', '1114', '1110', '1089', '1095', '1178', '2047', '2048']
print("\nTarget Nutrients:")
for tid in target_ids:
    if tid in nutrients:
        print(f"  ID {tid}: {nutrients[tid]}")
    else:
        print(f"  ID {tid}: NOT FOUND")

# 4. Inspect food.csv counts for our target data_types
counts = {}
samples = {}
category_id_types = {}
with open(os.path.join(raw_dir, 'food.csv'), 'r', encoding='utf-8') as fp:
    reader = csv.DictReader(fp)
    for row in reader:
        dt = row['data_type']
        counts[dt] = counts.get(dt, 0) + 1
        cat_id = row['food_category_id']
        if dt not in samples:
            samples[dt] = row
        if dt in ('sr_legacy_food', 'foundation_food', 'survey_fndds_food'):
            category_id_types[dt] = category_id_types.get(dt, set())
            category_id_types[dt].add(cat_id)

print("\nFood counts by data_type:")
for dt, c in sorted(counts.items(), key=lambda x: -x[1]):
    print(f"  {dt}: {c}")

print("\nSamples for target data types:")
for dt in ['sr_legacy_food', 'foundation_food', 'survey_fndds_food']:
    if dt in samples:
        s = samples[dt]
        print(f"  {dt}: fdc_id={s['fdc_id']}, category_id='{s['food_category_id']}', desc='{s['description'][:50]}'")

# Check if category IDs in target foods map to food_category.csv
for dt in ['sr_legacy_food', 'foundation_food', 'survey_fndds_food']:
    cat_set = category_id_types.get(dt, set())
    matched = sum(1 for cid in cat_set if cid in categories)
    sample_unmatched = [cid for cid in cat_set if cid not in categories][:5]
    print(f"Category ID mapping for {dt}: {matched}/{len(cat_set)} matched to food_category.csv (sample unmatched: {sample_unmatched})")

# 5. Check food_portion.csv for target foods
target_dt_set = {'sr_legacy_food', 'foundation_food', 'survey_fndds_food'}
target_fdc_ids = set()
with open(os.path.join(raw_dir, 'food.csv'), 'r', encoding='utf-8') as fp:
    reader = csv.DictReader(fp)
    for row in reader:
        if row['data_type'] in target_dt_set:
            target_fdc_ids.add(row['fdc_id'])

print(f"\nTotal target foods (SR Legacy + Foundation + Survey): {len(target_fdc_ids)}")

portion_count = 0
portion_food_ids = set()
with open(os.path.join(raw_dir, 'food_portion.csv'), 'r', encoding='utf-8') as fp:
    reader = csv.DictReader(fp)
    for row in reader:
        if row['fdc_id'] in target_fdc_ids:
            portion_count += 1
            portion_food_ids.add(row['fdc_id'])

print(f"Portions for target foods: {portion_count} portions across {len(portion_food_ids)} foods ({len(portion_food_ids)/len(target_fdc_ids)*100:.1f}%)")

