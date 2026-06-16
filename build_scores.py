#!/usr/bin/env python3
"""Best Countries Map — data builder.

Synthesises six real research datasets in data/raw/*.json (governance, environment/
health/education, Numbeo quality-of-life, economy/tax/infrastructure, people/work-life/
openness, heritage/food/culture proxies) plus expert-curated scores for the irreducibly
subjective dimensions into a single 0-100 score per country for each of 19 dimensions,
and writes data/countries.js (window.BC).

Method, per dimension: gather the relevant raw metric(s), percentile-normalise each across
all countries (inverting where lower-is-better), blend, then percentile-normalise the blended
dimension so every layer spans a clean 0 (world-worst) -> 100 (world-best) range. Subjective
dimensions (landscape, climate, food, culture, spirituality, fun) blend public proxies with
expert estimates. Missing dimensions are imputed from a country's own mean so the weighted
Overall stays fair; `cov` records how many of the 19 were backed by real data.
"""
import json, os, re, sys, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, "data", "raw")
OUT = os.path.join(HERE, "data", "countries.js")
REF = os.path.join(HERE, "tools", "longevity-reference.js")

def load(name):
    with open(os.path.join(RAW, name), encoding="utf-8") as f:
        return json.load(f)

GOV = load("governance.json")     # cpi, freedomHouse, pressFreedom, peaceIndex, humanFreedom
ENV = load("environment.json")    # epi, epiAir, epiWater, lifeExp, pisa, learning
NB  = load("numbeo.json")         # nbHealth, nbSafety, nbCost, nbPurchasing, nbPollution, nbQoL, nbClimate
ECO = load("economy.json")        # gdpPppPc, unemployment, taxToGdp, totalTaxRate, lpi, internetSpeed
PPL = load("people.json")         # happiness, paidLeave, annualHours, englishEPI, migrantAcceptance
CUL = load("culture.json")        # whNatural, whCultural, whTotal, protectedPct, tasteAtlasRank, michelin

# ---- master country list (iso, name, region, lat, lon, le) from the longevity reference ----
with open(REF, encoding="utf-8") as f:
    txt = f.read()
m = re.search(r"window\.LONGEVITY\s*=\s*(\[.*?\])\s*;", txt, re.DOTALL)
raw_arr = re.sub(r",(\s*])", r"\1", m.group(1))          # strip trailing commas
REFROWS = json.loads(raw_arr)
MASTER = {}
for r in REFROWS:
    MASTER[r["iso"]] = {"iso": r["iso"], "name": r["name"], "region": r.get("region", ""),
                        "lat": r.get("lat"), "lon": r.get("lon"), "le": r.get("le")}

# A few names we prefer shorter / clearer
NAME_FIX = {"USA": "United States", "GBR": "United Kingdom", "KOR": "South Korea", "PRK": "North Korea",
            "RUS": "Russia", "IRN": "Iran", "SYR": "Syria", "VEN": "Venezuela", "LAO": "Laos",
            "EGY": "Egypt", "CZE": "Czechia", "SVK": "Slovakia", "BRN": "Brunei", "MKD": "North Macedonia",
            "TZA": "Tanzania", "BOL": "Bolivia", "MDA": "Moldova", "COD": "DR Congo", "COG": "Congo",
            "TWN": "Taiwan", "HKG": "Hong Kong", "MAC": "Macau", "ARE": "United Arab Emirates"}
for iso, nm in NAME_FIX.items():
    if iso in MASTER:
        MASTER[iso]["name"] = nm

# Drop non-sovereign dependencies/territories — this is a map of COUNTRIES. (Taiwan, Hong Kong,
# Macau, Kosovo and Palestine are kept, as in most comparative indices.) Removing them before
# normalisation also keeps them from skewing the percentile pools.
EXCLUDE = {"BMU","CYM","FRO","GRL","TCA","VIR","CHI","GGY","JEY","IMN","GIB","ABW","CUW","SXM",
           "NCL","PYF","GUM","AIA","PRI"}
for iso in list(MASTER):
    if iso in EXCLUDE:
        del MASTER[iso]

def g(src, iso, key):
    d = src.get(iso)
    return d.get(key) if d else None

# ---------------------------------------------------------------- percentile engine
def percentiles(values):
    """values: dict iso->number (Nones already excluded). Returns iso->percentile 1..100."""
    items = sorted(values.items(), key=lambda kv: kv[1])
    n = len(items)
    out = {}
    i = 0
    while i < n:
        j = i
        while j + 1 < n and items[j + 1][1] == items[i][1]:
            j += 1
        # average rank position for ties -> percentile in (0,100]
        rank = (i + j) / 2.0
        p = (rank + 0.5) / n * 100.0
        for k in range(i, j + 1):
            out[items[k][0]] = round(p, 2)
        i = j + 1
    return out

