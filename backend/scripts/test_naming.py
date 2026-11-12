import re

def normalize_usda_name(desc):
    if not desc:
        return ""
    text = desc.strip()
    
    # Split by commas only outside of parentheses
    parts = [p.strip() for p in re.split(r',\s*(?![^()]*\))', text) if p.strip()]
    if not parts:
        return text
        
    main_item = parts[0]
    descriptors = parts[1:]
    
    prep_methods = {'raw', 'cooked', 'boiled', 'frozen', 'roasted', 'baked', 'steamed', 'dried', 'canned', 'dry'}
    found_prep = []
    other_desc = []
    
    for d in descriptors:
        d_lower = d.lower()
        words = set(re.findall(r'\b\w+\b', d_lower))
        if words & prep_methods and len(d.split()) <= 3:
            found_prep.append(d)
        else:
            other_desc.append(d)
            
    # Combine nicely
    if found_prep and any(p.lower() in ('cooked', 'raw', 'boiled', 'steamed', 'baked', 'roasted', 'frozen') for p in found_prep):
        primary_prep = found_prep[0].title()
        if other_desc:
            return f"{primary_prep} {main_item} ({', '.join(other_desc)})"
        return f"{primary_prep} {main_item}"
    elif other_desc:
        return f"{main_item} ({', '.join(other_desc)})"
    else:
        return main_item

test_cases = [
    "Rice, white, long-grain, regular, enriched, cooked",
    "Lentils, mature seeds, cooked, boiled, without salt",
    "Milk, whole, 3.25% milkfat, with added vitamin D",
    "Bread, chapati or roti, whole wheat, commercially prepared, frozen",
    "Chickpeas (garbanzo beans, bengal gram), mature seeds, cooked, boiled, without salt",
    "Tomatoes, grape, raw",
    "Broccoli, raw",
    "Palak Paneer",
    "Cheese, paneer",
    "Chicken curry"
]

for tc in test_cases:
    print(f"ORIG: {tc}")
    print(f"NORM: {normalize_usda_name(tc)}\n")
