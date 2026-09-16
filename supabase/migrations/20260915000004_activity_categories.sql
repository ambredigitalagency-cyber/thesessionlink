-- =============================================================================
-- Activity categories.
-- Adding a niche = inserting a row here. No schema change, ever.
--
-- config.suggested_fields pre-fills the offer form; the pro can remove them or
-- add free-form custom fields. Everything ends up in offers.custom_fields.
-- Field types: text | textarea | number | select | images
-- =============================================================================

insert into public.activity_categories (slug, name, icon, position, config) values

('fitness-coach',
 '{"en":"Fitness coach","fr":"Coach sportif"}',
 'dumbbell', 10,
 '{"default_action_type":"calendar_booking","suggested_fields":[
   {"key":"format","type":"select","label":{"en":"Format","fr":"Format"},"options":[
     {"value":"in_person","label":{"en":"In person","fr":"En présentiel"}},
     {"value":"online","label":{"en":"Online","fr":"En ligne"}},
     {"value":"at_home","label":{"en":"At your home","fr":"À domicile"}}]},
   {"key":"location","type":"text","label":{"en":"Location","fr":"Lieu"},"placeholder":{"en":"Gym, park, studio…","fr":"Salle, parc, studio…"}},
   {"key":"level","type":"select","label":{"en":"Level","fr":"Niveau"},"options":[
     {"value":"all","label":{"en":"All levels","fr":"Tous niveaux"}},
     {"value":"beginner","label":{"en":"Beginner","fr":"Débutant"}},
     {"value":"intermediate","label":{"en":"Intermediate","fr":"Intermédiaire"}},
     {"value":"advanced","label":{"en":"Advanced","fr":"Avancé"}}]},
   {"key":"group_size","type":"number","unit":"people","label":{"en":"Group size","fr":"Taille du groupe"}}
 ]}'),

('life-coach',
 '{"en":"Life & business coach","fr":"Coach de vie & business"}',
 'compass', 20,
 '{"default_action_type":"calendar_booking","suggested_fields":[
   {"key":"format","type":"select","label":{"en":"Format","fr":"Format"},"options":[
     {"value":"online","label":{"en":"Video call","fr":"Visio"}},
     {"value":"in_person","label":{"en":"In person","fr":"En présentiel"}},
     {"value":"phone","label":{"en":"Phone","fr":"Téléphone"}}]},
   {"key":"focus","type":"text","label":{"en":"Focus","fr":"Thématique"},"placeholder":{"en":"Career change, confidence…","fr":"Reconversion, confiance…"}},
   {"key":"program_length","type":"text","label":{"en":"Program length","fr":"Durée du programme"},"placeholder":{"en":"6 sessions over 3 months","fr":"6 séances sur 3 mois"}},
   {"key":"languages","type":"text","label":{"en":"Languages","fr":"Langues"}}
 ]}'),

('real-estate',
 '{"en":"Real estate agent","fr":"Agent immobilier"}',
 'building-2', 30,
 '{"default_action_type":"direct_reservation","suggested_fields":[
   {"key":"transaction","type":"select","label":{"en":"Transaction","fr":"Transaction"},"options":[
     {"value":"sale","label":{"en":"For sale","fr":"À vendre"}},
     {"value":"rent","label":{"en":"For rent","fr":"À louer"}}]},
   {"key":"property_type","type":"select","label":{"en":"Property type","fr":"Type de bien"},"options":[
     {"value":"apartment","label":{"en":"Apartment","fr":"Appartement"}},
     {"value":"house","label":{"en":"House","fr":"Maison"}},
     {"value":"land","label":{"en":"Land","fr":"Terrain"}},
     {"value":"commercial","label":{"en":"Commercial","fr":"Local commercial"}}]},
   {"key":"surface","type":"number","unit":"m²","label":{"en":"Surface","fr":"Surface"}},
   {"key":"rooms","type":"number","label":{"en":"Rooms","fr":"Pièces"}},
   {"key":"bedrooms","type":"number","label":{"en":"Bedrooms","fr":"Chambres"}},
   {"key":"energy_rating","type":"select","label":{"en":"Energy rating","fr":"DPE"},"options":[
     {"value":"A","label":{"en":"A","fr":"A"}},{"value":"B","label":{"en":"B","fr":"B"}},
     {"value":"C","label":{"en":"C","fr":"C"}},{"value":"D","label":{"en":"D","fr":"D"}},
     {"value":"E","label":{"en":"E","fr":"E"}},{"value":"F","label":{"en":"F","fr":"F"}},
     {"value":"G","label":{"en":"G","fr":"G"}}]},
   {"key":"address","type":"text","label":{"en":"Address or area","fr":"Adresse ou quartier"}},
   {"key":"gallery","type":"images","label":{"en":"Photo gallery","fr":"Galerie photos"}}
 ]}'),