def collect(src_iso_key, transform=lambda v: v, invert=False, isos=None):
    """Build iso->percentile for a metric. src_iso_key: (src, key). transform applied to raw."""
    src, key = src_iso_key
    vals = {}
    for iso in (isos or MASTER):
        v = g(src, iso, key)
        if v is None:
            continue
        try:
            tv = transform(float(v))
        except (TypeError, ValueError):
            continue
        vals[iso] = tv
    pct = percentiles(vals)
    if invert:
        pct = {k: round(100.0 - v + (1.0), 2) for k, v in pct.items()}  # keep within ~1..100
        pct = {k: max(1.0, min(100.0, v)) for k, v in pct.items()}
    return pct

import math
LOG = lambda v: math.log(max(v, 1.0))

# Pre-compute percentile maps for every raw metric we use ----------------------------
P = {}
P["cpi"]            = collect((GOV, "cpi"))
P["freedomHouse"]   = collect((GOV, "freedomHouse"))
P["pressFreedom"]   = collect((GOV, "pressFreedom"))
P["peace"]          = collect((GOV, "peaceIndex"), invert=True)        # lower GPI = safer
P["humanFreedom"]   = collect((GOV, "humanFreedom"))
P["epi"]            = collect((ENV, "epi"))
P["epiAir"]         = collect((ENV, "epiAir"))
P["epiWater"]       = collect((ENV, "epiWater"))
P["lifeExp"]        = collect((ENV, "lifeExp"))
P["pisa"]           = collect((ENV, "pisa"))
P["learning"]       = collect((ENV, "learning"))
P["nbHealth"]       = collect((NB, "nbHealth"))
P["nbSafety"]       = collect((NB, "nbSafety"))
P["nbCostInv"]      = collect((NB, "nbCost"), invert=True)             # lower cost = more affordable
P["nbPurch"]        = collect((NB, "nbPurchasing"))
P["nbPollInv"]      = collect((NB, "nbPollution"), invert=True)        # lower pollution = cleaner
P["nbClimate"]      = collect((NB, "nbClimate"))
P["gdp"]            = collect((ECO, "gdpPppPc"), transform=LOG)
P["unempInv"]       = collect((ECO, "unemployment"), invert=True)
P["taxInv"]         = collect((ECO, "taxToGdp"), invert=True)
P["totalTaxInv"]    = collect((ECO, "totalTaxRate"), invert=True)
P["lpi"]            = collect((ECO, "lpi"))
P["net"]            = collect((ECO, "internetSpeed"), transform=LOG)
P["paidLeave"]      = collect((PPL, "paidLeave"))
P["hoursInv"]       = collect((PPL, "annualHours"), invert=True)
P["english"]        = collect((PPL, "englishEPI"))
P["migrant"]        = collect((PPL, "migrantAcceptance"))
P["whNat"]          = collect((CUL, "whNatural"))
P["whCul"]          = collect((CUL, "whCultural"))
P["protect"]        = collect((CUL, "protectedPct"))
P["michelin"]       = collect((CUL, "michelin"))
# life-expectancy fallback from the reference (covers a few not in ENV)
P["leRef"]          = percentiles({iso: M["le"] for iso, M in MASTER.items() if M.get("le")})

# ---- GlobalTax headline-rate dataset (github.com/martingluckman/globaltax) ----
# Purpose-built per-country headline tax rates; far better for "Low tax burden" than
# the blunt tax-to-GDP proxy. Keyed by ISO alpha-2 -> map to alpha-3 via the geojson.
A2A3 = {}
try:
    geo = json.load(open(os.path.join(HERE, "data", "countries.geojson"), encoding="utf-8"))
    for f in geo["features"]:
        p = f["properties"]; a3 = p.get("ADM0_A3")
        a2 = p.get("ISO_A2_EH")
        if not a2 or a2 == "-99":
            a2 = p.get("ISO_A2")
        if a2 and a2 != "-99" and a3:
            A2A3.setdefault(a2, a3)
except Exception as e:
    sys.stderr.write(f"geojson A2A3 load failed: {e}\n")
A2A3.update({"XK":"XKX","NA":"NAM","TW":"TWN","HK":"HKG","MO":"MAC","GB":"GBR","FR":"FRA","NO":"NOR","CY":"CYP"})

