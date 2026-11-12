import csv, os

raw_dir = r"C:\Users\kc701\Desktop\Projects, Bots and ZIPs\FoodData_Central_csv_2026-10-29\FoodData_Central_csv_2026-10-29"

# Load measure units
units = {}
with open(os.path.join(raw_dir, 'measure_unit.csv'), 'r', encoding='utf-8') as fp:
    reader = csv.DictReader(fp)
    for r in reader:
        units[r['id']] = r['name']

# Inspect 20 portion rows for target foods
target_dt_set = {'sr_legacy_food', 'foundation_food', 'survey_fndds_food'}
target_fdc_ids = set()
with open(os.path.join(raw_dir, 'food.csv'), 'r', encoding='utf-8') as fp:
    reader = csv.DictReader(fp)
    for row in reader:
        if row['data_type'] in target_dt_set:
            target_fdc_ids.add(row['fdc_id'])

portions_sample = []
with open(os.path.join(raw_dir, 'food_portion.csv'), 'r', encoding='utf-8') as fp:
    reader = csv.DictReader(fp)
    for row in reader:
        if row['fdc_id'] in target_fdc_ids:
            portions_sample.append({
                'id': row['id'],
                'fdc_id': row['fdc_id'],
                'seq_num': row['seq_num'],
                'amount': row['amount'],
                'measure_unit_id': row['measure_unit_id'],
                'measure_unit_name': units.get(row['measure_unit_id'], ''),
                'portion_description': row['portion_description'],
                'modifier': row['modifier'],
                'gram_weight': row['gram_weight']
            })
            if len(portions_sample) >= 20:
                break

for p in portions_sample:
    print(p)

