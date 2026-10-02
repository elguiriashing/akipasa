#!/usr/bin/env python3
"""AkiPasa relevance audit v1. Offline/read-only; never applies classifications."""
import argparse, collections, csv, glob, hashlib, html, itertools, json, math, pathlib, re, unicodedata
from urllib.parse import urlparse
from difflib import SequenceMatcher
VERSION='1.0.0'
def norm(s):
 s=''.join(c for c in unicodedata.normalize('NFKD',s or '') if not unicodedata.combining(c)).lower()
 return re.sub(r'[^a-z0-9]+',' ',s).strip()
def hit(pattern,s): return bool(re.search(pattern,s))
def distance(a,b):
 la,lo=a;lb,lob=b
 p=math.pi/180;dlat=(lb-la)*p;dlon=(lob-lo)*p
 return 6371*2*math.asin(min(1,math.sqrt(math.sin(dlat/2)**2+math.cos(la*p)*math.cos(lb*p)*math.sin(dlon/2)**2)))
FOOD=r'\b(bar|bars|restaurante?|restaurant|restauracion|cafeteria|cafe|coffee|pub|gastrobar|taberna|tavern|cerveceria|pizzeria|asador|bistro|chiringuito|meson|kebab|burger|heladeria|ice cream|fast food|biergarten|salon banquete)\b'
LODGING=r'\b(hotels?|hostals?|hostel|albergue|aparthotel|apartamentos?|apartaments|casa rural|casas rurales|camping|campings|camp site|guest house|pension|hospederia|alojamiento|motel|turisme rural)\b'
SPORT=r'\b(campo de futbol|estadio|stadium|polideportivo|pabellon|piscinas? municipales?|ciudad deportiva|pista de atletismo|complejo deportivo|instalaciones deportivas)\b'
EXPERIENCE=r'\b(padel|tenis|tennis|golf|surf|karting|escalada|climbing|rocodromo|bowling|bolera|escape|paintball|trampoline|buceo|diving|aventura|kayak|yoga|dojo|fitboxing|kung fu|kunf fu|artes marciales|boxing|boxeo|pilates|crossfit|dance|danza|ballet)\b'
ATTRACTION=r'\b(museo|museum|castillo|castle|mirador|viewpoint|catedral|cathedral|monumento|monument|acuario|aquarium|zoo|zoologico|botanico|botanical|teatro|theatre|cinema|cine|auditorio|concert|planetario|planetarium)\b'
INFRA={
 'public_infrastructure':r'\b(ayuntamiento|policia|guardia civil|juzgado|tribunal|oficina de correos|administracion publica|tanatorio|funeraria|subestacion|depuradora|central electrica)\b',
 'healthcare':r'\b(hospital|farmacia|pharmacy|clinica|centro de salud|dentista|dental|consultorio|medico)\b',
 'education':r'\b(colegio|universidad|university|instituto|escuela|school|academia)\b',
 'banking':r'\b(caixabank|bbva|banco santander|banco sabadell|bankinter|unicaja|cajero|banco|bank|atm)\b',
 'transport':r'\b(aeropuerto|airport|estacion de tren|estacion de autobuses|parking|aparcamiento|renfe|adif)\b',
 'vehicle_service':r'\b(gasolinera|repsol|cepsa|bp|petrol|concesionario|taller mecanico|lavado de coches|automoviles|neumaticos)\b',
 'retail':r'\b(mercadona|carrefour|lidl|aldi|supermercado|supermarket|zara|primark|decathlon|ikea|leroy merlin|mediamarkt|media markt|el corte ingles|eroski|alcampo|consum|bricomart|bricodepot|obramat|vodafone|movistar|electronica|tienda de ropa|muebles)\b',
 'professional_service':r'\b(inmobiliaria|estate agent|gestoria|abogados|solicitor|asesoria|contabilidad|seguros|insurance|notaria|agencia de viajes|peluqueria|barberia|lavanderia|mensajeria|logistica|almacen|fabrica|industrial|oficinas)\b',
 'shopping_centre':r'\b(centro comercial|shopping centre|shopping center|mall)\b'
}
# Distinctive anchored brand patterns. Counts are candidates, not externally verified branches.
BRANDS=[]
def brand(label,pattern,kind='hospitality',scope='national_or_regional'):
 BRANDS.append({'name':label,'pattern':pattern,'kind':kind,'scope':scope})
