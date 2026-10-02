import unittest
from audit import classify

def venue(name,vertical='activities'):
 return {'name':name,'discovery_vertical':vertical}
def source(cat,atype=None):return [{'source_category':cat,'source_accommodation_type':atype,'crm_category':None}]
class SafetyTests(unittest.TestCase):
 def test_hospitality_false_positives(self):
  for name,category in [('Bar Estadio','bar'),('BAR PISCINA MUNICIPAL','Bar'),('Cafetería Hospital Universitario','cafe'),('Bar Garaje','Bar'),('BAR AYUNTAMIENTO','Bar'),('CAMPO DE FUTBOL DE ZARATAN','Bar')]:
   with self.subTest(name=name):self.assertEqual(classify(venue(name),source(category))['action'],'KEEP')
 def test_ambiguous_hospitality_category_never_hidden(self):
  for name in ['FARMACIA DE GUARDIA','HOSPITAL VIEJO']:
   self.assertEqual(classify(venue(name),source('Bar'))['action'],'REVIEW')
 def test_heritage(self):
  for name,cat in [('Hospital de El Salvador','attraction'),('Hospital Vell - Museu de la Patum','museum'),('Hospital de Nuestra Señora de la Piedad','monastery')]:
   with self.subTest(name=name):self.assertEqual(classify(venue(name),source(cat))['action'],'KEEP')
 def test_lodging_is_not_proven_from_name(self):
  for n in ['Hostal Restaurante Oleo','Hotel Restaurant Picnic','Albergue de Peregrinos La Parada']:
   self.assertEqual(classify(venue(n),source('restaurant'))['action'],'REVIEW')
 def test_existing_accommodation_preserved(self):
  r=classify(venue('Airport Hotel','accommodation'),source('hotel','hotel'));self.assertEqual(r['action'],'KEEP')
 def test_source_confirmed_lodging_candidate(self):
  self.assertEqual(classify(venue('Example Stay'),source('hotel','hotel'))['action'],'MOVE TO AKIDUERMO')
 def test_sports_not_blanket_hidden(self):
  self.assertEqual(classify(venue('Campo de Fútbol Malaka'),source('sports_centre'))['action'],'REVIEW')
  self.assertEqual(classify(venue('Club Padel Costa'),source('sports_centre'))['action'],'KEEP')
 def test_chains_searchable_proposal(self):
  r=classify(venue("McDonald's"),source('fast_food'));self.assertEqual(r['action'],'DOWNRANK');self.assertEqual(r['chain_name'],"McDonald's")
  self.assertEqual(classify(venue('Bar Burger King Tribute'),source('bar'))['action'],'KEEP')
 def test_ambiguous_brand(self):
  self.assertEqual(classify(venue('Viena'),source('restaurant'))['action'],'REVIEW')
 def test_unrelated_brand_prefix(self):
  self.assertEqual(classify(venue('Goiko Bodegoia'),source('restaurant'))['action'],'REVIEW')
 def test_multi_branch_listing(self):
  self.assertEqual(classify(venue("McDonald's Estadio, McDonald's Centro Comercial"),source('restaurant'))['action'],'REVIEW')
 def test_ownership(self):
  self.assertEqual(classify(venue('Burger King'),source('fast_food'),True)['action'],'REVIEW')
 def test_closed_toponym_and_temporary(self):
  self.assertNotEqual(classify(venue('Centro Deportivo Cerrado de Calderón'),source('sports_centre'))['action'],'CLOSED/ARCHIVE CANDIDATE')
  self.assertEqual(classify(venue('Hotel X CERRADO TEMPORALMENTE','accommodation'),source('hotel','hotel'))['action'],'REVIEW')
  self.assertEqual(classify(venue('BAR X (cese del titular)'),source('Bar'))['action'],'REVIEW')
  self.assertEqual(classify(venue('RAUDA(CERRADO)'),source('Restaurante'))['action'],'CLOSED/ARCHIVE CANDIDATE')
 def test_infrastructure_needs_source(self):
  self.assertEqual(classify(venue('Ayuntamiento de Beceite'),source('townhall'))['action'],'HIDE')
  self.assertEqual(classify(venue('Zara'),source('restaurant'))['action'],'REVIEW')
  self.assertEqual(classify(venue('Farmacia de Example'),source('pharmacy'))['action'],'REVIEW')
 def test_no_evidence_requires_review(self):self.assertEqual(classify(venue('Unidentified place'),[])['action'],'REVIEW')
if __name__=='__main__':unittest.main()
