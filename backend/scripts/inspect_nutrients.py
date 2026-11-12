import csv, os

raw_dir = r"C:\Users\kc701\Desktop\Projects, Bots and ZIPs\FoodData_Central_csv_2026-10-29\FoodData_Central_csv_2026-10-29"

print("--- Nutrient search results ---")
with open(os.path.join(raw_dir, 'nutrient.csv'), 'r', encoding='utf-8') as fp:
    for r in csv.DictReader(fp):
        name = r['name'].lower()
        if any(k in name for k in ['vitamin d', 'b-12', 'energy', 'iron', 'zinc']):
            print(f"ID {r['id']}: {r['name']} ({r['unit_name']}) - Nbr {r['nutrient_nbr']}")

