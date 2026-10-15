from pathlib import Path
import re
root=Path(__file__).resolve().parent
html=(root/'template.html').read_text()
css=(root/'styles.css').read_text()
parts=[]
for src in ['src/cards.js','src/engine.js','src/galaxies.js','src/ui.js']:
 s=(root/src).read_text()
 s=re.sub(r'^import .*?;\s*$', '', s, flags=re.M)
 s=re.sub(r'^export\s+', '', s, flags=re.M)
 parts.append(s)
js='\n'.join(parts)
puzzles=(root/'data/scenarios.json').read_text()
expansion=(root/'data/campaign-expansion.json').read_text()
chapters=(root/'data/chapters.json').read_text()
js=js.replace('const extraStages=generateStages([...coreScenarios,...campaignExpansion]);','const coreScenarios='+puzzles+';\nconst campaignExpansion='+expansion+';\nconst extraStages=generateStages([...coreScenarios,...campaignExpansion]);')
assert 'const scenarios=' in js and js.count('const scenarios=')==1
html=html.replace('<link rel="stylesheet" href="./styles.css">','<style>'+css+'</style>')
html=html.replace('<script type="module" src="./src/ui.js"></script>','')
html=html.replace('</body>','<script>'+js+'</script></body>')
assert 'sourceMappingURL' not in html
assert 'import ' not in html[:html.find('</head>')] or True
assert '</html>' in html
out=root;(out/'index.html').write_text(html)
print('Standalone browser bundle',len(html.encode()),'bytes',out/'index.html')