GTAX = {}   # iso3 -> {pit, cit, vat, cgt, est, ss}
try:
    gt = open(os.path.join(RAW, "globaltax-tax-data.js"), encoding="utf-8").read()
    for m in re.finditer(r'\b([A-Z]{2})\s*:\s*\{([^{}]*)\}', gt, re.DOTALL):
        a3 = A2A3.get(m.group(1))
        if not a3:
            continue
        fields = {k: float(v) for k, v in re.findall(
            r'(?<![A-Za-z])(pit|cit|vat|cgt|est|ss)\s*:\s*(-?\d+(?:\.\d+)?)', m.group(2))}
        if "pit" in fields:
            GTAX[a3] = fields
except Exception as e:
    sys.stderr.write(f"globaltax load failed: {e}\n")
sys.stderr.write(f"GlobalTax headline rates: {len(GTAX)} countries\n")

# Unified tax burden (lower = lighter). Weighted headline rates from GlobalTax where
# available (personal income heaviest), else World Bank tax-to-GDP as a fallback proxy.
TAXW = {"pit":0.42, "cgt":0.14, "ss":0.14, "vat":0.12, "cit":0.12, "est":0.06}
taxBurden = {}
for iso in MASTER:
    f = GTAX.get(iso)
    if f:
        taxBurden[iso] = sum(w * f.get(k, 0.0) for k, w in TAXW.items())
    else:
        t = g(ECO, iso, "taxToGdp")
        if t is not None:
            taxBurden[iso] = float(t)
_taxpct = percentiles(taxBurden)
P["taxFinalInv"] = {k: max(1.0, min(100.0, 100.0 - v + 1.0)) for k, v in _taxpct.items()}

def pv(metric, iso):
    return P[metric].get(iso)

def blend(iso, parts):
    """parts: list of (metric_or_value, weight). metric str -> percentile lookup; number -> literal 0..100.
    Returns weighted mean over available components, or None if none available."""
    num = den = 0.0
    for comp, w in parts:
        val = pv(comp, iso) if isinstance(comp, str) else comp
        if val is None:
            continue
        num += val * w
        den += w
    return (num / den) if den else None

# ---------------------------------------------------------------- expert dictionaries
# Subjective dimensions. Values 0-100 on an absolute-ish scale; blended with public proxies
# then percentile-normalised with everything else. .get(iso, default) for the long tail.

CLIMATE_FILL = {  # used where Numbeo has no climate index. pleasant/mild high; extreme heat/cold/wet low
 "ISL":62,"NOR":52,"SWE":58,"FIN":50,"IRL":78,"GBR":74,"NZL":97,"CHE":74,"AUT":72,"DEU":72,"NLD":76,
 "BEL":74,"DNK":72,"POL":68,"CZE":74,"SVK":72,"HUN":74,"ROU":72,"LTU":66,"LVA":66,"EST":64,"BLR":62,
 "UKR":68,"RUS":40,"KAZ":40,"MNG":30,"KGZ":58,"TJK":56,"TKM":48,"UZB":56,"AFG":58,
 "CAN":52,"USA":74,"MEX":86,"GTM":82,"HND":80,"SLV":82,"NIC":82,"CRI":90,"PAN":78,"BLZ":80,"CUB":84,
 "DOM":86,"HTI":80,"JAM":84,"TTO":82,"BHS":86,"BRB":86,"PRI":82,
 "COL":86,"VEN":80,"ECU":90,"PER":84,"BOL":78,"BRA":88,"PRY":82,"URY":90,"ARG":86,"CHL":86,"GUY":74,"SUR":74,
 "MAR":86,"DZA":74,"TUN":86,"LBY":72,"EGY":80,"ETH":78,"KEN":86,"TZA":80,"UGA":82,"RWA":84,"BDI":80,
 "NGA":68,"GHA":70,"CIV":70,"SEN":74,"MLI":52,"BFA":56,"NER":40,"TCD":46,"CMR":72,"GAB":66,"COG":66,
 "COD":68,"AGO":76,"ZMB":78,"ZWE":82,"MWI":80,"MOZ":78,"NAM":82,"BWA":78,"ZAF":90,"LSO":74,"SWZ":80,
 "MDG":82,"MUS":86,"SOM":58,"SDN":48,"SSD":52,"ERI":58,"DJI":40,"MRT":48,"GMB":76,"GNB":72,"GIN":70,
 "SLE":68,"LBR":68,"TGO":70,"BEN":72,"STP":76,"CPV":84,"COM":80,"SYC":88,
 "SAU":40,"YEM":62,"OMN":70,"ARE":46,"QAT":40,"KWT":36,"BHR":48,"IRQ":58,"IRN":66,"JOR":80,"LBN":86,
 "ISR":88,"SYR":78,"PSE":82,"TUR":86,"CYP":92,
 "IND":58,"PAK":62,"BGD":68,"NPL":70,"BTN":74,"LKA":76,"MMR":68,"THA":70,"LAO":68,"KHM":66,"VNM":74,
 "MYS":66,"IDN":74,"PHL":72,"BRN":62,"SGP":60,"TWN":80,"KOR":74,"JPN":80,"CHN":62,"HKG":74,"MAC":76,
 "PNG":68,"FJI":84,"SLB":78,"VUT":82,"WSM":82,"TON":82,"KIR":78,"FSM":78,"MHL":78,"PLW":84,
 "AUS":86,"GEO":86,"ARM":72,"AZE":80,
}