for label,pat in [('Burger King','burger king'),("McDonald's",r'mc ?donald ?s?'),('KFC',r'kfc|kentucky fried chicken'),('Starbucks','starbucks'),("Domino's",r'domino ?s?(?: pizza)?'),('Telepizza','telepizza'),('100 Montaditos','(?:cerveceria )?100 montaditos'),("Foster's Hollywood",r'foster ?s? hollywood'),('VIPS',r'vips(?: smart)?'),('Ginos','ginos'),('Taco Bell','taco bell'),('Subway','subway'),('Pizza Hut','pizza hut'),('La Tagliatella','la tagliatella'),('Goiko','goiko(?: grill)?'),('Granier','(?:panaderia )?granier'),("Papa John's",r'papa john ?s?'),('Santagloria','santagloria'),('Popeyes','popeyes'),('Rodilla','rodilla'),('Honest Greens','honest greens'),('Saona',r'(?:restaurante )?saona'),('Aloha Poké','aloha poke'),('Llaollao','llaollao'),('UDON','udon'),('The Good Burger',r'the good burger|tgb'),('Grosso Napoletano','grosso napoletano'),('Five Guys','five guys'),('Jijonenca','(?:heladeria )?jijonenca'),('Viena',r'viena'),('Vivari','vivari'),('Pizzería Carlos',r'pizzeria carlos'),('Buenas Migas','buenas migas'),('La Sureña',r'(?:cerveceria )?la surena'),('Muerde la Pasta','muerde la pasta'),('Tierra Burrito','tierra burrito'),('Tim Hortons','tim hortons'),('Dunkin',r'dunkin(?: donuts)?'),('Manolo Bakes','manolo bakes')]:
 brand(label,pat,scope='international' if label in ['Burger King',"McDonald's",'KFC','Starbucks',"Domino's",'Taco Bell','Subway','Pizza Hut',"Papa John's",'Popeyes','Five Guys','Tim Hortons','Dunkin'] else 'national_or_regional')
for label,pat in [('Lizarran','lizarran'),('Pans & Company','pans(?: and)? company'),('Ribs','ribs'),('La Mafia','la mafia'),('La Piemontesa','la piemontesa'),('Wok to Walk','wok to walk'),('MasQMenos',r'mas ?q ?menos'),('Enrique Tomás','enrique tomas'),('Levaduramadre','levaduramadre'),('Sushisom','sushisom'),('Sushiko','sushiko'),("Carl’s Jr",r'carl ?s? jr'),('Volapié',r'(?:taberna )?volapie')]:brand(label,pat)
for label,pat in [('Go Fit','go fit'),('Synergym','synergym'),('VivaGym',r'viva ?gym'),('Basic-Fit',r'basic fit'),('Brooklyn Fitboxing','brooklyn fitboxing'),('McFIT','mcfit'),('Altafit','altafit'),('Fitness Park','fitness park'),('Anytime Fitness','anytime fitness'),('Dreamfit','dreamfit'),('Metropolitan','metropolitan')]:brand(label,pat,'fitness')
for label,pat in [('Yelmo',r'(?:cines? )?yelmo'),('Cinesa','cinesa'),('Kinépolis',r'(?:cines? )?kinepolis'),('Ilusiona','ilusiona'),('Ocine','ocine')]:brand(label,pat,'entertainment')
for label,pat in [('NH Hotels',r'nh(?: collection)?'),('Meliá',r'melia'),('Barceló',r'barcelo'),('Iberostar','iberostar'),('RIU','riu'),('H10','h10'),('Vincci','vincci'),('Sercotel','sercotel'),('Eurostars','eurostars'),('Ibis','ibis'),('Paradores',r'parador(?: de)?'),('AC Hotels',r'ac hotel'),('Hilton','hilton'),('Marriott','marriott'),('Travelodge','travelodge'),('B&B Hotels',r'b b hotel')]:brand(label,pat,'hotel')
SOURCE_ATTR={'museum','attraction','zoo','theme park','water park','aquarium','planetarium','monastery','place of worship'}
SOURCE_CULT={'theatre','arts centre','gallery','cinema','music venue','exhibition centre','events venue','conference centre','community centre','library'}
SOURCE_ACTIVITY={'escape game','golf course','amusement arcade','bowling alley','trampoline park','miniature golf','casino','dance','dancing school','dance school','dojo','yoga','surf school','public bath','spa'}
SOURCE_BAD={'townhall':'public_infrastructure','hospital':'healthcare','pharmacy':'healthcare','college':'education','university':'education','school':'education','training':'education','commercial':'retail','building':'public_infrastructure','drinking water':'public_infrastructure','telephone':'public_infrastructure','music school':'education'}

