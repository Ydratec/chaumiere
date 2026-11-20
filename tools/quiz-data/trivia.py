"""Monnaie, langues officielles/principales, indicatif téléphonique, domaine internet."""
import json
T = """
AF|Afghani|Pachto,Dari|93
ZA|Rand|Zoulou,Xhosa,Afrikaans,Anglais|27
AL|Lek|Albanais|355
DZ|Dinar algérien|Arabe,Tamazight|213
DE|Euro|Allemand|49
AD|Euro|Catalan|376
AO|Kwanza|Portugais|244
AG|Dollar des Caraïbes orientales|Anglais|1
SA|Riyal saoudien|Arabe|966
AR|Peso argentin|Espagnol|54
AM|Dram|Arménien|374
AU|Dollar australien|Anglais|61
AT|Euro|Allemand|43
AZ|Manat azerbaïdjanais|Azéri|994
BS|Dollar bahaméen|Anglais|1
BH|Dinar bahreïni|Arabe|973
BD|Taka|Bengali|880
BB|Dollar barbadien|Anglais|1
BE|Euro|Néerlandais,Français,Allemand|32
BZ|Dollar bélizien|Anglais|501
BT|Ngultrum|Dzongkha|975
MM|Kyat|Birman|95
BY|Rouble biélorusse|Biélorusse,Russe|375
BO|Boliviano|Espagnol,Quechua,Aymara|591
BA|Mark convertible|Bosnien,Croate,Serbe|387
BW|Pula|Anglais,Tswana|267
BN|Dollar de Brunei|Malais|673
BR|Real|Portugais|55
BG|Euro|Bulgare|359
BF|Franc CFA|Français|226
BI|Franc burundais|Kirundi,Français|257
BJ|Franc CFA|Français|229
KH|Riel|Khmer|855
CM|Franc CFA|Français,Anglais|237
CA|Dollar canadien|Anglais,Français|1
CV|Escudo cap-verdien|Portugais|238
CF|Franc CFA|Français,Sango|236
CL|Peso chilien|Espagnol|56
CN|Yuan|Mandarin|86
CY|Euro|Grec,Turc|357
CO|Peso colombien|Espagnol|57
KM|Franc comorien|Comorien,Arabe,Français|269
KP|Won nord-coréen|Coréen|850
KR|Won sud-coréen|Coréen|82
CR|Colón|Espagnol|506
HR|Euro|Croate|385
CU|Peso cubain|Espagnol|53
CI|Franc CFA|Français|225
DK|Couronne danoise|Danois|45
DJ|Franc djiboutien|Français,Arabe|253
DM|Dollar des Caraïbes orientales|Anglais|1
ES|Euro|Espagnol|34
EE|Euro|Estonien|372
SZ|Lilangeni|Swati,Anglais|268
FJ|Dollar fidjien|Anglais,Fidjien,Hindi|679
FI|Euro|Finnois,Suédois|358
FR|Euro|Français|33
GA|Franc CFA|Français|241
GM|Dalasi|Anglais|220
GH|Cedi|Anglais|233
GD|Dollar des Caraïbes orientales|Anglais|1
GR|Euro|Grec|30
GT|Quetzal|Espagnol|502
GN|Franc guinéen|Français|224
GQ|Franc CFA|Espagnol,Français,Portugais|240
GW|Franc CFA|Portugais|245
GY|Dollar guyanien|Anglais|592
GE|Lari|Géorgien|995
HT|Gourde|Français,Créole haïtien|509
HN|Lempira|Espagnol|504
HU|Forint|Hongrois|36
IN|Roupie indienne|Hindi,Anglais|91
ID|Roupie indonésienne|Indonésien|62
IQ|Dinar irakien|Arabe,Kurde|964
IR|Rial iranien|Persan|98
IE|Euro|Irlandais,Anglais|353
IS|Couronne islandaise|Islandais|354
IL|Shekel|Hébreu|972
IT|Euro|Italien|39
JM|Dollar jamaïcain|Anglais|1
JP|Yen|Japonais|81
JO|Dinar jordanien|Arabe|962
KZ|Tenge|Kazakh,Russe|7
KE|Shilling kényan|Swahili,Anglais|254
KG|Som|Kirghiz,Russe|996
KI|Dollar australien|Anglais,Gilbertin|686
XK|Euro|Albanais,Serbe|383
KW|Dinar koweïtien|Arabe|965
LA|Kip|Lao|856
LS|Loti|Sotho,Anglais|266
LV|Euro|Letton|371
LB|Livre libanaise|Arabe|961
LR|Dollar libérien|Anglais|231
LY|Dinar libyen|Arabe|218
LI|Franc suisse|Allemand|423
LT|Euro|Lituanien|370
LU|Euro|Luxembourgeois,Français,Allemand|352
MK|Denar|Macédonien,Albanais|389
MG|Ariary|Malgache,Français|261
MY|Ringgit|Malais|60
MW|Kwacha malawien|Anglais,Chichewa|265
ML|Franc CFA|Bambara,Français|223
MT|Euro|Maltais,Anglais|356
MA|Dirham marocain|Arabe,Tamazight|212
MU|Roupie mauricienne|Anglais,Français,Créole mauricien|230
MR|Ouguiya|Arabe|222
MX|Peso mexicain|Espagnol|52
MD|Leu moldave|Roumain|373
MN|Tugrik|Mongol|976
ME|Euro|Monténégrin|382
MZ|Metical|Portugais|258
NA|Dollar namibien|Anglais|264
NI|Córdoba|Espagnol|505
NE|Franc CFA|Français|227
NG|Naira|Anglais|234
NO|Couronne norvégienne|Norvégien|47
NZ|Dollar néo-zélandais|Anglais,Maori|64
NP|Roupie népalaise|Népalais|977
OM|Rial omanais|Arabe|968
UG|Shilling ougandais|Anglais,Swahili|256
UZ|Sum|Ouzbek|998
PK|Roupie pakistanaise|Ourdou,Anglais|92
PW|Dollar américain|Paluan,Anglais|680
PS|Shekel|Arabe|970
PA|Balboa|Espagnol|507
PG|Kina|Tok pisin,Anglais,Hiri motu|675
PY|Guaraní|Espagnol,Guarani|595
NL|Euro|Néerlandais|31
PH|Peso philippin|Filipino,Anglais|63
PL|Złoty|Polonais|48
PT|Euro|Portugais|351
PE|Sol|Espagnol,Quechua,Aymara|51
QA|Riyal qatari|Arabe|974
CD|Franc congolais|Français,Lingala,Swahili|243
RO|Leu roumain|Roumain|40
GB|Livre sterling|Anglais|44
RU|Rouble|Russe|7
RW|Franc rwandais|Kinyarwanda,Français,Anglais,Swahili|250
DO|Peso dominicain|Espagnol|1
CG|Franc CFA|Français,Lingala|242
KN|Dollar des Caraïbes orientales|Anglais|1
VC|Dollar des Caraïbes orientales|Anglais|1
LC|Dollar des Caraïbes orientales|Anglais|1
SV|Dollar américain|Espagnol|503
WS|Tala|Samoan,Anglais|685
ST|Dobra|Portugais|239
RS|Dinar serbe|Serbe|381
SC|Roupie seychelloise|Créole seychellois,Anglais,Français|248
SL|Leone|Anglais|232
SG|Dollar de Singapour|Anglais,Malais,Mandarin,Tamoul|65
SK|Euro|Slovaque|421
SI|Euro|Slovène|386
SO|Shilling somalien|Somali,Arabe|252
SD|Livre soudanaise|Arabe,Anglais|249
SS|Livre sud-soudanaise|Anglais|211
LK|Roupie srilankaise|Cingalais,Tamoul|94
CH|Franc suisse|Allemand,Français,Italien,Romanche|41
SR|Dollar surinamais|Néerlandais|597
SE|Couronne suédoise|Suédois|46
SY|Livre syrienne|Arabe|963
SN|Franc CFA|Français,Wolof|221
TJ|Somoni|Tadjik|992
TZ|Shilling tanzanien|Swahili,Anglais|255
TW|Dollar taïwanais|Mandarin|886
TD|Franc CFA|Français,Arabe|235
CZ|Couronne tchèque|Tchèque|420
TH|Baht|Thaï|66
TL|Dollar américain|Tétoum,Portugais|670
TG|Franc CFA|Français|228
TO|Paʻanga|Tongien,Anglais|676
TT|Dollar de Trinité-et-Tobago|Anglais|1
TN|Dinar tunisien|Arabe|216
TM|Manat turkmène|Turkmène|993
TR|Livre turque|Turc|90
UA|Hryvnia|Ukrainien|380
UY|Peso uruguayen|Espagnol|598
VU|Vatu|Bichelamar,Anglais,Français|678
VE|Bolívar|Espagnol|58
VN|Dông|Vietnamien|84
YE|Rial yéménite|Arabe|967
ZM|Kwacha zambien|Anglais|260
ZW|Zimbabwe Gold (ZiG)|Anglais,Shona,Ndébélé|263
EG|Livre égyptienne|Arabe|20
AE|Dirham des Émirats|Arabe|971
EC|Dollar américain|Espagnol|593
ER|Nakfa|Tigrigna,Arabe,Anglais|291
FM|Dollar américain|Anglais|691
US|Dollar américain|Anglais|1
ET|Birr|Amharique|251
SB|Dollar des Îles Salomon|Anglais|677
MC|Euro|Français|377
VA|Euro|Italien,Latin|39
SM|Euro|Italien|378
MV|Rufiyaa|Divehi|960
MH|Dollar américain|Marshallais,Anglais|692
TV|Dollar australien|Tuvaluan,Anglais|688
NR|Dollar australien|Nauruan,Anglais|674
"""
rows = {}
for line in T.strip().splitlines():
    iso, cur, langs, tel = line.split('|')
    rows[iso] = (cur, langs.split(','), tel)
d = json.load(open('countries.json'))
for r in d:
    if r.get('s') and r['id'] in rows:
        cur, langs, tel = rows[r['id']]
        r['cur'] = cur; r['lang'] = langs; r['tel'] = '+' + tel
        r['tld'] = '.' + ('uk' if r['id'] == 'GB' else r['id'].lower())
miss = [r['n'] for r in d if r.get('s') and r['id'] not in rows]
print('sans données culture :', miss)
with open('countries.json', 'w') as fo:
    fo.write('[\n' + ',\n'.join(json.dumps(x, ensure_ascii=False, separators=(',', ':')) for x in d) + '\n]\n')
print(sum('cur' in r for r in d), 'pays avec monnaie/langue/indicatif')