LANDSCAPE = {  # scenic beauty & access to nature (0-100)
 "NZL":99,"NOR":98,"CHE":97,"ISL":98,"CAN":95,"CHL":95,"NPL":96,"PER":93,"ITA":91,"USA":93,"AUT":93,
 "SVN":90,"HRV":90,"GRC":91,"ZAF":93,"TZA":91,"KEN":88,"NAM":91,"BWA":86,"ECU":91,"ARG":91,"BRA":89,
 "IDN":89,"PHL":87,"VNM":86,"THA":85,"MYS":83,"LKA":85,"JPN":87,"KOR":78,"GEO":89,"ARM":82,"KGZ":89,
 "TJK":88,"BTN":92,"IND":83,"MEX":87,"CRI":93,"PAN":83,"COL":89,"BOL":89,"VEN":85,"AUS":91,"FJI":91,
 "PNG":84,"VUT":86,"WSM":84,"SYC":92,"MDG":88,"ETH":84,"RWA":84,"UGA":83,"MWI":80,"MOZ":80,"ZWE":84,
 "ZMB":80,"AGO":74,"GAB":80,"CMR":78,"COD":82,"COG":78,"GHA":72,"CIV":72,"SEN":72,"NGA":68,"MLI":60,
 "MRT":58,"NER":52,"TCD":56,"SDN":56,"SSD":58,"ERI":62,"DJI":58,"SOM":58,"LBR":70,"SLE":72,"GIN":72,
 "GMB":62,"GNB":66,"TGO":62,"BEN":62,"BFA":54,"STP":80,"CPV":80,"COM":78,
 "TUR":86,"IRN":82,"IRQ":58,"JOR":80,"LBN":80,"ISR":74,"SYR":72,"SAU":62,"YEM":74,"OMN":80,"ARE":58,
 "QAT":38,"KWT":34,"BHR":40,"CYP":78,"PSE":62,
 "GBR":80,"IRL":86,"FRA":86,"DEU":74,"ESP":86,"PRT":84,"NLD":58,"BEL":56,"DNK":62,"SWE":86,"FIN":84,
 "POL":72,"CZE":78,"SVK":84,"HUN":62,"ROU":84,"BGR":82,"SRB":74,"BIH":84,"MNE":90,"ALB":82,"MKD":78,
 "EST":74,"LVA":72,"LTU":70,"BLR":62,"UKR":70,"RUS":84,"MDA":58,"KAZ":74,"MNG":86,"UZB":66,"TKM":58,
 "AZE":80,"MMR":80,"LAO":82,"KHM":74,"BGD":56,"PAK":86,"AFG":78,"BRN":76,"SGP":56,"TWN":82,"CHN":86,
 "HKG":72,"HND":80,"GTM":86,"NIC":82,"SLV":74,"CUB":80,"DOM":82,"JAM":84,"HTI":72,"TTO":78,"BHS":84,
 "BRB":78,"GUY":80,"SUR":80,"URY":76,"PRY":68,"BLZ":88,"PRI":82,"MUS":86,"LSO":84,"SWZ":80,"GAB":80,
}

