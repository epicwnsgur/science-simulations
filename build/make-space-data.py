"""별과 우주 단원 실험에 쓰는 실제 천체 자료를 만들어요(src/data/*.js). 한 번만 돌리면 돼요.
사용: python3 -I build/make-space-data.py <내려받은 폴더>
  - hygdata_v41.csv : HYG 별 목록 v4.1 (David Nash/astronexus, CC BY-SA 4.0) https://github.com/astronexus/HYG-Database
  - constellations.lines.json, mw.json : d3-celestial (Olaf Frohn, BSD-3-Clause) https://github.com/ofrohn/d3-celestial
"""
import csv, json, sys, os, math

src = sys.argv[1]
out = os.path.join(os.path.dirname(__file__), '..', 'src', 'data')
os.makedirs(out, exist_ok=True)

# 1) 맨눈으로 보이는 별(겉보기 등급 6.0까지): [적경(도), 적위(도), 겉보기 등급, 색지수 B-V]
rows = list(csv.DictReader(open(os.path.join(src, 'hygdata_v41.csv'), encoding='utf8')))
stars = []
for r in rows:
    if r['proper'] == 'Sol' or not r['mag']:
        continue
    mag = float(r['mag'])
    if mag > 6.0:
        continue
    ci = float(r['ci']) if r['ci'] else 0.6
    stars.append([round(float(r['ra']) * 15, 2), round(float(r['dec']), 2), round(mag, 2), round(ci, 2)])
stars.sort(key=lambda s: s[2])
with open(os.path.join(out, 'sky-stars.js'), 'w', encoding='utf8') as f:
    f.write('// 맨눈으로 보이는 별(겉보기 등급 6.0까지) %d개: [적경(도), 적위(도), 겉보기 등급, 색지수 B−V]. 밝은 별부터.\n' % len(stars))
    f.write('// 출처: HYG 별 목록 v4.1 (David Nash/astronexus), CC BY-SA 4.0 · build/make-space-data.py로 만들었어요.\n')
    f.write('export const SKY_STARS = ' + json.dumps(stars, separators=(',', ':')) + ';\n')

# 2) 별자리 선(88개 전체, 좌표는 소수 둘째 자리까지)
lines = json.load(open(os.path.join(src, 'constellations.lines.json'), encoding='utf8'))
con = {}
for feat in lines['features']:
    con[feat['id']] = [[[round(x, 2), round(y, 2)] for x, y in seg] for seg in feat['geometry']['coordinates']]
with open(os.path.join(out, 'constellation-lines.js'), 'w', encoding='utf8') as f:
    f.write('// 별자리 선: { 별자리 약자: [[[적경(도, −180~180), 적위(도)], …], …] }\n')
    f.write('// 출처: d3-celestial (Olaf Frohn), BSD-3-Clause · build/make-space-data.py로 만들었어요.\n')
    f.write('export const CONSTELLATION_LINES = ' + json.dumps(con, separators=(',', ':')) + ';\n')

# 3) 은하수 윤곽(밝기 단계 5개): 점을 줄여 가볍게
def thin(ring, step):
    pts = ring[::step]
    if pts[-1] != ring[-1]:
        pts.append(ring[-1])
    return [[round(x, 1), round(y, 1)] for x, y in pts]
mw = json.load(open(os.path.join(src, 'mw.json'), encoding='utf8'))
levels = []
for feat in mw['features']:
    polys = []
    for poly in feat['geometry']['coordinates']:
        for ring in poly:
            if len(ring) > 40:
                polys.append(thin(ring, max(1, len(ring) // 50)))
    levels.append(polys)
with open(os.path.join(out, 'milky-way-outline.js'), 'w', encoding='utf8') as f:
    f.write('// 하늘에서 본 은하수의 윤곽: 밝기 단계 5개(어두움 → 밝음)마다 [[적경(도), 적위(도)], …] 고리들.\n')
    f.write('// 출처: d3-celestial (Olaf Frohn), BSD-3-Clause · build/make-space-data.py로 만들었어요.\n')
    f.write('export const MILKY_WAY_OUTLINE = ' + json.dumps(levels, separators=(',', ':')) + ';\n')
print(len(stars), 'stars;', len(con), 'constellations;', [len(l) for l in levels], 'mw rings')