def classify(v,cats,protected=False):
 n=norm(v['name']);cs={norm(c['source_category']) for c in cats if c.get('source_category')};food=hit(FOOD,n);lodging=hit(LODGING,n);sports=hit(SPORT,n)
 b=next((b for b in BRANDS if hit(r'^(?:(?:hotel|hoteles|restaurante|restaurant|cafe|cafeteria|cerveceria|gimnasio|gym) )?(?:'+b['pattern']+r')(?:\b|$)',n)),None)
 r={'action':'KEEP','relevance_class':'core_venue','confidence':'medium','reason':'Source hospitality category supports existing discovery; not independently verified.','chain_name':b['name'] if b else '', 'chain_kind':b['kind'] if b else '', 'chain_scope':b['scope'] if b else '', 'source_categories':' | '.join(sorted(cs)), 'flags':[],'recommendation_weight':1.0,'proposed_vertical':v['discovery_vertical'],'review_status':'proposed'}
 infra=[k for k,p in INFRA.items() if hit(p,n)]
 if len(n.replace(' ',''))<=2:r['flags'].append('short_name')
 if n in {'sense especificar','sin especificar','sin nombre','unknown','no name','n a','bar','cafe','hotel','restaurante','restaurant','hostal','cafeteria'}:r['flags'].append('generic_name')
 if hit(r'\b(cerrado|closed|cese|cesado|traspaso|clausurado)\b',n) and 'cerrado de calderon' not in n:r['flags'].append('closure_name_signal')
 if not cats or not cs:r['flags'].append('missing_source_category')
 if protected:r['flags'].append('protected_owned_or_claimed')
 if v['discovery_vertical']=='accommodation':
  r.update(relevance_class='accommodation',confidence='high',reason='Existing accommodation vertical; preserved in AkiDuermo.',recommendation_weight=1.0)
  if cs and any(hit(FOOD,c) for c in cs) and not any(c.get('source_accommodation_type') for c in cats):r['flags'].append('reverse_accommodation_conflict')
 elif any(c.get('source_accommodation_type') for c in cats):
  r.update(action='MOVE TO AKIDUERMO',relevance_class='accommodation',confidence='high',reason='Original source accommodation type contradicts current activities vertical.',proposed_vertical='accommodation')
 elif lodging:
  r.update(action='REVIEW',relevance_class='needs_review',confidence='low',reason='Accommodation name conflicts with non-accommodation source; could be hotel restaurant. Verify distinct consumer offerings before any move.')
  r['flags'].append('accommodation_name_conflict')
 elif cs & SOURCE_ATTR:
  r.update(relevance_class='attraction',reason='Original attraction/museum/religious-heritage category; preserve tourism value.')
 elif cs & SOURCE_CULT:
  r.update(relevance_class='culture_entertainment',reason='Original culture/entertainment category supports discovery.')
 elif cs & SOURCE_ACTIVITY or any('turismo activo' in c or c.startswith('aiat') for c in cs):
  r.update(relevance_class='sports_activity' if hit(EXPERIENCE,n) else 'activity',reason='Original recreational/experience category supports discovery.')
 elif 'sports centre' in cs:
  if sports:r.update(action='REVIEW',relevance_class='sports_infrastructure',reason='Sports source plus municipal/infrastructure name. Check booking, tours and events before downranking/hiding.')
  elif hit(EXPERIENCE,n):r.update(relevance_class='sports_activity',reason='Sports source and consumer activity name; retain, booking not independently verified.')
  else:r.update(action='REVIEW',relevance_class='sports_activity',reason='Sports-centre source; discoverable consumer offering not established.')
 elif 'fitness centre' in cs:
  r.update(action='KEEP' if hit(EXPERIENCE,n) else 'DOWNRANK',relevance_class='sports_activity',reason='Fitness source; specialist experience retained, general fitness proposed lower weighting.',recommendation_weight=1.0 if hit(EXPERIENCE,n) else .6)
 elif cs & SOURCE_BAD.keys():
  k=next(SOURCE_BAD[c] for c in sorted(cs) if c in SOURCE_BAD)
  confirmed= k in infra and not food and not hit(ATTRACTION,n)
  r.update(action='HIDE' if confirmed and k not in {'healthcare','education'} else 'REVIEW',relevance_class=k,confidence='high' if confirmed else 'low',reason='Non-discovery source category; matching name supports hide candidate.' if confirmed else 'Non-discovery source, but historic building/visitor activity or category error must be ruled out.')
 elif infra and not food:
  r.update(action='REVIEW',relevance_class=infra[0],confidence='low',reason='Name suggests non-core category but source does not confirm it; never hide from this name match.')
 elif any(hit(FOOD,c) or c=='nightclub' for c in cs):pass
 else:r.update(action='REVIEW',relevance_class='needs_review',confidence='low',reason='Insufficient or unrecognized source evidence; retain existing behaviour pending review.')
 if b:
  if b['kind']=='hospitality' and r['action']=='KEEP' and r['relevance_class']=='core_venue':
   r.update(action='DOWNRANK',relevance_class='hospitality_chain',confidence='medium',reason='Distinctive brand-name pattern plus hospitality source; keep searchable, propose lower recommendation weight.',recommendation_weight=.35 if b['scope']=='international' else .65)
  elif b['kind']=='fitness' and r['action']=='DOWNRANK':r['recommendation_weight']=.5
  elif b['kind']=='hotel' and v['discovery_vertical']=='activities':r['flags'].append('hotel_group_activity_listing')
 if r['flags'] and any(f in r['flags'] for f in ['short_name','generic_name','reverse_accommodation_conflict']):
  r.update(action='REVIEW',confidence='low',reason=r['reason']+' Name/data quality requires human review.')
 if 'closure_name_signal' in r['flags']:
  r.update(action='REVIEW' if hit(r'\b(titular|temporalmente|provisionalmente|traspaso)\b',n) or n=='closed' else 'CLOSED/ARCHIVE CANDIDATE',confidence='low',reason='Name contains historical closure/operator-change signal; not evidence of current closure. Verify before archiving.')
 if b and b['name'] in {'Viena','Metropolitan'} and r['action']=='DOWNRANK':r.update(action='REVIEW',confidence='low',reason='Common-word brand candidate; branch identity must be verified before chain weighting.')
 if b and b['name']=='Goiko' and 'bodegoia' in n:r.update(action='REVIEW',confidence='low',reason='Goiko Bodegoia may be an unrelated Basque business; brand prefix is not enough to downrank.')
 if b and len(re.findall(b['pattern'],n))>1:
  r['flags'].append('multiple_branches_in_one_name');r.update(action='REVIEW',reason='Name appears to aggregate multiple branches; verify venue grain before recommendation weighting.')
 if protected and r['action']!='KEEP':r.update(action='REVIEW',reason=r['reason']+' Owned/claimed record: explicit owner-aware review required.')
 return r