FOOD = {  # cuisine quality & deliciousness (0-100), anchored to TasteAtlas + global reputation
 "ITA":98,"JPN":96,"FRA":96,"GRC":94,"ESP":94,"MEX":95,"IND":94,"CHN":94,"THA":94,"TUR":93,"PER":93,
 "VNM":91,"LBN":91,"KOR":88,"PRT":88,"MAR":87,"IDN":85,"MYS":86,"GEO":85,"USA":82,"BRA":81,"ARG":84,
 "TWN":90,"HKG":90,"SGP":88,"PHL":80,"LKA":82,"NPL":76,"PAK":84,"BGD":80,"IRN":84,"IRQ":76,"JOR":82,
 "ISR":84,"SYR":84,"EGY":80,"TUN":80,"DZA":78,"ETH":84,"NGA":78,"GHA":76,"SEN":78,"CIV":74,"KEN":72,
 "ZAF":78,"COD":68,"CMR":72,"AGO":68,"MOZ":70,"TZA":70,"UGA":68,"RWA":66,"MLI":68,
 "GBR":72,"IRL":70,"DEU":76,"AUT":80,"CHE":76,"NLD":68,"BEL":80,"DNK":78,"SWE":72,"NOR":68,"FIN":66,
 "ISL":64,"POL":78,"CZE":78,"SVK":74,"HUN":82,"ROU":78,"BGR":80,"SRB":80,"HRV":82,"SVN":80,"BIH":78,
 "ALB":76,"MKD":78,"GRC2":0,"EST":66,"LVA":66,"LTU":68,"BLR":68,"UKR":80,"RUS":76,"MDA":72,"CYP":82,
 "AUS":78,"NZL":74,"CAN":74,"MEX2":0,"COL":80,"VEN":76,"ECU":76,"BOL":74,"CHL":78,"URY":78,"PRY":72,
 "CRI":74,"PAN":74,"GTM":74,"HND":72,"NIC":72,"SLV":72,"CUB":76,"DOM":76,"JAM":82,"HTI":72,"TTO":80,
 "KAZ":72,"UZB":82,"KGZ":72,"TJK":72,"TKM":70,"MNG":66,"AZE":82,"ARM":82,"AFG":76,"MMR":76,"LAO":78,
 "KHM":78,"BRN":76,"SAU":74,"ARE":76,"QAT":72,"KWT":74,"BHR":74,"OMN":74,"YEM":72,"MUS":80,"MDG":70,
 "NAM":66,"BWA":64,"ZWE":68,"ZMB":66,"SDN":70,"LBY":76,"SOM":66,
}

CULTURE = {  # arts, museums, festivals, heritage depth (0-100)
 "ITA":97,"FRA":98,"GBR":94,"ESP":91,"DEU":92,"AUT":92,"USA":94,"RUS":90,"JPN":91,"CHN":90,"IND":93,
 "GRC":91,"EGY":89,"MEX":89,"TUR":87,"NLD":85,"CZE":83,"HUN":80,"PRT":80,"BEL":83,"POL":80,"BRA":83,
 "PER":82,"CUB":82,"ARG":82,"COL":78,"CHL":74,"BOL":76,"ECU":74,"GTM":76,"MAR":82,"TUN":74,"DZA":70,
 "IRN":86,"IRQ":80,"ISR":82,"JOR":78,"LBN":80,"SYR":80,"SAU":68,"ARE":74,"QAT":72,"KWT":62,"OMN":70,
 "YEM":70,"UZB":82,"KAZ":64,"AZE":72,"ARM":80,"GEO":80,"TJK":66,"KGZ":62,"TKM":62,"MNG":70,
 "THA":82,"VNM":80,"KHM":82,"LAO":76,"MMR":80,"IDN":84,"MYS":76,"PHL":72,"SGP":72,"KOR":82,"TWN":78,
 "HKG":76,"LKA":78,"NPL":82,"BTN":80,"PAK":78,"BGD":74,"AFG":72,
 "IRL":80,"CHE":78,"SWE":78,"NOR":74,"DNK":78,"FIN":74,"ISL":68,"NZL":68,"AUS":74,"CAN":74,"ROU":76,
 "BGR":76,"SRB":76,"HRV":80,"SVN":74,"BIH":74,"ALB":68,"MKD":72,"MNE":70,"EST":72,"LVA":72,"LTU":74,
 "BLR":68,"UKR":80,"MDA":64,"CYP":74,"MLT":78,"LUX":68,
 "ETH":84,"NGA":80,"GHA":76,"SEN":78,"MLI":80,"CIV":70,"KEN":72,"TZA":74,"UGA":68,"COD":74,"CMR":72,
 "AGO":66,"ZAF":76,"ZWE":70,"MOZ":68,"MWI":62,"RWA":62,"BFA":74,"BEN":76,"TGO":66,"MDG":72,"NAM":64,
 "MEX3":0,"USA2":0,"VEN":74,"PRY":68,"URY":72,"CRI":68,"PAN":68,"HND":66,"NIC":66,"SLV":64,"DOM":72,
 "HTI":74,"JAM":74,"TTO":76,"GUY":64,"SUR":64,
}

