"""Ajoute capitales (FR) et micro-États à countries.json."""
import json
CAP = dict(x.split(':') for x in """AF:Kaboul|ZA:Pretoria|AL:Tirana|DZ:Alger|DE:Berlin|AD:Andorre-la-Vieille|AO:Luanda|AG:Saint John's|SA:Riyad|AR:Buenos Aires|AM:Erevan|AU:Canberra|AT:Vienne|AZ:Bakou|BS:Nassau|BH:Manama|BD:Dacca|BB:Bridgetown|BE:Bruxelles|BZ:Belmopan|BT:Thimphou|MM:Naypyidaw|BY:Minsk|BO:Sucre|BA:Sarajevo|BW:Gaborone|BN:Bandar Seri Begawan|BR:Brasília|BG:Sofia|BF:Ouagadougou|BI:Gitega|BJ:Porto-Novo|KH:Phnom Penh|CM:Yaoundé|CA:Ottawa|CV:Praia|CF:Bangui|CL:Santiago|CN:Pékin|CY:Nicosie|CO:Bogota|KM:Moroni|KP:Pyongyang|KR:Séoul|CR:San José|HR:Zagreb|CU:La Havane|CI:Yamoussoukro|DK:Copenhague|DJ:Djibouti|DM:Roseau|ES:Madrid|EE:Tallinn|SZ:Mbabane|FJ:Suva|FI:Helsinki|FR:Paris|GA:Libreville|GM:Banjul|GH:Accra|GD:Saint-Georges|GR:Athènes|GT:Guatemala|GN:Conakry|GQ:Malabo|GW:Bissau|GY:Georgetown|GE:Tbilissi|HT:Port-au-Prince|HN:Tegucigalpa|HU:Budapest|IN:New Delhi|ID:Jakarta|IQ:Bagdad|IR:Téhéran|IE:Dublin|IS:Reykjavik|IT:Rome|JM:Kingston|JP:Tokyo|JO:Amman|KZ:Astana|KE:Nairobi|KG:Bichkek|KI:Tarawa-Sud|XK:Pristina|KW:Koweït|LA:Vientiane|LS:Maseru|LV:Riga|LB:Beyrouth|LR:Monrovia|LY:Tripoli|LI:Vaduz|LT:Vilnius|LU:Luxembourg|MK:Skopje|MG:Antananarivo|MY:Kuala Lumpur|MW:Lilongwe|ML:Bamako|MT:La Valette|MA:Rabat|MU:Port-Louis|MR:Nouakchott|MX:Mexico|MD:Chișinău|MN:Oulan-Bator|ME:Podgorica|MZ:Maputo|NA:Windhoek|NI:Managua|NE:Niamey|NG:Abuja|NO:Oslo|NZ:Wellington|NP:Katmandou|OM:Mascate|UG:Kampala|UZ:Tachkent|PK:Islamabad|PW:Ngerulmud|PA:Panama|PG:Port Moresby|PY:Asuncion|NL:Amsterdam|PH:Manille|PL:Varsovie|PT:Lisbonne|PE:Lima|QA:Doha|CD:Kinshasa|RO:Bucarest|GB:Londres|RU:Moscou|RW:Kigali|DO:Saint-Domingue|CG:Brazzaville|KN:Basseterre|VC:Kingstown|LC:Castries|SV:San Salvador|WS:Apia|ST:São Tomé|RS:Belgrade|SC:Victoria|SL:Freetown|SG:Singapour|SK:Bratislava|SI:Ljubljana|SO:Mogadiscio|SD:Khartoum|SS:Djouba|LK:Sri Jayawardenapura Kotte|CH:Berne|SR:Paramaribo|SE:Stockholm|SY:Damas|SN:Dakar|TJ:Douchanbé|TZ:Dodoma|TW:Taipei|TD:N'Djaména|CZ:Prague|TH:Bangkok|TL:Dili|TG:Lomé|TO:Nukuʻalofa|TT:Port-d'Espagne|TN:Tunis|TM:Achgabat|TR:Ankara|UA:Kiev|UY:Montevideo|VU:Port-Vila|VE:Caracas|VN:Hanoï|YE:Sanaa|ZM:Lusaka|ZW:Harare|EG:Le Caire|AE:Abou Dabi|EC:Quito|ER:Asmara|FM:Palikir|US:Washington|ET:Addis-Abeba|SB:Honiara|MC:Monaco|VA:Vatican|SM:Saint-Marin|MV:Malé|MH:Majuro|TV:Funafuti""".split('|'))
# Territoires non souverains présents dans les frontières : exclus des drapeaux/capitales
NOT_STATE = {'AW', 'CW', 'GL', 'HK', 'JE', 'AX', 'IM', 'FK'}
MICRO = [  # trop petits pour une silhouette, mais OK pour drapeaux et capitales
    ('MC', 'Monaco', 'Europe', 7.42, 43.74), ('VA', 'Vatican', 'Europe', 12.45, 41.9),
    ('SM', 'Saint-Marin', 'Europe', 12.46, 43.94), ('MV', 'Maldives', 'Asia', 73.5, 4.2),
    ('MH', 'Îles Marshall', 'Oceania', 171.2, 7.1), ('TV', 'Tuvalu', 'Oceania', 179.2, -8.5),
    ('NR', 'Nauru', 'Oceania', 166.93, -0.53)]

d = json.load(open('countries.json'))
ids = {r['id'] for r in d}
for iso, n, k, lon, lat in MICRO:
    if iso not in ids:
        d.append({'id': iso, 'n': n, 'k': k, 'r': '', 't': 1, 'c': [lon, lat], 'a': 0, 'vb': None, 'd': None})
for r in d:
    r['s'] = 1 if (r['t'] and r['id'] not in NOT_STATE) else 0   # État (pour drapeaux)
    if r['s'] and r['id'] in CAP:
        r['cap'] = CAP[r['id']]
    else:
        r.pop('cap', None)
missing = [r['n'] for r in d if r['s'] and 'cap' not in r]
print('États sans capitale :', missing)
d.sort(key=lambda r: r['n'])
with open('countries.json', 'w') as fo:
    fo.write('[\n' + ',\n'.join(json.dumps(r, ensure_ascii=False, separators=(',', ':')) for r in d) + '\n]\n')
print(len(d), 'entrées,', sum(r['s'] for r in d), 'États,', sum('cap' in r for r in d), 'capitales')
