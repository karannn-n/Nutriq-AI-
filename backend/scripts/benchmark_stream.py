import csv
import time
import os

raw_dir = r"C:\Users\kc701\Desktop\Projects, Bots and ZIPs\FoodData_Central_csv_2026-10-29\FoodData_Central_csv_2026-10-29"

# 1. Collect target fdc_ids
t0 = time.time()
target_dt = {'sr_legacy_food', 'foundation_food', 'survey_fndds_food'}
target_fdc_ids = set()

with open(os.path.join(raw_dir, 'food.csv'), 'r', encoding='utf-8') as fp:
    reader = csv.reader(fp)
    header = next(reader)
    # fdc_id=0, data_type=1
    for r in reader:
        if len(r) > 1 and r[1] in target_dt:
            target_fdc_ids.add(r[0])

print(f"Loaded {len(target_fdc_ids)} target foods in {time.time()-t0:.2f}s")

# 2. Test streaming food_nutrient.csv for target nutrient IDs
target_nutrient_ids = {
    '1008', # Energy KCAL
    '2047', # Energy Atwater General
    '2048', # Energy Atwater Specific
    '1003', # Protein G
    '1005', # Carb G
    '1004', # Fat G
    '1114', # Vit D UG
    '1110', # Vit D IU
    '1111', # Vit D2 UG
    '1112', # Vit D3 UG
    '1089', # Iron MG
    '1095', # Zinc MG
    '1178', # Vit B12 UG
}

t1 = time.time()
nutrient_records_collected = 0
total_rows = 0

with open(os.path.join(raw_dir, 'food_nutrient.csv'), 'r', encoding='utf-8') as fp:
    reader = csv.reader(fp)
    header = next(reader)
    for r in reader:
        total_rows += 1
        if len(r) > 3 and r[1] in target_fdc_ids:
            if r[2] in target_nutrient_ids:
                nutrient_records_collected += 1
        if total_rows % 5000000 == 0:
            print(f"  Processed {total_rows:,} rows, matched {nutrient_records_collected:,} nutrient records ({time.time()-t1:.1f}s)...")

print(f"Finished: {total_rows:,} total rows scanned, {nutrient_records_collected:,} target nutrient records collected in {time.time()-t1:.2f}s")

