"""Évènements historiques : année | nom | lat,lon (vide si non localisable) | rayon km | niveau | ~ si date approximative."""
import json
EV = """
-3300|Invention de l'écriture à Uruk (Mésopotamie)|31.32,45.64|30|2|~
-2560|Construction de la grande pyramide de Khéops|29.979,31.134|0|1|~
-776|Premiers Jeux olympiques antiques|37.638,21.630|0|2|
-753|Fondation légendaire de Rome|41.890,12.492|0|1|
-490|Bataille de Marathon|38.118,23.978|0|2|
-480|Bataille des Thermopyles|38.796,22.537|0|2|
-331|Bataille de Gaugamèles (Alexandre bat Darius III)|36.36,43.25|30|2|
-221|Qin Shi Huang unifie la Chine|34.33,108.71|60|2|
-218|Hannibal franchit les Alpes|45.2,6.9|100|2|
-52|Bataille d'Alésia|47.537,4.500|0|1|
-44|Assassinat de Jules César|41.895,12.477|0|1|
79|Éruption du Vésuve, destruction de Pompéi|40.749,14.485|0|1|
476|Chute de l'Empire romain d'Occident (Ravenne)|44.418,12.204|0|2|
496|Baptême de Clovis à Reims|49.254,4.034|0|2|~
622|Hégire : Mahomet quitte La Mecque pour Médine|24.468,39.611|0|2|
732|Bataille de Poitiers (Charles Martel)|46.70,0.40|30|2|
800|Couronnement de Charlemagne empereur à Rome|41.902,12.454|0|1|
1066|Bataille d'Hastings|50.912,0.487|0|1|
1095|Appel à la première croisade à Clermont|45.778,3.087|0|2|
1099|Prise de Jérusalem par les croisés|31.778,35.235|0|2|
1206|Gengis Khan proclamé grand khan des Mongols|48.5,109.0|300|2|
1215|Signature de la Magna Carta|51.444,-0.565|0|2|
1271|Départ de Marco Polo de Venise vers la Chine|45.438,12.335|0|2|
1347|La peste noire atteint l'Europe (Messine)|38.19,15.55|0|2|
1429|Jeanne d'Arc délivre Orléans|47.903,1.909|0|1|
1453|Prise de Constantinople par les Ottomans|41.009,28.980|0|1|
1455|Impression de la Bible de Gutenberg à Mayence|49.999,8.271|0|1|~
1492|Christophe Colomb atteint l'Amérique|24.1,-74.5|0|1|
1498|Vasco de Gama atteint l'Inde|11.258,75.780|0|2|
1515|Bataille de Marignan|45.36,9.32|0|1|
1517|Luther publie ses 95 thèses|51.866,12.646|0|1|
1519|Départ de l'expédition de Magellan|36.78,-6.35|0|2|
1521|Chute de Tenochtitlan (Cortés)|19.433,-99.133|0|2|
1532|Pizarro capture l'empereur inca Atahualpa|-7.164,-78.51|0|2|
1571|Bataille de Lépante|38.25,21.1|50|2|
1572|Massacre de la Saint-Barthélemy|48.859,2.341|0|2|
1588|Défaite de l'Invincible Armada|50.4,-1.5|200|2|
1598|Édit de Nantes|47.218,-1.554|0|2|
1610|Assassinat d'Henri IV|48.860,2.345|0|2|
1620|Arrivée du Mayflower en Amérique|41.958,-70.662|0|2|
1648|Traités de Westphalie|51.962,7.626|0|2|
1682|Louis XIV installe la cour à Versailles|48.805,2.120|0|2|
1683|Siège de Vienne par les Ottomans|48.21,16.37|0|2|
1755|Tremblement de terre de Lisbonne|38.72,-9.14|0|2|
1776|Déclaration d'indépendance des États-Unis|39.949,-75.150|0|1|
1789|Prise de la Bastille|48.853,2.369|0|1|
1793|Exécution de Louis XVI|48.865,2.321|0|2|
1798|Bataille des Pyramides (campagne d'Égypte)|30.06,31.2|20|2|
1804|Sacre de Napoléon à Notre-Dame|48.853,2.350|0|1|
1805|Bataille d'Austerlitz|49.13,16.76|0|1|
1812|Napoléon entre dans Moscou en flammes|55.75,37.62|0|2|
1815|Bataille de Waterloo|50.68,4.41|0|1|
1821|Mort de Napoléon à Sainte-Hélène|-15.96,-5.70|0|2|
1848|Abolition de l'esclavage dans les colonies françaises||0|2|
1859|Darwin publie L'Origine des espèces||0|2|
1861|Début de la guerre de Sécession (Fort Sumter)|32.752,-79.875|0|2|
1865|Assassinat d'Abraham Lincoln|38.897,-77.026|0|2|
1867|Les États-Unis achètent l'Alaska à la Russie|64.0,-152.0|700|2|
1869|Ouverture du canal de Suez|30.6,32.3|80|1|
1871|Commune de Paris|48.86,2.35|0|2|
1883|Éruption du Krakatoa|-6.10,105.42|0|2|
1884|Conférence de Berlin sur le partage de l'Afrique|52.51,13.38|0|2|
1889|Inauguration de la tour Eiffel|48.858,2.294|0|1|
1895|Première projection des frères Lumière|48.871,2.331|0|2|
1896|Premiers Jeux olympiques modernes|37.968,23.741|0|1|
1903|Premier vol motorisé des frères Wright|36.019,-75.668|0|1|
1905|Loi de séparation des Églises et de l'État||0|2|
1906|Séisme de San Francisco|37.77,-122.42|0|2|
1911|Amundsen atteint le pôle Sud||0|2|
1912|Naufrage du Titanic|41.726,-49.948|0|1|
1914|Assassinat de François-Ferdinand à Sarajevo|43.858,18.428|0|1|
1916|Bataille de Verdun|49.160,5.384|30|1|
1917|Révolution d'Octobre (Petrograd)|59.940,30.314|0|1|
1918|Armistice de la Grande Guerre (Rethondes)|49.427,2.906|0|1|
1928|Découverte de la pénicilline|51.517,-0.174|0|2|
1929|Krach de Wall Street|40.706,-74.011|0|1|
1939|Invasion de la Pologne, début de la Seconde Guerre mondiale|54.407,18.669|0|1|
1940|Appel du 18 Juin (de Gaulle à Londres)|51.518,-0.143|0|1|
1941|Attaque de Pearl Harbor|21.365,-157.950|0|1|
1942|Début de la bataille de Stalingrad|48.708,44.513|0|1|
1944|Débarquement en Normandie|49.37,-0.87|50|1|
1945|Bombe atomique sur Hiroshima|34.395,132.454|0|1|
1947|Indépendance de l'Inde|28.656,77.241|0|2|
1948|Création de l'État d'Israël|32.067,34.776|0|2|
1949|Proclamation de la République populaire de Chine|39.905,116.391|0|1|
1953|Première ascension de l'Everest|27.988,86.925|0|1|
1955|Rosa Parks refuse de céder sa place|32.377,-86.309|0|2|
1957|Lancement de Spoutnik|45.92,63.34|0|2|
1957|Signature du traité de Rome (naissance de la CEE)|41.893,12.483|0|2|
1961|Construction du mur de Berlin|52.516,13.378|0|1|
1962|Indépendance de l'Algérie|36.75,3.06|0|2|
1963|Assassinat de John F. Kennedy|32.779,-96.809|0|1|
1968|Mai 68|48.849,2.343|0|2|
1969|Lancement d'Apollo 11 (premiers pas sur la Lune)|28.573,-80.649|0|1|
1975|Chute de Saïgon|10.777,106.695|0|2|
1979|Révolution iranienne|35.69,51.39|0|2|
1981|Abolition de la peine de mort en France||0|2|
1986|Catastrophe de Tchernobyl|51.389,30.099|0|1|
1989|Chute du mur de Berlin|52.516,13.378|0|1|
1990|Libération de Nelson Mandela|-33.85,18.98|20|2|
1991|Dislocation de l'URSS|55.752,37.617|0|2|
1994|Génocide des Tutsi au Rwanda|-1.95,30.06|100|2|
1997|Rétrocession de Hong Kong à la Chine|22.30,114.17|0|2|
1998|La France championne du monde de football|48.924,2.360|0|1|
2001|Attentats du 11 septembre|40.712,-74.013|0|1|
2002|Mise en circulation des pièces et billets en euros||0|1|
2004|Tsunami dans l'océan Indien|3.316,95.854|200|2|
2007|Présentation du premier iPhone|37.784,-122.401|0|2|
2011|Catastrophe nucléaire de Fukushima|37.421,141.033|0|1|
2019|Incendie de Notre-Dame de Paris|48.853,2.350|0|1|
"""
out = []
for line in EV.strip().splitlines():
    y, n, ll, r, l, ap = line.split('|')
    lat = lon = None
    if ll: lat, lon = map(float, ll.split(','))
    out.append({'y': int(y), 'n': n, 'lat': lat, 'lon': lon, 'r': float(r), 'l': int(l), 'ap': ap == '~'})
json.dump(out, open('history.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print(len(out), 'évènements,', sum(e['lat'] is not None for e in out), 'localisés,', sum(e['l'] == 1 for e in out), 'niveau classique')