('hairdresser',
 '{"en":"Hairdresser & barber","fr":"Coiffeur & barbier"}',
 'scissors', 40,
 '{"default_action_type":"calendar_booking","suggested_fields":[
   {"key":"place","type":"select","label":{"en":"Where","fr":"Lieu"},"options":[
     {"value":"salon","label":{"en":"At the salon","fr":"Au salon"}},
     {"value":"at_home","label":{"en":"At your home","fr":"À domicile"}}]},
   {"key":"hair_length","type":"select","label":{"en":"Hair length","fr":"Longueur de cheveux"},"options":[
     {"value":"any","label":{"en":"Any length","fr":"Toutes longueurs"}},
     {"value":"short","label":{"en":"Short","fr":"Courts"}},
     {"value":"medium","label":{"en":"Medium","fr":"Mi-longs"}},
     {"value":"long","label":{"en":"Long","fr":"Longs"}}]},
   {"key":"includes","type":"textarea","label":{"en":"What is included","fr":"Ce qui est inclus"},"placeholder":{"en":"Shampoo, cut, blow-dry…","fr":"Shampoing, coupe, brushing…"}}
 ]}'),

('beauty',
 '{"en":"Beauty, nails & makeup","fr":"Beauté, ongles & maquillage"}',
 'sparkles', 50,
 '{"default_action_type":"calendar_booking","suggested_fields":[
   {"key":"technique","type":"text","label":{"en":"Technique","fr":"Technique"},"placeholder":{"en":"Gel, semi-permanent…","fr":"Gel, semi-permanent…"}},
   {"key":"place","type":"select","label":{"en":"Where","fr":"Lieu"},"options":[
     {"value":"salon","label":{"en":"At the salon","fr":"En institut"}},
     {"value":"at_home","label":{"en":"At your home","fr":"À domicile"}}]},
   {"key":"includes","type":"textarea","label":{"en":"What is included","fr":"Ce qui est inclus"}}
 ]}'),

('wellness',
 '{"en":"Massage & wellness","fr":"Massage & bien-être"}',
 'flower-2', 60,
 '{"default_action_type":"calendar_booking","suggested_fields":[
   {"key":"technique","type":"text","label":{"en":"Technique","fr":"Technique"},"placeholder":{"en":"Swedish, deep tissue, shiatsu…","fr":"Suédois, deep tissue, shiatsu…"}},
   {"key":"place","type":"select","label":{"en":"Where","fr":"Lieu"},"options":[
     {"value":"studio","label":{"en":"At the studio","fr":"Au cabinet"}},
     {"value":"at_home","label":{"en":"At your home","fr":"À domicile"}},
     {"value":"online","label":{"en":"Online","fr":"En ligne"}}]},
   {"key":"focus","type":"text","label":{"en":"Good for","fr":"Recommandé pour"},"placeholder":{"en":"Back tension, recovery…","fr":"Tensions dorsales, récupération…"}}
 ]}'),

('music-teacher',
 '{"en":"Music teacher","fr":"Professeur de musique"}',
 'music', 70,
 '{"default_action_type":"calendar_booking","suggested_fields":[
   {"key":"instrument","type":"text","label":{"en":"Instrument","fr":"Instrument"}},
   {"key":"level","type":"select","label":{"en":"Level","fr":"Niveau"},"options":[
     {"value":"all","label":{"en":"All levels","fr":"Tous niveaux"}},
     {"value":"beginner","label":{"en":"Beginner","fr":"Débutant"}},
     {"value":"intermediate","label":{"en":"Intermediate","fr":"Intermédiaire"}},
     {"value":"advanced","label":{"en":"Advanced","fr":"Avancé"}}]},
   {"key":"format","type":"select","label":{"en":"Format","fr":"Format"},"options":[
     {"value":"in_person","label":{"en":"In person","fr":"En présentiel"}},
     {"value":"online","label":{"en":"Online","fr":"En ligne"}}]},
   {"key":"age_group","type":"text","label":{"en":"Age group","fr":"Public"},"placeholder":{"en":"Kids, teens, adults","fr":"Enfants, ados, adultes"}}
 ]}'),