SPIRIT = {  # depth & vibrancy of spiritual / religious / contemplative life (0-100)
 "IND":98,"NPL":95,"ISR":95,"SAU":93,"BTN":93,"MMR":91,"LKA":91,"THA":90,"KHM":88,"IRN":89,"ETH":89,
 "IRQ":86,"PAK":86,"BGD":83,"AFG":84,"LAO":85,"VNM":76,"MNG":80,"IDN":85,"PHL":85,
 "ITA":87,"GRC":83,"PER":85,"MEX":83,"EGY":85,"MAR":83,"TUR":83,"JOR":81,"LBN":80,"SYR":80,"YEM":82,
 "ARM":85,"GEO":85,"RUS":74,"UKR":74,"POL":85,"PRT":80,"ESP":78,"IRL":78,"CRO":0,"HRV":74,
 "NGA":86,"GHA":83,"SEN":86,"MLI":84,"KEN":84,"TZA":82,"UGA":84,"COD":82,"CMR":80,"AGO":80,"ZMB":82,
 "ZWE":78,"MWI":80,"MOZ":78,"RWA":80,"BDI":80,"BEN":78,"BFA":80,"CIV":78,"GIN":80,"SLE":78,"LBR":78,
 "TGO":76,"MDG":74,"NAM":72,"BWA":74,"ZAF":74,"SSD":78,"SDN":82,"SOM":84,"ERI":78,"DJI":80,"MRT":82,
 "GMB":80,"GNB":76,"STP":72,"CPV":72,"COM":82,
 "USA":72,"BRA":80,"COL":80,"VEN":76,"ECU":80,"BOL":82,"GTM":82,"HND":80,"SLV":80,"NIC":80,"PRY":78,
 "DOM":78,"HTI":80,"JAM":80,"CUB":68,"TTO":74,"URY":40,"ARG":72,"CHL":70,"CRI":74,"PAN":74,
 "GBR":44,"FRA":42,"DEU":44,"NLD":38,"BEL":42,"AUT":52,"CHE":48,"SWE":30,"NOR":34,"DNK":30,"FIN":40,
 "ISL":36,"EST":22,"CZE":26,"LVA":40,"LTU":58,"BLR":54,"HUN":52,"SVK":62,"SVN":52,"ROU":74,"BGR":58,
 "SRB":66,"MKD":68,"MNE":66,"ALB":56,"GRC2":0,"MDA":70,"CYP":74,"MLT":72,
 "KOR":60,"JPN":64,"CHN":54,"TWN":66,"HKG":52,"SGP":58,"MYS":78,"BRN":78,"KAZ":58,"UZB":68,"KGZ":66,
 "TJK":72,"TKM":62,"AZE":58,"AUS":42,"NZL":40,"CAN":48,"OMN":80,"ARE":68,"QAT":74,"KWT":76,"BHR":70,
 "FJI":80,"PNG":82,"VUT":80,"WSM":84,"TON":86,"KIR":80,"FSM":80,"MHL":82,"PLW":76,"GAB":72,
}

