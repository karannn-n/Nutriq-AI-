import csv, os

raw_dir = r"C:\Users\kc701\Desktop\Projects, Bots and ZIPs\FoodData_Central_csv_2026-10-29\FoodData_Central_csv_2026-10-29"

target_dt = {'sr_legacy_food', 'foundation_food', 'survey_fndds_food'}
target_foods = []

with open(os.path.join(raw_dir, 'food.csv'), 'r', encoding='utf-8') as fp:
    reader = csv.DictReader(fp)
    for row in reader:
        if row['data_type'] in target_dt:
            target_foods.append(row)

print(f"Total target foods: {len(target_foods)}")

search_terms = ['chickpea', 'lentil', 'spinach', 'rice', 'roti', 'chapati', 'naan', 'curry', 'paneer', 'cottage cheese', 'ghee', 'mung', 'pigeon', 'kidney bean', 'samosa', 'chutney', 'dosa', 'biryani']

matches = {}
for term in search_terms:
    matches[term] = []
    for f in target_foods:
        desc = f['description'].lower()
        if term in desc:
            matches[term].append((f['fdc_id'], f['data_type'], f['description']))

for term, items in matches.items():
    print(f"\n--- Term: '{term}' ({len(items)} matches) ---")
    for fdc_id, dt, desc in items[:5]:
        print(f"  [{fdc_id}] ({dt}): {desc}")