('tutor',
 '{"en":"Tutor & private teacher","fr":"Professeur particulier"}',
 'graduation-cap', 80,
 '{"default_action_type":"calendar_booking","suggested_fields":[
   {"key":"subject","type":"text","label":{"en":"Subject","fr":"Matière"}},
   {"key":"grade_level","type":"text","label":{"en":"Level","fr":"Niveau scolaire"},"placeholder":{"en":"Middle school, high school…","fr":"Collège, lycée…"}},
   {"key":"format","type":"select","label":{"en":"Format","fr":"Format"},"options":[
     {"value":"online","label":{"en":"Online","fr":"En ligne"}},
     {"value":"in_person","label":{"en":"In person","fr":"En présentiel"}},
     {"value":"at_home","label":{"en":"At your home","fr":"À domicile"}}]},
   {"key":"group_size","type":"number","unit":"students","label":{"en":"Students per session","fr":"Élèves par séance"}}
 ]}'),

('photographer',
 '{"en":"Photographer & video","fr":"Photographe & vidéaste"}',
 'camera', 90,
 '{"default_action_type":"quote_request","suggested_fields":[
   {"key":"session_type","type":"text","label":{"en":"Session type","fr":"Type de séance"},"placeholder":{"en":"Wedding, portrait, product…","fr":"Mariage, portrait, produit…"}},
   {"key":"shooting_time","type":"text","label":{"en":"Shooting time","fr":"Temps de prise de vue"},"placeholder":{"en":"2 hours","fr":"2 heures"}},
   {"key":"deliverables","type":"text","label":{"en":"Deliverables","fr":"Livrables"},"placeholder":{"en":"30 edited photos","fr":"30 photos retouchées"}},
   {"key":"location","type":"text","label":{"en":"Location","fr":"Lieu"}},
   {"key":"gallery","type":"images","label":{"en":"Portfolio","fr":"Portfolio"}}
 ]}'),

('therapist',
 '{"en":"Therapist & counselling","fr":"Thérapeute & accompagnement"}',
 'heart-handshake', 100,
 '{"default_action_type":"calendar_booking","suggested_fields":[
   {"key":"approach","type":"text","label":{"en":"Approach","fr":"Approche"},"placeholder":{"en":"CBT, hypnotherapy…","fr":"TCC, hypnose…"}},
   {"key":"format","type":"select","label":{"en":"Format","fr":"Format"},"options":[
     {"value":"in_person","label":{"en":"In person","fr":"En cabinet"}},
     {"value":"online","label":{"en":"Video call","fr":"Visio"}},
     {"value":"phone","label":{"en":"Phone","fr":"Téléphone"}}]},
   {"key":"first_session","type":"textarea","label":{"en":"How the first session works","fr":"Déroulé de la première séance"}}
 ]}'),

('consultant',
 '{"en":"Consultant & freelance","fr":"Consultant & freelance"}',
 'briefcase', 110,
 '{"default_action_type":"quote_request","suggested_fields":[
   {"key":"deliverables","type":"textarea","label":{"en":"Deliverables","fr":"Livrables"}},
   {"key":"turnaround","type":"text","label":{"en":"Turnaround","fr":"Délai"},"placeholder":{"en":"5 business days","fr":"5 jours ouvrés"}},
   {"key":"format","type":"select","label":{"en":"Format","fr":"Format"},"options":[
     {"value":"remote","label":{"en":"Remote","fr":"À distance"}},
     {"value":"on_site","label":{"en":"On site","fr":"Sur site"}},
     {"value":"hybrid","label":{"en":"Hybrid","fr":"Hybride"}}]}
 ]}'),

('rental',
 '{"en":"Rental & venue","fr":"Location & espace"}',
 'key-round', 120,
 '{"default_action_type":"direct_reservation","suggested_fields":[
   {"key":"capacity","type":"number","unit":"people","label":{"en":"Capacity","fr":"Capacité"}},
   {"key":"location","type":"text","label":{"en":"Location","fr":"Lieu"}},
   {"key":"included","type":"textarea","label":{"en":"What is included","fr":"Ce qui est inclus"}},
   {"key":"gallery","type":"images","label":{"en":"Photo gallery","fr":"Galerie photos"}}
 ]}'),

('other',
 '{"en":"Something else","fr":"Autre activité"}',
 'shapes', 999,
 '{"default_action_type":"contact_request","suggested_fields":[]}')

on conflict (slug) do update
  set name = excluded.name,
      icon = excluded.icon,
      position = excluded.position,
      config = excluded.config;
