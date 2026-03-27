import re

with open("cont.html", "r", encoding='utf-8') as f:
    text = f.read()

text_cont = re.sub(r'\s*<!-- ══════════════════════════════════\s*DASHBOARD CETĂȚEAN[\s\S]*?</div><!-- /sectiune-dashboard -->', '', text)
with open("cont.html", "w", encoding='utf-8') as f:
    f.write(text_cont)

with open("citizen.html", "r", encoding='utf-8') as f:
    text = f.read()

text_cit = re.sub(r'\s*<!-- ══════════════════════════════════\s*SECȚIUNEA DE AUTENTIFICARE[\s\S]*?</div><!-- /sectiune-auth -->', '', text)
text_cit = text_cit.replace('id="sectiune-dashboard" class="dashboard-container d-none"', 'id="sectiune-dashboard" class="dashboard-container"')
text_cit = text_cit.replace('<title>Contul Meu – CityFix Galați</title>', '<title>Dashboard Cetățean – CityFix Galați</title>')

with open("citizen.html", "w", encoding='utf-8') as f:
    f.write(text_cit)
