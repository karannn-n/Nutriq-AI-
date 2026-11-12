import csv, os

raw_dir = r"C:\Users\kc701\Desktop\Projects, Bots and ZIPs\FoodData_Central_csv_2026-10-29\FoodData_Central_csv_2026-10-29"

target_dt = {'sr_legacy_food', 'foundation_food', 'survey_fndds_food'}
samples_by_dt = {dt: [] for dt in target_dt}

with open(os.path.join(raw_dir, 'food.csv'), 'r', encoding='utf-8') as fp:
    reader = csv.DictReader(fp)
    for row in reader:
        dt = row['data_type']
        if dt in target_dt and len(samples_by_dt[dt]) < 15:
            samples_by_dt[dt].append(row)

for dt, rows in samples_by_dt.items():
    print(f"\n=== {dt.upper()} SAMPLES ===")
    for r in rows:
        print(f"  [{r['fdc_id']}] {r['description']}")

