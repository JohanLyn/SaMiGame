# Pakker apps/host/dist-demo til én selvstændig HTML-fil (inline JS/CSS + latin-fonte som woff2).
#   npm run build:demo -w @samigame/host && python3 scripts/pack-demo.py apps/host/dist-demo sami-party.html
import base64, glob, os, re, sys
d = sys.argv[1]; out = sys.argv[2]
js = open(glob.glob(f'{d}/assets/index-*.js')[0], encoding='utf-8').read()
css = open(glob.glob(f'{d}/assets/index-*.css')[0], encoding='utf-8').read()
def face(m):
    block = m.group(0)
    if re.search(r'(cyrillic|vietnamese|greek)', block): return ''
    block = re.sub(r',\s*url\(\./[^)]+\.woff\)\s*format\(["\']?woff["\']?\)', '', block)
    def inline(u):
        p = os.path.join(d, 'assets', u.group(1))
        return 'url(data:font/woff2;base64,' + base64.b64encode(open(p, 'rb').read()).decode() + ')'
    return re.sub(r'url\(\./([^)]+\.woff2)\)', inline, block)
css = re.sub(r'@font-face\{[^}]*\}', face, css)
assert './' not in re.sub(r'data:[^)]*', '', css), 'unresolved css url'
assert '</script' not in js
html = f'''<!doctype html>
<html lang="da">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>SaMi Party</title>
<style>
  /* Fuldskærms spilscene: ét mørkt look (scenen er altid nat-blå bag spillets lærred). */
  :root {{ --stage: #12103a; color-scheme: dark; }}
  html, body {{ height: 100%; margin: 0; background: var(--stage); overflow: hidden; }}
  #game {{ width: 100%; height: 100%; }}
  {css}
</style>
</head>
<body>
<div id="game"></div>
<script type="module">
{js}
</script>
</body>
</html>
'''
open(out, 'w', encoding='utf-8').write(html)
print(len(html.encode()), 'bytes')
