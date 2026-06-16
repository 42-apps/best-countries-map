#!/usr/bin/env python3
"""Extract the final ```json deliverable from a background-agent transcript (.output JSONL)
and write it to a clean data/raw/*.json file. Prints only a one-line status (never the data),
so it can run without flooding the caller's context.

Usage: extract_raw.py <transcript.output> <out.json>
"""
import json, re, sys

src, out = sys.argv[1], sys.argv[2]
texts = []
with open(src, encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if not line:
            continue
        try:
            obj = json.loads(line)
        except Exception:
            continue
        stack = [obj]
        while stack:
            x = stack.pop()
            if isinstance(x, dict):
                for k, v in x.items():
                    if k == "text" and isinstance(v, str):
                        texts.append(v)
                    else:
                        stack.append(v)
            elif isinstance(x, list):
                stack.extend(x)

full = "\n".join(texts)
blocks = re.findall(r"```json\s*(.*?)```", full, re.DOTALL)
chosen = None
for b in blocks:
    try:
        d = json.loads(b)
    except Exception:
        continue
    if isinstance(d, dict) and len(d) > 20:
        chosen = d  # keep the LAST large object (corrected/deduped deliverable)

if chosen is None:
    print(f"!! NO JSON BLOCK FOUND in {src}")
    sys.exit(1)

# drop whitespace-key artifacts and all-null rows
clean = {}
for k, v in chosen.items():
    k2 = k.strip()
    if not k2 or not isinstance(v, dict):
        continue
    if not any(val is not None for val in v.values()):
        continue
    clean[k2] = v

with open(out, "w", encoding="utf-8") as f:
    json.dump(clean, f, ensure_ascii=False, separators=(",", ":"))
print(f"OK {out}: {len(clean)} countries")