FUN = {  # healthy recreation, sport, outdoor activity & vibrant safe social life (0-100; not nightlife/alcohol)
 "BRA":95,"ESP":92,"MEX":90,"ITA":90,"AUS":93,"COL":90,"CRI":90,"NZL":91,"ARG":89,"THA":88,"GRC":87,
 "PRT":87,"USA":86,"NLD":85,"JAM":85,"DOM":85,"CUB":85,"TTO":87,"PHL":85,"SEN":83,"NGA":82,"GHA":82,
 "KEN":83,"ZAF":83,"IDN":81,"IND":81,"VNM":79,"TUR":79,"PER":79,"PRI":84,"VEN":80,"ECU":78,"BOL":74,
 "CHL":78,"URY":80,"PRY":76,"PAN":78,"GTM":74,"HND":74,"NIC":74,"SLV":74,
 "NOR":82,"SWE":80,"CHE":82,"AUT":84,"CAN":84,"FRA":83,"DEU":81,"GBR":82,"IRL":81,"DNK":80,"FIN":78,
 "ISL":80,"BEL":76,"POL":74,"CZE":78,"SVK":74,"HUN":74,"ROU":72,"HRV":80,"SVN":80,"SRB":76,"BIH":72,
 "ALB":72,"MKD":70,"MNE":74,"BGR":72,"EST":70,"LVA":68,"LTU":70,"BLR":66,"UKR":70,"RUS":72,"MDA":64,
 "CYP":80,"MLT":80,"LUX":74,
 "JPN":80,"KOR":76,"TWN":80,"HKG":74,"SGP":76,"CHN":72,"MYS":78,"LKA":76,"NPL":74,"BGD":68,"PAK":72,
 "MMR":68,"LAO":72,"KHM":72,"BRN":66,"MNG":70,"KAZ":68,"UZB":68,"KGZ":70,"TJK":66,"BTN":74,"AFG":48,
 "SAU":58,"ARE":68,"QAT":64,"KWT":62,"BHR":66,"OMN":66,"IRN":66,"IRQ":58,"JOR":66,"LBN":74,"ISR":78,
 "SYR":50,"YEM":46,"EGY":70,"MAR":74,"TUN":74,"DZA":66,"PSE":56,
 "ETH":72,"TZA":74,"UGA":74,"RWA":72,"COD":70,"CMR":76,"CIV":76,"MLI":72,"AGO":72,"ZMB":74,"ZWE":72,
 "MOZ":72,"MWI":72,"NAM":76,"BWA":74,"MDG":70,"GAB":70,"SDN":58,"SOM":52,"MUS":80,"FJI":86,"PNG":70,
 "VUT":80,"WSM":82,"TON":80,"SYC":84,"BHS":86,"BRB":86,"BLZ":80,"GUY":72,"SUR":72,"HTI":66,
}

# Low-tax-burden fallback for jurisdictions the World Bank tax-to-GDP series misses.
# Higher = lighter tax burden. Monaco/Andorra are genuine low-/no-income-tax states that
# would otherwise be imputed to the middle of the map.
TAX_FILL = {
 "MCO":97,   # no personal income tax, no capital-gains or wealth tax
 "AND":90,   # max ~10% income tax, 4.5% VAT (lowest in Europe)
 "TWN":66,   # developed economy but relatively low tax-to-GDP (~13%)
 "PRK":52,   # nominally "tax-free" but a command economy — treat as neutral
}

def expert(d, iso):
    v = d.get(iso)
    return float(v) if isinstance(v, (int, float)) and v > 0 else None

# ---------------------------------------------------------------- dimensions
# Each returns a 0..100 blended value (pre final-normalisation), or None.
def dim_values(iso):
    d = {}
    d["healthcare"]   = blend(iso, [("nbHealth", 1.0)]) or blend(iso, [("lifeExp", .6), ("leRef", .3), ("gdp", .4)])
    d["health"]       = blend(iso, [("lifeExp", 1.0)]) or blend(iso, [("leRef", 1.0)]) or blend(iso, [("gdp", 1.0)])
    d["safety"]       = blend(iso, [("nbSafety", .5), ("peace", .5)]) or blend(iso, [("peace", 1.0)]) or blend(iso, [("nbSafety", 1.0)])
    d["cleanliness"]  = blend(iso, [("epiAir", .45), ("epiWater", .2), ("nbPollInv", .35)]) or blend(iso, [("epi", 1.0)])
    d["governance"]   = blend(iso, [("cpi", 1.0)]) or blend(iso, [("freedomHouse", .6), ("peace", .4)])
    d["freedom"]      = blend(iso, [("freedomHouse", .45), ("pressFreedom", .25), ("humanFreedom", .30)]) or blend(iso, [("freedomHouse", 1.0)])
    d["education"]    = blend(iso, [("pisa", .55), ("learning", .45)]) or blend(iso, [("learning", 1.0)]) or blend(iso, [("gdp", 1.0)])
    d["openness"]     = blend(iso, [("migrant", .55), ("english", .45)]) or blend(iso, [("english", 1.0)]) or blend(iso, [("migrant", 1.0)])
    d["opportunity"]  = blend(iso, [("gdp", .55), ("unempInv", .45)]) or blend(iso, [("gdp", 1.0)])
    d["affordability"]= blend(iso, [("nbPurch", .8), ("nbCostInv", .2)]) or blend(iso, [("gdp", 1.0)])
    d["tax"]          = pv("taxFinalInv", iso) or expert(TAX_FILL, iso)
    d["worklife"]     = blend(iso, [("paidLeave", .5), ("hoursInv", .5)]) or blend(iso, [("paidLeave", 1.0)]) or blend(iso, [("hoursInv", 1.0)])
    d["infrastructure"]= blend(iso, [("lpi", .5), ("net", .3), ("gdp", .2)]) or blend(iso, [("gdp", 1.0)])
    # subjective: proxy blended with expert, expert fills gaps
    nbcl = pv("nbClimate", iso); cfill = CLIMATE_FILL.get(iso)
    d["climate"]      = nbcl if nbcl is not None else (float(cfill) if cfill is not None else None)
    d["landscape"]    = blend(iso, [("whNat", .25), ("protect", .15), (expert(LANDSCAPE, iso), .60)]) or expert(LANDSCAPE, iso)
    d["food"]         = blend(iso, [(expert(FOOD, iso), .85), ("michelin", .15)]) or expert(FOOD, iso)
    d["culture"]      = blend(iso, [(expert(CULTURE, iso), .62), ("whCul", .38)]) or expert(CULTURE, iso)
    d["spirituality"] = expert(SPIRIT, iso)
    d["fun"]          = expert(FUN, iso)
    return d