def writecsv(path,rows):
 rows=list(rows)
 if not rows:path.write_text('');return
 with path.open('w',newline='',encoding='utf-8-sig') as f:
  w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader()
  for r in rows:
   # Prevent formula execution when CSV is opened in a spreadsheet.
   w.writerow({k:("'"+str(v) if isinstance(v,str) and v and v[:1] in '=+-@' else v) for k,v in r.items()})
def main():
 p=argparse.ArgumentParser();p.add_argument('--input',default='../raw');p.add_argument('--output',default='../output');a=p.parse_args();root=pathlib.Path(a.input);out=pathlib.Path(a.output);out.mkdir(parents=True,exist_ok=True)
 venues=sum([json.loads(p.read_text()) for p in sorted(root.glob('venues-*.json'))],[]);sources={r['id']:r['categories'] for p in root.glob('source-*.json') for r in json.loads(p.read_text())};cities={r['id']:r for r in json.loads((root/'cities.json').read_text())};protected={r['venue_id'] for r in json.loads((root/'protected.json').read_text())}
 assert len(venues)==len({v['id'] for v in venues}), 'Duplicate export IDs'
 assert len(sources)==len(venues), 'Source join coverage incomplete'
 rows=[];byid={v['id']:v for v in venues}
 for v in venues:
  c=classify(v,sources[v['id']],v['id'] in protected);city=cities.get(v['city_id']);d=distance((v['latitude'],v['longitude']),(city['latitude'],city['longitude'])) if city else None
  flags=c.pop('flags');valid=-90<=v['latitude']<=90 and -180<=v['longitude']<=180
  if not valid:flags.append('invalid_coordinates')
  # Coarse envelope screens only; includes Portugal/France/offshore and is not a country boundary.
  if not ((35.7<=v['latitude']<=44.0 and -9.6<=v['longitude']<=4.5) or (27.4<=v['latitude']<=29.6 and -18.3<=v['longitude']<=-13.2) or (35.85<=v['latitude']<=35.95 and -5.4<=v['longitude']<=-5.25) or (35.25<=v['latitude']<=35.32 and -3.0<=v['longitude']<=-2.9)):flags.append('outside_coarse_spain_envelope')
  if d is None:flags.append('missing_city')
  elif d>50:flags.append('over_50km_from_city_center')
  if not v['address'] or norm(v['address']) in {'espana','spain','sin direccion','unknown'}:flags.append('generic_address')
  rows.append({'id':v['id'],'name':v['name'],'slug':v['slug'],'city':city['name_es'] if city else '', 'city_slug':city['slug'] if city else '', 'address':v['address'],'latitude':v['latitude'],'longitude':v['longitude'],'current_vertical':v['discovery_vertical'],**c,'flags':' | '.join(flags),'city_distance_km':round(d,2) if d is not None else '', 'input_updated_at':v['updated_at']})
 writecsv(out/'all-venues-dry-run.csv',rows);writecsv(out/'review-and-change-candidates.csv',[r for r in rows if r['action']!='KEEP']);writecsv(out/'accommodation-name-conflicts.csv',[r for r in rows if 'accommodation_name_conflict' in r['flags']]);writecsv(out/'geographic-flags.csv',[r for r in rows if any(f in r['flags'] for f in ['outside_coarse','over_50km','invalid_coordinates','generic_address','missing_city'])])
 actions=collections.Counter(r['action'] for r in rows);classes=collections.Counter(r['relevance_class'] for r in rows);brands=collections.Counter((r['chain_name'],r['chain_kind'],r['chain_scope']) for r in rows if r['chain_name']);brandrows=[{'brand':b,'kind':k,'scope':s,'name_match_records':n} for (b,k,s),n in brands.most_common()];writecsv(out/'chain-inventory.csv',brandrows)
 repeat=collections.defaultdict(list);coords=collections.defaultdict(list);address=collections.defaultdict(list)
 for v in venues:
  repeat[norm(v['name'])].append(v);coords[(v['latitude'],v['longitude'])].append(v)
  if v['address']:address[norm(v['address'])].append(v)
 dup=[];seen=set()
 for group in repeat.values():
  if len(group)<2:continue
  for x,y in itertools.combinations(group,2):
   dist=distance((x['latitude'],x['longitude']),(y['latitude'],y['longitude']))*1000
   sameaddress=norm(x['address'])==norm(y['address']) and bool(x['address'])
   if dist<=50 or sameaddress:
    seen.add(tuple(sorted([x['id'],y['id']])));dup.append({'id_a':x['id'],'id_b':y['id'],'name_a':x['name'],'name_b':y['name'],'distance_m':round(dist,2),'same_normalized_address':sameaddress,'same_city_id':x['city_id']==y['city_id'],'same_vertical':x['discovery_vertical']==y['discovery_vertical'],'reason':'Normalized identical name plus proximity or identical address; candidate only.','address_a':x['address'],'address_b':y['address']})
 # Alternate spellings: same normalized address or exact point plus strong name similarity.
 for group in list(address.values())+list(coords.values()):
  for x,y in itertools.combinations(group,2):
   pair=tuple(sorted([x['id'],y['id']]))
   if pair in seen:continue
   nx,ny=norm(x['name']),norm(y['name'])
   if min(len(nx),len(ny))<5 or SequenceMatcher(None,nx,ny).ratio()<.88:continue
   seen.add(pair)
   dup.append({'id_a':x['id'],'id_b':y['id'],'name_a':x['name'],'name_b':y['name'],'distance_m':round(distance((x['latitude'],x['longitude']),(y['latitude'],y['longitude']))*1000,2),'same_normalized_address':norm(x['address'])==norm(y['address']) and bool(x['address']),'same_city_id':x['city_id']==y['city_id'],'same_vertical':x['discovery_vertical']==y['discovery_vertical'],'reason':'Exact shared coordinate/address plus name similarity >=0.88; alternate-spelling candidate only.','address_a':x['address'],'address_b':y['address']})
 writecsv(out/'duplicate-candidate-pairs.csv',dup)
 clusters=[{'latitude':la,'longitude':lo,'records':len(g),'distinct_names':len({norm(v['name']) for v in g}),'examples':' | '.join(v['name'] for v in g[:6]),'ids':' | '.join(v['id'] for v in g)} for (la,lo),g in sorted(coords.items(),key=lambda t:-len(t[1])) if len(g)>=5];writecsv(out/'coordinate-clusters.csv',clusters)
 repeated=[{'normalized_name':n,'records':len(g),'distinct_city_ids':len({v['city_id'] for v in g}),'known_brand_candidate':any(norm(b['name'])==n for b in BRANDS),'examples':' | '.join(v['name'] for v in g[:3])} for n,g in sorted(repeat.items(),key=lambda t:-len(t[1])) if len(g)>=5];writecsv(out/'repeated-name-discovery.csv',repeated)
 sourcecount=collections.Counter(c['source_category'] for cs in sources.values() for c in cs if c['source_category']);writecsv(out/'source-category-inventory.csv',[{'source_category':k,'records':n} for k,n in sourcecount.most_common()])
 patterns={**INFRA,'sports_infrastructure_name':SPORT,'accommodation_name':LODGING,'attraction_name':ATTRACTION,'wellness_name':r'\b(spa|wellness|balneario|thermal|termas)\b','fitness_name':r'\b(gym|gimnasio|fitness|fitboxing|crossfit|yoga|pilates)\b'}
 signals=[];details=[]
 for label,pattern in patterns.items():
  matches=[r for r in rows if hit(pattern,norm(r['name']))]
  signals.append({'signal':label,'name_matches':len(matches),'activities':sum(r['current_vertical']=='activities' for r in matches),'accommodation':sum(r['current_vertical']=='accommodation' for r in matches),'keep':sum(r['action']=='KEEP' for r in matches),'review':sum(r['action']=='REVIEW' for r in matches),'hide':sum(r['action']=='HIDE' for r in matches)})
  for r in matches:details.append({'signal':label,'id':r['id'],'name':r['name'],'source_categories':r['source_categories'],'current_vertical':r['current_vertical'],'proposed_action':r['action'],'reason':r['reason']})
 writecsv(out/'name-signal-summary.csv',signals);writecsv(out/'name-signal-matches.csv',details)
 facts={'version':VERSION,'total':len(rows),'unique_ids':len(byid),'source_matched':sum(bool(s) for s in sources.values()),'source_missing':sum(not s for s in sources.values()),'verticals':dict(collections.Counter(v['discovery_vertical'] for v in venues)),'actions':dict(actions),'classes':dict(classes),'chains':brandrows,'flags':dict(collections.Counter(f for r in rows for f in r['flags'].split(' | ') if f)),'duplicate_candidate_pairs':len(dup),'duplicate_candidate_venues':len({id for p in dup for id in [p['id_a'],p['id_b']]}),'coordinate_clusters_5_plus':len(clusters),'largest_coordinate_cluster':max([x['records'] for x in clusters],default=0),'websites':sum(bool(v['website_url']) for v in venues),'description_counts':collections.Counter(v['description_en'] for v in venues).most_common(3),'city_records':len(cities),'duplicate_city_name_groups':sum(n>1 for n in collections.Counter(norm(c['name_es']) for c in cities.values()).values()),'source_accommodation_leakage':sum(v['discovery_vertical']=='activities' and any(c['source_accommodation_type'] for c in sources[v['id']]) for v in venues),'input_sha256':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(root.glob('*.json'))}}
 (out/'summary.json').write_text(json.dumps(facts,indent=2,ensure_ascii=False))
 (out/'representative-samples.json').write_text(json.dumps({c:[r for r in rows if r['relevance_class']==c][:12] for c in classes},indent=2,ensure_ascii=False))
 print(json.dumps({k:v for k,v in facts.items() if k not in ['input_sha256','description_counts','chains']},indent=2))
if __name__=='__main__':main()