DIMS = ["healthcare","health","safety","cleanliness","governance","freedom","education","openness",
        "opportunity","affordability","tax","worklife","infrastructure","climate","landscape","food",
        "culture","spirituality","fun"]

# compute raw dimension values for every country
rawdim = {dim: {} for dim in DIMS}
real = {}
for iso in MASTER:
    dv = dim_values(iso)
    real[iso] = sum(1 for dim in DIMS if dv.get(dim) is not None)
    for dim in DIMS:
        if dv.get(dim) is not None:
            rawdim[dim][iso] = dv[dim]

# final per-dimension percentile normalisation (each layer spans ~1..100)
norm = {dim: percentiles(rawdim[dim]) for dim in DIMS}

# Build output: keep only countries with a reasonable amount of real data
rows = []
for iso, M in MASTER.items():
    if M["lat"] is None or M["lon"] is None:
        continue
    if real[iso] < 7:        # too sparse to be meaningful
        continue
    s = {}
    present = [norm[dim][iso] for dim in DIMS if iso in norm[dim]]
    mean = sum(present) / len(present) if present else 50.0
    imp = 0.5 * mean + 0.5 * 50.0   # impute missing dims shrunk toward neutral (don't reward sparse data)
    for dim in DIMS:
        s[dim] = round(norm[dim].get(iso, imp), 1)
    happ = g(PPL, iso, "happiness")
    row = {"iso": iso, "name": M["name"], "region": M["region"],
           "lat": round(M["lat"], 2), "lon": round(M["lon"], 2),
           "s": s, "cov": real[iso]}
    if happ is not None:
        row["happiness"] = round(float(happ), 2)
    rows.append(row)

rows.sort(key=lambda r: sum(r["s"].values()), reverse=True)

def compact(o):
    return json.dumps(o, separators=(",", ":"), ensure_ascii=False)

today = datetime.date.today().isoformat()
with open(OUT, "w", encoding="utf-8") as f:
    f.write("/* Best Countries Map — country scores, built by build_scores.py from data/raw/*.json\n")
    f.write("   + expert curation for subjective dimensions. s = 19 dimensions, each 0-100 (higher = better,\n")
    f.write("   incl. tax = lower burden). happiness = World Happiness ladder 0-10 (reference overlay only).\n")
    f.write(f"   cov = # of dimensions backed by real data (others imputed from the country mean). Built {today}. */\n")
    f.write(f'window.BC_BUILT = "{today}";\n')
    f.write("window.BC = [\n")
    for r in rows:
        f.write(compact(r) + ",\n")
    f.write("];\n")

# ---- console summary ----
print(f"EMITTED {len(rows)} countries to {OUT}")
def top(dim, n=8):
    rk = sorted(rows, key=lambda r: r["s"][dim], reverse=True)[:n]
    return ", ".join(f"{r['name']}({r['s'][dim]:.0f})" for r in rk)
print("\nOverall top 15:")
for i, r in enumerate(rows[:15]):
    avg = sum(r["s"].values()) / len(DIMS)
    print(f"  {i+1:2d}. {r['name']:<22} {avg:5.1f}  (cov {r['cov']}/19)")
print("\nBy dimension — leaders:")
for dim in DIMS:
    print(f"  {dim:<14} {top(dim)}")
miss = {dim: sum(1 for r in rows if r['cov'] and norm[dim].get(r['iso']) is None) for dim in DIMS}
print("\nImputed (no real data) counts:", {k: v for k, v in miss.items() if v})
