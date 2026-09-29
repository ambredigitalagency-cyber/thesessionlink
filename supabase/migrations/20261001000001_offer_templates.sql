-- =============================================================================
-- Offer templates: 2 to 4 ready-made details per activity × action type.
--
-- Stored next to suggested_fields in activity_categories.config, under
-- templates.<action_type>, in the same localized format. The offer builder
-- shows the template of the chosen action as a checklist, ticked by default;
-- nothing reaches an offer unless the coach keeps it. suggested_fields stay
-- as the "ideas" underneath.
--
-- Data only: no column, no function. A new category brings its templates in
-- its own row, like everything else in config.
-- =============================================================================

update public.activity_categories
   set config = jsonb_set(config, '{templates}', '{
  "calendar_booking": [
    {"key":"format","type":"select","label":{"en":"Format","fr":"Format"},"options":[{"value":"in_person","label":{"en":"In person","fr":"En présentiel"}},{"value":"online","label":{"en":"Online","fr":"En ligne"}},{"value":"at_home","label":{"en":"At your home","fr":"À domicile"}}]},
    {"key":"location","type":"text","label":{"en":"Location","fr":"Lieu"},"placeholder":{"en":"Gym, park, studio…","fr":"Salle, parc, studio…"}},
    {"key":"level","type":"select","label":{"en":"Level","fr":"Niveau"},"options":[{"value":"all","label":{"en":"All levels","fr":"Tous niveaux"}},{"value":"beginner","label":{"en":"Beginner","fr":"Débutant"}},{"value":"intermediate","label":{"en":"Intermediate","fr":"Intermédiaire"}},{"value":"advanced","label":{"en":"Advanced","fr":"Avancé"}}]},
    {"key":"equipment","type":"boolean","label":{"en":"Equipment provided","fr":"Matériel fourni"}}
  ],
  "direct_reservation": [
    {"key":"schedule","type":"time","mode":"range","label":{"en":"Time","fr":"Horaire"}},
    {"key":"location","type":"text","label":{"en":"Class location","fr":"Lieu du cours"},"placeholder":{"en":"Victoria Park, main gate","fr":"Parc des Buttes-Chaumont, entrée principale"}},
    {"key":"level","type":"select","label":{"en":"Level","fr":"Niveau"},"options":[{"value":"all","label":{"en":"All levels","fr":"Tous niveaux"}},{"value":"beginner","label":{"en":"Beginner","fr":"Débutant"}},{"value":"intermediate","label":{"en":"Intermediate","fr":"Intermédiaire"}},{"value":"advanced","label":{"en":"Advanced","fr":"Avancé"}}]},
    {"key":"bring","type":"text","label":{"en":"What to bring","fr":"À apporter"},"placeholder":{"en":"Mat, water bottle…","fr":"Tapis, bouteille d’eau…"}}
  ],
  "contact_request": [
    {"key":"goals","type":"multiselect","label":{"en":"Goals I work on","fr":"Objectifs accompagnés"},"options":[{"value":"weight_loss","label":{"en":"Weight loss","fr":"Perte de poids"}},{"value":"muscle","label":{"en":"Muscle gain","fr":"Prise de muscle"}},{"value":"fitness","label":{"en":"Getting back in shape","fr":"Remise en forme"}},{"value":"sport","label":{"en":"Sports preparation","fr":"Préparation sportive"}},{"value":"rehab","label":{"en":"Return from injury","fr":"Reprise après blessure"}}]},
    {"key":"format","type":"select","label":{"en":"Format","fr":"Format"},"options":[{"value":"in_person","label":{"en":"In person","fr":"En présentiel"}},{"value":"online","label":{"en":"Online","fr":"En ligne"}},{"value":"at_home","label":{"en":"At your home","fr":"À domicile"}}]},
    {"key":"area","type":"text","label":{"en":"Area covered","fr":"Zone d’intervention"},"placeholder":{"en":"Central London and nearby","fr":"Paris 11e et alentours"}}
  ],
  "whatsapp_direct": [
    {"key":"format","type":"select","label":{"en":"Format","fr":"Format"},"options":[{"value":"in_person","label":{"en":"In person","fr":"En présentiel"}},{"value":"online","label":{"en":"Online","fr":"En ligne"}},{"value":"at_home","label":{"en":"At your home","fr":"À domicile"}}]},
    {"key":"area","type":"text","label":{"en":"Area covered","fr":"Zone d’intervention"},"placeholder":{"en":"Central London and nearby","fr":"Paris 11e et alentours"}},
    {"key":"response_time","type":"select","label":{"en":"Usual response time","fr":"Délai de réponse habituel"},"options":[{"value":"hour","label":{"en":"Within the hour","fr":"Dans l’heure"}},{"value":"day","label":{"en":"Same day","fr":"Dans la journée"}},{"value":"two_days","label":{"en":"Within 48 hours","fr":"Sous 48 h"}}]}
  ],
  "quote_request": [
    {"key":"program_type","type":"select","label":{"en":"Programme type","fr":"Type de programme"},"options":[{"value":"personal","label":{"en":"Personal programme","fr":"Programme individuel"}},{"value":"corporate","label":{"en":"Corporate classes","fr":"Cours en entreprise"}},{"value":"event","label":{"en":"Event preparation","fr":"Préparation à un événement"}}]},
    {"key":"program_length","type":"text","label":{"en":"Programme length","fr":"Durée du programme"},"placeholder":{"en":"8 weeks, 2 sessions a week","fr":"8 semaines, 2 séances par semaine"}},
    {"key":"includes","type":"textarea","label":{"en":"What’s included","fr":"Ce qui est inclus"}}
  ]
}'::jsonb, true)
 where slug = 'fitness-coach';

update public.activity_categories
   set config = jsonb_set(config, '{templates}', '{
  "calendar_booking": [
    {"key":"format","type":"select","label":{"en":"Format","fr":"Format"},"options":[{"value":"online","label":{"en":"Video call","fr":"Visio"}},{"value":"in_person","label":{"en":"In person","fr":"En présentiel"}},{"value":"phone","label":{"en":"Phone","fr":"Téléphone"}}]},
    {"key":"focus","type":"text","label":{"en":"Focus","fr":"Thématique"},"placeholder":{"en":"Career change, confidence…","fr":"Reconversion, confiance…"}},
    {"key":"languages","type":"text","label":{"en":"Languages","fr":"Langues"},"placeholder":{"en":"English, French","fr":"Français, anglais"}}
  ],
  "direct_reservation": [
    {"key":"theme","type":"text","label":{"en":"Workshop theme","fr":"Thème de l’atelier"},"placeholder":{"en":"Daring to change paths","fr":"Oser changer de voie"}},
    {"key":"schedule","type":"time","mode":"range","label":{"en":"Time","fr":"Horaire"}},
    {"key":"location","type":"text","label":{"en":"Location","fr":"Lieu"},"placeholder":{"en":"Address, or video link sent the day before","fr":"Adresse ou lien visio envoyé la veille"}},
    {"key":"includes","type":"textarea","label":{"en":"What’s included","fr":"Ce qui est inclus"}}
  ],
  "contact_request": [
    {"key":"focus","type":"multiselect","label":{"en":"What I help with","fr":"Accompagnements"},"options":[{"value":"career","label":{"en":"Career change","fr":"Reconversion"}},{"value":"confidence","label":{"en":"Self-confidence","fr":"Confiance en soi"}},{"value":"new_role","label":{"en":"Stepping into a new role","fr":"Prise de poste"}},{"value":"business","label":{"en":"Starting a business","fr":"Création d’entreprise"}},{"value":"balance","label":{"en":"Work-life balance","fr":"Équilibre de vie"}}]},
    {"key":"format","type":"select","label":{"en":"Format","fr":"Format"},"options":[{"value":"online","label":{"en":"Video call","fr":"Visio"}},{"value":"in_person","label":{"en":"In person","fr":"En présentiel"}},{"value":"phone","label":{"en":"Phone","fr":"Téléphone"}}]},
    {"key":"free_call","type":"boolean","label":{"en":"Free first call","fr":"Premier échange offert"}}
  ],
  "whatsapp_direct": [
    {"key":"format","type":"select","label":{"en":"Format","fr":"Format"},"options":[{"value":"online","label":{"en":"Video call","fr":"Visio"}},{"value":"in_person","label":{"en":"In person","fr":"En présentiel"}},{"value":"phone","label":{"en":"Phone","fr":"Téléphone"}}]},
    {"key":"free_call","type":"boolean","label":{"en":"Free first call","fr":"Premier échange offert"}},
    {"key":"response_time","type":"select","label":{"en":"Usual response time","fr":"Délai de réponse habituel"},"options":[{"value":"hour","label":{"en":"Within the hour","fr":"Dans l’heure"}},{"value":"day","label":{"en":"Same day","fr":"Dans la journée"}},{"value":"two_days","label":{"en":"Within 48 hours","fr":"Sous 48 h"}}]}
  ],
  "quote_request": [
    {"key":"audience","type":"select","label":{"en":"For","fr":"Pour"},"options":[{"value":"individual","label":{"en":"Individual","fr":"Particulier"}},{"value":"team","label":{"en":"Team","fr":"Équipe"}},{"value":"leader","label":{"en":"Executive","fr":"Dirigeant"}}]},
    {"key":"program_length","type":"text","label":{"en":"Programme length","fr":"Durée du programme"},"placeholder":{"en":"6 sessions over 3 months","fr":"6 séances sur 3 mois"}},
    {"key":"deliverables","type":"textarea","label":{"en":"Deliverables","fr":"Livrables"},"placeholder":{"en":"Written review, action plan","fr":"Bilan écrit, plan d’action"}}
  ]
}'::jsonb, true)
 where slug = 'life-coach';

update public.activity_categories
   set config = jsonb_set(config, '{templates}', '{
  "calendar_booking": [
    {"key":"visit_type","type":"select","label":{"en":"Appointment type","fr":"Type de rendez-vous"},"options":[{"value":"visit","label":{"en":"Viewing","fr":"Visite du bien"}},{"value":"valuation","label":{"en":"Valuation","fr":"Estimation"}},{"value":"advice","label":{"en":"Advice","fr":"Conseil"}}]},
    {"key":"property_type","type":"select","label":{"en":"Property type","fr":"Type de bien"},"options":[{"value":"apartment","label":{"en":"Apartment","fr":"Appartement"}},{"value":"house","label":{"en":"House","fr":"Maison"}},{"value":"land","label":{"en":"Land","fr":"Terrain"}},{"value":"commercial","label":{"en":"Commercial","fr":"Local commercial"}}]},
    {"key":"address","type":"text","label":{"en":"Address or neighbourhood","fr":"Adresse ou quartier"},"placeholder":{"en":"Notting Hill, London","fr":"Quartier Saint-Michel, Bordeaux"}},
    {"key":"surface","type":"number","label":{"en":"Surface","fr":"Surface"},"unit":"m²"}
  ],
  "direct_reservation": [
    {"key":"transaction","type":"select","label":{"en":"Transaction","fr":"Transaction"},"options":[{"value":"sale","label":{"en":"For sale","fr":"À vendre"}},{"value":"rent","label":{"en":"For rent","fr":"À louer"}}]},
    {"key":"property_type","type":"select","label":{"en":"Property type","fr":"Type de bien"},"options":[{"value":"apartment","label":{"en":"Apartment","fr":"Appartement"}},{"value":"house","label":{"en":"House","fr":"Maison"}},{"value":"land","label":{"en":"Land","fr":"Terrain"}},{"value":"commercial","label":{"en":"Commercial","fr":"Local commercial"}}]},
    {"key":"surface","type":"number","label":{"en":"Surface","fr":"Surface"},"unit":"m²"},
    {"key":"rooms","type":"number","label":{"en":"Rooms","fr":"Pièces"}}
  ],
  "contact_request": [
    {"key":"transaction","type":"select","label":{"en":"Transaction","fr":"Transaction"},"options":[{"value":"sale","label":{"en":"For sale","fr":"À vendre"}},{"value":"rent","label":{"en":"For rent","fr":"À louer"}}]},
    {"key":"property_type","type":"select","label":{"en":"Property type","fr":"Type de bien"},"options":[{"value":"apartment","label":{"en":"Apartment","fr":"Appartement"}},{"value":"house","label":{"en":"House","fr":"Maison"}},{"value":"land","label":{"en":"Land","fr":"Terrain"}},{"value":"commercial","label":{"en":"Commercial","fr":"Local commercial"}}]},
    {"key":"surface","type":"number","label":{"en":"Surface","fr":"Surface"},"unit":"m²"},
    {"key":"address","type":"text","label":{"en":"Address or neighbourhood","fr":"Adresse ou quartier"},"placeholder":{"en":"Notting Hill, London","fr":"Quartier Saint-Michel, Bordeaux"}}
  ],
  "whatsapp_direct": [
    {"key":"transaction","type":"select","label":{"en":"Transaction","fr":"Transaction"},"options":[{"value":"sale","label":{"en":"For sale","fr":"À vendre"}},{"value":"rent","label":{"en":"For rent","fr":"À louer"}}]},
    {"key":"property_type","type":"select","label":{"en":"Property type","fr":"Type de bien"},"options":[{"value":"apartment","label":{"en":"Apartment","fr":"Appartement"}},{"value":"house","label":{"en":"House","fr":"Maison"}},{"value":"land","label":{"en":"Land","fr":"Terrain"}},{"value":"commercial","label":{"en":"Commercial","fr":"Local commercial"}}]},
    {"key":"address","type":"text","label":{"en":"Address or neighbourhood","fr":"Adresse ou quartier"},"placeholder":{"en":"Notting Hill, London","fr":"Quartier Saint-Michel, Bordeaux"}}
  ],
  "quote_request": [
    {"key":"service","type":"select","label":{"en":"Service","fr":"Prestation"},"options":[{"value":"valuation","label":{"en":"Valuation","fr":"Estimation"}},{"value":"management","label":{"en":"Property management","fr":"Gestion locative"}},{"value":"sale","label":{"en":"Selling","fr":"Mise en vente"}},{"value":"search","label":{"en":"Property search","fr":"Recherche de bien"}}]},
    {"key":"property_type","type":"select","label":{"en":"Property type","fr":"Type de bien"},"options":[{"value":"apartment","label":{"en":"Apartment","fr":"Appartement"}},{"value":"house","label":{"en":"House","fr":"Maison"}},{"value":"land","label":{"en":"Land","fr":"Terrain"}},{"value":"commercial","label":{"en":"Commercial","fr":"Local commercial"}}]},
    {"key":"surface","type":"number","label":{"en":"Surface","fr":"Surface"},"unit":"m²"},
    {"key":"address","type":"text","label":{"en":"Address or neighbourhood","fr":"Adresse ou quartier"},"placeholder":{"en":"Notting Hill, London","fr":"Quartier Saint-Michel, Bordeaux"}}
  ]
}'::jsonb, true)
 where slug = 'real-estate';

update public.activity_categories
   set config = jsonb_set(config, '{templates}', '{
  "calendar_booking": [
    {"key":"place","type":"select","label":{"en":"Where","fr":"Lieu"},"options":[{"value":"salon","label":{"en":"At the salon","fr":"Au salon"}},{"value":"home","label":{"en":"At your home","fr":"À domicile"}}]},
    {"key":"hair_length","type":"select","label":{"en":"Hair length","fr":"Longueur de cheveux"},"options":[{"value":"all","label":{"en":"Any length","fr":"Toutes longueurs"}},{"value":"short","label":{"en":"Short","fr":"Courts"}},{"value":"medium","label":{"en":"Medium","fr":"Mi-longs"}},{"value":"long","label":{"en":"Long","fr":"Longs"}}]},
    {"key":"includes","type":"textarea","label":{"en":"What’s included","fr":"Ce qui est inclus"},"placeholder":{"en":"Wash, cut, blow-dry","fr":"Shampoing, coupe, brushing"}}
  ],
  "direct_reservation": [
    {"key":"place","type":"select","label":{"en":"Where","fr":"Lieu"},"options":[{"value":"salon","label":{"en":"At the salon","fr":"Au salon"}},{"value":"home","label":{"en":"At your home","fr":"À domicile"}}]},
    {"key":"includes","type":"textarea","label":{"en":"What’s included","fr":"Ce qui est inclus"}},
    {"key":"prep","type":"text","label":{"en":"Before you come","fr":"Préparation"},"placeholder":{"en":"Come with clean, dry hair","fr":"Venir cheveux propres et secs"}}
  ],
  "contact_request": [
    {"key":"services","type":"multiselect","label":{"en":"Services","fr":"Prestations"},"options":[{"value":"cut","label":{"en":"Cut","fr":"Coupe"}},{"value":"colour","label":{"en":"Colour","fr":"Couleur"}},{"value":"highlights","label":{"en":"Highlights","fr":"Mèches"}},{"value":"straightening","label":{"en":"Straightening","fr":"Lissage"}},{"value":"beard","label":{"en":"Beard","fr":"Barbe"}},{"value":"wedding","label":{"en":"Bridal hair","fr":"Coiffure de mariage"}}]},
    {"key":"place","type":"select","label":{"en":"Where","fr":"Lieu"},"options":[{"value":"salon","label":{"en":"At the salon","fr":"Au salon"}},{"value":"home","label":{"en":"At your home","fr":"À domicile"}}]}
  ],
  "whatsapp_direct": [
    {"key":"services","type":"multiselect","label":{"en":"Services","fr":"Prestations"},"options":[{"value":"cut","label":{"en":"Cut","fr":"Coupe"}},{"value":"colour","label":{"en":"Colour","fr":"Couleur"}},{"value":"highlights","label":{"en":"Highlights","fr":"Mèches"}},{"value":"straightening","label":{"en":"Straightening","fr":"Lissage"}},{"value":"beard","label":{"en":"Beard","fr":"Barbe"}},{"value":"wedding","label":{"en":"Bridal hair","fr":"Coiffure de mariage"}}]},
    {"key":"place","type":"select","label":{"en":"Where","fr":"Lieu"},"options":[{"value":"salon","label":{"en":"At the salon","fr":"Au salon"}},{"value":"home","label":{"en":"At your home","fr":"À domicile"}}]},
    {"key":"response_time","type":"select","label":{"en":"Usual response time","fr":"Délai de réponse habituel"},"options":[{"value":"hour","label":{"en":"Within the hour","fr":"Dans l’heure"}},{"value":"day","label":{"en":"Same day","fr":"Dans la journée"}},{"value":"two_days","label":{"en":"Within 48 hours","fr":"Sous 48 h"}}]}
  ],
  "quote_request": [
    {"key":"event_type","type":"select","label":{"en":"Occasion","fr":"Événement"},"options":[{"value":"wedding","label":{"en":"Wedding","fr":"Mariage"}},{"value":"party","label":{"en":"Party","fr":"Soirée"}},{"value":"shoot","label":{"en":"Photo shoot","fr":"Shooting photo"}}]},
    {"key":"place","type":"select","label":{"en":"Where","fr":"Lieu"},"options":[{"value":"salon","label":{"en":"At the salon","fr":"Au salon"}},{"value":"venue","label":{"en":"At the venue","fr":"Sur le lieu de l’événement"}}]},
    {"key":"trial","type":"boolean","label":{"en":"Trial included","fr":"Essai inclus"}},
    {"key":"people","type":"number","label":{"en":"People to style","fr":"Personnes à coiffer"}}
  ]
}'::jsonb, true)
 where slug = 'hairdresser';

update public.activity_categories
   set config = jsonb_set(config, '{templates}', '{
  "calendar_booking": [
    {"key":"technique","type":"text","label":{"en":"Technique","fr":"Technique"},"placeholder":{"en":"Gel, semi-permanent…","fr":"Semi-permanent, gel…"}},
    {"key":"place","type":"select","label":{"en":"Where","fr":"Lieu"},"options":[{"value":"institute","label":{"en":"At the studio","fr":"En institut"}},{"value":"home","label":{"en":"At your home","fr":"À domicile"}}]},
    {"key":"includes","type":"textarea","label":{"en":"What’s included","fr":"Ce qui est inclus"}},
    {"key":"lasting","type":"text","label":{"en":"Lasts","fr":"Tenue"},"placeholder":{"en":"2 to 3 weeks","fr":"2 à 3 semaines"}}
  ],
  "direct_reservation": [
    {"key":"technique","type":"text","label":{"en":"Technique","fr":"Technique"},"placeholder":{"en":"Gel, semi-permanent…","fr":"Semi-permanent, gel…"}},
    {"key":"place","type":"select","label":{"en":"Where","fr":"Lieu"},"options":[{"value":"institute","label":{"en":"At the studio","fr":"En institut"}},{"value":"home","label":{"en":"At your home","fr":"À domicile"}}]},
    {"key":"includes","type":"textarea","label":{"en":"What’s included","fr":"Ce qui est inclus"}}
  ],
  "contact_request": [
    {"key":"services","type":"multiselect","label":{"en":"Services","fr":"Prestations"},"options":[{"value":"facial","label":{"en":"Facial","fr":"Soin du visage"}},{"value":"manicure","label":{"en":"Manicure","fr":"Manucure"}},{"value":"pedicure","label":{"en":"Pedicure","fr":"Pédicure"}},{"value":"makeup","label":{"en":"Make-up","fr":"Maquillage"}},{"value":"waxing","label":{"en":"Waxing","fr":"Épilation"}},{"value":"lashes","label":{"en":"Lash extensions","fr":"Extensions de cils"}}]},
    {"key":"place","type":"select","label":{"en":"Where","fr":"Lieu"},"options":[{"value":"institute","label":{"en":"At the studio","fr":"En institut"}},{"value":"home","label":{"en":"At your home","fr":"À domicile"}}]}
  ],
  "whatsapp_direct": [
    {"key":"services","type":"multiselect","label":{"en":"Services","fr":"Prestations"},"options":[{"value":"facial","label":{"en":"Facial","fr":"Soin du visage"}},{"value":"manicure","label":{"en":"Manicure","fr":"Manucure"}},{"value":"pedicure","label":{"en":"Pedicure","fr":"Pédicure"}},{"value":"makeup","label":{"en":"Make-up","fr":"Maquillage"}},{"value":"waxing","label":{"en":"Waxing","fr":"Épilation"}},{"value":"lashes","label":{"en":"Lash extensions","fr":"Extensions de cils"}}]},
    {"key":"place","type":"select","label":{"en":"Where","fr":"Lieu"},"options":[{"value":"institute","label":{"en":"At the studio","fr":"En institut"}},{"value":"home","label":{"en":"At your home","fr":"À domicile"}}]},
    {"key":"response_time","type":"select","label":{"en":"Usual response time","fr":"Délai de réponse habituel"},"options":[{"value":"hour","label":{"en":"Within the hour","fr":"Dans l’heure"}},{"value":"day","label":{"en":"Same day","fr":"Dans la journée"}},{"value":"two_days","label":{"en":"Within 48 hours","fr":"Sous 48 h"}}]}
  ],
  "quote_request": [
    {"key":"event_type","type":"select","label":{"en":"Occasion","fr":"Événement"},"options":[{"value":"wedding","label":{"en":"Wedding","fr":"Mariage"}},{"value":"party","label":{"en":"Party","fr":"Soirée"}},{"value":"shoot","label":{"en":"Photo shoot","fr":"Shooting photo"}}]},
    {"key":"people","type":"number","label":{"en":"Number of people","fr":"Nombre de personnes"}},
    {"key":"trial","type":"boolean","label":{"en":"Trial included","fr":"Essai inclus"}},
    {"key":"place","type":"select","label":{"en":"Where","fr":"Lieu"},"options":[{"value":"institute","label":{"en":"At the studio","fr":"En institut"}},{"value":"venue","label":{"en":"At the venue","fr":"Sur le lieu de l’événement"}}]}
  ]
}'::jsonb, true)
 where slug = 'beauty';

update public.activity_categories
   set config = jsonb_set(config, '{templates}', '{
  "calendar_booking": [
    {"key":"technique","type":"text","label":{"en":"Technique","fr":"Technique"},"placeholder":{"en":"Swedish massage, shiatsu…","fr":"Massage suédois, shiatsu…"}},
    {"key":"place","type":"select","label":{"en":"Where","fr":"Lieu"},"options":[{"value":"office","label":{"en":"At my practice","fr":"Au cabinet"}},{"value":"home","label":{"en":"At your home","fr":"À domicile"}},{"value":"online","label":{"en":"Online","fr":"En ligne"}}]},
    {"key":"focus","type":"text","label":{"en":"Recommended for","fr":"Recommandé pour"},"placeholder":{"en":"Stress, back tension…","fr":"Stress, tensions dorsales…"}},
    {"key":"contraindications","type":"textarea","label":{"en":"Contraindications","fr":"Contre-indications"},"placeholder":{"en":"Pregnancy (first trimester), fever…","fr":"Grossesse (1er trimestre), fièvre…"}}
  ],
  "direct_reservation": [
    {"key":"technique","type":"text","label":{"en":"Technique","fr":"Technique"},"placeholder":{"en":"Swedish massage, shiatsu…","fr":"Massage suédois, shiatsu…"}},
    {"key":"schedule","type":"time","mode":"range","label":{"en":"Time","fr":"Horaire"}},
    {"key":"location","type":"text","label":{"en":"Location","fr":"Lieu"}},
    {"key":"bring","type":"text","label":{"en":"What to bring","fr":"À apporter"},"placeholder":{"en":"Mat, water bottle…","fr":"Tapis, bouteille d’eau…"}}
  ],
  "contact_request": [
    {"key":"technique","type":"text","label":{"en":"Technique","fr":"Technique"},"placeholder":{"en":"Swedish massage, shiatsu…","fr":"Massage suédois, shiatsu…"}},
    {"key":"place","type":"select","label":{"en":"Where","fr":"Lieu"},"options":[{"value":"office","label":{"en":"At my practice","fr":"Au cabinet"}},{"value":"home","label":{"en":"At your home","fr":"À domicile"}},{"value":"online","label":{"en":"Online","fr":"En ligne"}}]},
    {"key":"focus","type":"text","label":{"en":"Recommended for","fr":"Recommandé pour"},"placeholder":{"en":"Stress, back tension…","fr":"Stress, tensions dorsales…"}}
  ],
  "whatsapp_direct": [
    {"key":"place","type":"select","label":{"en":"Where","fr":"Lieu"},"options":[{"value":"office","label":{"en":"At my practice","fr":"Au cabinet"}},{"value":"home","label":{"en":"At your home","fr":"À domicile"}},{"value":"online","label":{"en":"Online","fr":"En ligne"}}]},
    {"key":"focus","type":"text","label":{"en":"Recommended for","fr":"Recommandé pour"},"placeholder":{"en":"Stress, back tension…","fr":"Stress, tensions dorsales…"}},
    {"key":"response_time","type":"select","label":{"en":"Usual response time","fr":"Délai de réponse habituel"},"options":[{"value":"hour","label":{"en":"Within the hour","fr":"Dans l’heure"}},{"value":"day","label":{"en":"Same day","fr":"Dans la journée"}},{"value":"two_days","label":{"en":"Within 48 hours","fr":"Sous 48 h"}}]}
  ],
  "quote_request": [
    {"key":"service","type":"select","label":{"en":"Service","fr":"Prestation"},"options":[{"value":"chair","label":{"en":"Chair massage at work","fr":"Massage assis en entreprise"}},{"value":"workshop","label":{"en":"Wellbeing workshop","fr":"Atelier bien-être"}},{"value":"retreat","label":{"en":"Retreat","fr":"Retraite"}}]},
    {"key":"people","type":"number","label":{"en":"Number of people","fr":"Nombre de personnes"}},
    {"key":"location","type":"text","label":{"en":"Location","fr":"Lieu"}},
    {"key":"includes","type":"textarea","label":{"en":"What’s included","fr":"Ce qui est inclus"}}
  ]
}'::jsonb, true)
 where slug = 'wellness';

update public.activity_categories
   set config = jsonb_set(config, '{templates}', '{
  "calendar_booking": [
    {"key":"instrument","type":"text","label":{"en":"Instrument","fr":"Instrument"},"placeholder":{"en":"Piano, guitar, voice…","fr":"Piano, guitare, chant…"}},
    {"key":"level","type":"select","label":{"en":"Level","fr":"Niveau"},"options":[{"value":"all","label":{"en":"All levels","fr":"Tous niveaux"}},{"value":"beginner","label":{"en":"Beginner","fr":"Débutant"}},{"value":"intermediate","label":{"en":"Intermediate","fr":"Intermédiaire"}},{"value":"advanced","label":{"en":"Advanced","fr":"Avancé"}}]},
    {"key":"format","type":"select","label":{"en":"Format","fr":"Format"},"options":[{"value":"in_person","label":{"en":"In person","fr":"En présentiel"}},{"value":"online","label":{"en":"Online","fr":"En ligne"}}]},
    {"key":"age_group","type":"text","label":{"en":"Who it’s for","fr":"Public"},"placeholder":{"en":"Children from 7, adults","fr":"Enfants dès 7 ans, adultes"}}
  ],
  "direct_reservation": [
    {"key":"instrument","type":"text","label":{"en":"Instrument","fr":"Instrument"},"placeholder":{"en":"Piano, guitar, voice…","fr":"Piano, guitare, chant…"}},
    {"key":"level","type":"select","label":{"en":"Level","fr":"Niveau"},"options":[{"value":"all","label":{"en":"All levels","fr":"Tous niveaux"}},{"value":"beginner","label":{"en":"Beginner","fr":"Débutant"}},{"value":"intermediate","label":{"en":"Intermediate","fr":"Intermédiaire"}},{"value":"advanced","label":{"en":"Advanced","fr":"Avancé"}}]},
    {"key":"schedule","type":"time","mode":"range","label":{"en":"Time","fr":"Horaire"}},
    {"key":"instrument_provided","type":"boolean","label":{"en":"Instrument provided","fr":"Instrument fourni"}}
  ],
  "contact_request": [
    {"key":"instrument","type":"text","label":{"en":"Instrument","fr":"Instrument"},"placeholder":{"en":"Piano, guitar, voice…","fr":"Piano, guitare, chant…"}},
    {"key":"level","type":"select","label":{"en":"Level","fr":"Niveau"},"options":[{"value":"all","label":{"en":"All levels","fr":"Tous niveaux"}},{"value":"beginner","label":{"en":"Beginner","fr":"Débutant"}},{"value":"intermediate","label":{"en":"Intermediate","fr":"Intermédiaire"}},{"value":"advanced","label":{"en":"Advanced","fr":"Avancé"}}]},
    {"key":"age_group","type":"text","label":{"en":"Who it’s for","fr":"Public"},"placeholder":{"en":"Children from 7, adults","fr":"Enfants dès 7 ans, adultes"}},
    {"key":"format","type":"select","label":{"en":"Format","fr":"Format"},"options":[{"value":"in_person","label":{"en":"In person","fr":"En présentiel"}},{"value":"online","label":{"en":"Online","fr":"En ligne"}}]}
  ],
  "whatsapp_direct": [
    {"key":"instrument","type":"text","label":{"en":"Instrument","fr":"Instrument"},"placeholder":{"en":"Piano, guitar, voice…","fr":"Piano, guitare, chant…"}},
    {"key":"format","type":"select","label":{"en":"Format","fr":"Format"},"options":[{"value":"in_person","label":{"en":"In person","fr":"En présentiel"}},{"value":"online","label":{"en":"Online","fr":"En ligne"}}]},
    {"key":"response_time","type":"select","label":{"en":"Usual response time","fr":"Délai de réponse habituel"},"options":[{"value":"hour","label":{"en":"Within the hour","fr":"Dans l’heure"}},{"value":"day","label":{"en":"Same day","fr":"Dans la journée"}},{"value":"two_days","label":{"en":"Within 48 hours","fr":"Sous 48 h"}}]}
  ],
  "quote_request": [
    {"key":"service","type":"select","label":{"en":"Service","fr":"Prestation"},"options":[{"value":"course","label":{"en":"Year-long course","fr":"Cursus à l’année"}},{"value":"camp","label":{"en":"Holiday course","fr":"Stage"}},{"value":"event","label":{"en":"Live music for an event","fr":"Animation d’événement"}}]},
    {"key":"instrument","type":"text","label":{"en":"Instrument","fr":"Instrument"},"placeholder":{"en":"Piano, guitar, voice…","fr":"Piano, guitare, chant…"}},
    {"key":"program_length","type":"text","label":{"en":"Length","fr":"Durée"},"placeholder":{"en":"30 lessons over the year","fr":"30 cours sur l’année"}}
  ]
}'::jsonb, true)
 where slug = 'music-teacher';

update public.activity_categories
   set config = jsonb_set(config, '{templates}', '{
  "calendar_booking": [
    {"key":"subject","type":"text","label":{"en":"Subject","fr":"Matière"},"placeholder":{"en":"Maths, physics…","fr":"Mathématiques, physique…"}},
    {"key":"grade_level","type":"text","label":{"en":"School level","fr":"Niveau scolaire"},"placeholder":{"en":"Secondary school","fr":"Collège, lycée"}},
    {"key":"format","type":"select","label":{"en":"Format","fr":"Format"},"options":[{"value":"online","label":{"en":"Online","fr":"En ligne"}},{"value":"in_person","label":{"en":"In person","fr":"En présentiel"}},{"value":"at_home","label":{"en":"At your home","fr":"À domicile"}}]}
  ],
  "direct_reservation": [
    {"key":"subject","type":"text","label":{"en":"Subject","fr":"Matière"},"placeholder":{"en":"Maths, physics…","fr":"Mathématiques, physique…"}},
    {"key":"grade_level","type":"text","label":{"en":"School level","fr":"Niveau scolaire"},"placeholder":{"en":"Secondary school","fr":"Collège, lycée"}},
    {"key":"schedule","type":"time","mode":"range","label":{"en":"Time","fr":"Horaire"}},
    {"key":"group_size","type":"number","label":{"en":"Students per group","fr":"Élèves par groupe"}}
  ],
  "contact_request": [
    {"key":"subject","type":"text","label":{"en":"Subject","fr":"Matière"},"placeholder":{"en":"Maths, physics…","fr":"Mathématiques, physique…"}},
    {"key":"grade_level","type":"text","label":{"en":"School level","fr":"Niveau scolaire"},"placeholder":{"en":"Secondary school","fr":"Collège, lycée"}},
    {"key":"goal","type":"select","label":{"en":"Goal","fr":"Objectif"},"options":[{"value":"catch_up","label":{"en":"Catching up","fr":"Remise à niveau"}},{"value":"exam","label":{"en":"Exam preparation","fr":"Préparation d’examen"}},{"value":"advanced","label":{"en":"Going further","fr":"Approfondissement"}},{"value":"homework","label":{"en":"Homework help","fr":"Aide aux devoirs"}}]},
    {"key":"format","type":"select","label":{"en":"Format","fr":"Format"},"options":[{"value":"online","label":{"en":"Online","fr":"En ligne"}},{"value":"in_person","label":{"en":"In person","fr":"En présentiel"}},{"value":"at_home","label":{"en":"At your home","fr":"À domicile"}}]}
  ],
  "whatsapp_direct": [
    {"key":"subject","type":"text","label":{"en":"Subject","fr":"Matière"},"placeholder":{"en":"Maths, physics…","fr":"Mathématiques, physique…"}},
    {"key":"grade_level","type":"text","label":{"en":"School level","fr":"Niveau scolaire"},"placeholder":{"en":"Secondary school","fr":"Collège, lycée"}},
    {"key":"response_time","type":"select","label":{"en":"Usual response time","fr":"Délai de réponse habituel"},"options":[{"value":"hour","label":{"en":"Within the hour","fr":"Dans l’heure"}},{"value":"day","label":{"en":"Same day","fr":"Dans la journée"}},{"value":"two_days","label":{"en":"Within 48 hours","fr":"Sous 48 h"}}]}
  ],
  "quote_request": [
    {"key":"subject","type":"text","label":{"en":"Subject","fr":"Matière"},"placeholder":{"en":"Maths, physics…","fr":"Mathématiques, physique…"}},
    {"key":"grade_level","type":"text","label":{"en":"School level","fr":"Niveau scolaire"},"placeholder":{"en":"Secondary school","fr":"Collège, lycée"}},
    {"key":"package","type":"text","label":{"en":"Package","fr":"Forfait"},"placeholder":{"en":"10 hours, to use over 3 months","fr":"10 heures, à utiliser sur 3 mois"}},
    {"key":"goal","type":"select","label":{"en":"Goal","fr":"Objectif"},"options":[{"value":"catch_up","label":{"en":"Catching up","fr":"Remise à niveau"}},{"value":"exam","label":{"en":"Exam preparation","fr":"Préparation d’examen"}},{"value":"advanced","label":{"en":"Going further","fr":"Approfondissement"}},{"value":"homework","label":{"en":"Homework help","fr":"Aide aux devoirs"}}]}
  ]
}'::jsonb, true)
 where slug = 'tutor';

update public.activity_categories
   set config = jsonb_set(config, '{templates}', '{
  "calendar_booking": [
    {"key":"session_type","type":"text","label":{"en":"Session type","fr":"Type de séance"},"placeholder":{"en":"Portrait, family…","fr":"Portrait, famille…"}},
    {"key":"location","type":"text","label":{"en":"Location","fr":"Lieu"},"placeholder":{"en":"Studio, outdoors…","fr":"Studio, extérieur…"}},
    {"key":"deliverables","type":"text","label":{"en":"Deliverables","fr":"Livrables"},"placeholder":{"en":"20 edited photos","fr":"20 photos retouchées"}},
    {"key":"delivery","type":"text","label":{"en":"Delivery time","fr":"Délai de livraison"},"placeholder":{"en":"Within 10 days","fr":"Sous 10 jours"}}
  ],
  "direct_reservation": [
    {"key":"session_type","type":"text","label":{"en":"Session type","fr":"Type de séance"},"placeholder":{"en":"Portrait, family…","fr":"Portrait, famille…"}},
    {"key":"location","type":"text","label":{"en":"Location","fr":"Lieu"}},
    {"key":"deliverables","type":"text","label":{"en":"Deliverables","fr":"Livrables"},"placeholder":{"en":"20 edited photos","fr":"20 photos retouchées"}},
    {"key":"delivery","type":"text","label":{"en":"Delivery time","fr":"Délai de livraison"},"placeholder":{"en":"Within 10 days","fr":"Sous 10 jours"}}
  ],
  "contact_request": [
    {"key":"session_types","type":"multiselect","label":{"en":"Session types","fr":"Types de séances"},"options":[{"value":"portrait","label":{"en":"Portrait","fr":"Portrait"}},{"value":"wedding","label":{"en":"Wedding","fr":"Mariage"}},{"value":"family","label":{"en":"Family","fr":"Famille"}},{"value":"business","label":{"en":"Business","fr":"Entreprise"}},{"value":"product","label":{"en":"Product","fr":"Produit"}},{"value":"event","label":{"en":"Event","fr":"Événement"}}]},
    {"key":"area","type":"text","label":{"en":"Area covered","fr":"Zone d’intervention"},"placeholder":{"en":"Central London and nearby","fr":"Paris 11e et alentours"}},
    {"key":"gallery","type":"images","label":{"en":"Portfolio","fr":"Portfolio"}}
  ],
  "whatsapp_direct": [
    {"key":"session_types","type":"multiselect","label":{"en":"Session types","fr":"Types de séances"},"options":[{"value":"portrait","label":{"en":"Portrait","fr":"Portrait"}},{"value":"wedding","label":{"en":"Wedding","fr":"Mariage"}},{"value":"family","label":{"en":"Family","fr":"Famille"}},{"value":"business","label":{"en":"Business","fr":"Entreprise"}},{"value":"product","label":{"en":"Product","fr":"Produit"}},{"value":"event","label":{"en":"Event","fr":"Événement"}}]},
    {"key":"area","type":"text","label":{"en":"Area covered","fr":"Zone d’intervention"},"placeholder":{"en":"Central London and nearby","fr":"Paris 11e et alentours"}},
    {"key":"gallery","type":"images","label":{"en":"Portfolio","fr":"Portfolio"}}
  ],
  "quote_request": [
    {"key":"session_type","type":"select","label":{"en":"Type of shoot","fr":"Type de prestation"},"options":[{"value":"wedding","label":{"en":"Wedding","fr":"Mariage"}},{"value":"event","label":{"en":"Event","fr":"Événement"}},{"value":"business","label":{"en":"Business","fr":"Entreprise"}},{"value":"product","label":{"en":"Product","fr":"Produit"}}]},
    {"key":"shooting_time","type":"text","label":{"en":"Shooting time","fr":"Temps de prise de vue"},"placeholder":{"en":"Half day or full day","fr":"Demi-journée ou journée"}},
    {"key":"deliverables","type":"textarea","label":{"en":"Deliverables","fr":"Livrables"},"placeholder":{"en":"Online gallery, 300 edited photos","fr":"Galerie en ligne, 300 photos retouchées"}},
    {"key":"gallery","type":"images","label":{"en":"Portfolio","fr":"Portfolio"}}
  ]
}'::jsonb, true)
 where slug = 'photographer';

update public.activity_categories
   set config = jsonb_set(config, '{templates}', '{
  "calendar_booking": [
    {"key":"approach","type":"text","label":{"en":"Approach","fr":"Approche"},"placeholder":{"en":"CBT, systemic…","fr":"TCC, systémique…"}},
    {"key":"format","type":"select","label":{"en":"Format","fr":"Format"},"options":[{"value":"office","label":{"en":"At my practice","fr":"En cabinet"}},{"value":"online","label":{"en":"Video call","fr":"Visio"}},{"value":"phone","label":{"en":"Phone","fr":"Téléphone"}}]},
    {"key":"first_session","type":"textarea","label":{"en":"How the first session goes","fr":"Déroulé de la première séance"}},
    {"key":"reimbursement","type":"select","label":{"en":"Reimbursement","fr":"Remboursement"},"options":[{"value":"none","label":{"en":"Not reimbursed","fr":"Non remboursé"}},{"value":"insurance","label":{"en":"Private insurance may cover it","fr":"Mutuelle possible"}},{"value":"public","label":{"en":"Covered by public health insurance","fr":"Remboursé Sécurité sociale"}}]}
  ],
  "direct_reservation": [
    {"key":"approach","type":"text","label":{"en":"Approach","fr":"Approche"},"placeholder":{"en":"CBT, systemic…","fr":"TCC, systémique…"}},
    {"key":"schedule","type":"time","mode":"range","label":{"en":"Time","fr":"Horaire"}},
    {"key":"location","type":"text","label":{"en":"Location","fr":"Lieu"}},
    {"key":"group_size","type":"number","label":{"en":"Participants","fr":"Participants"}}
  ],
  "contact_request": [
    {"key":"approach","type":"text","label":{"en":"Approach","fr":"Approche"},"placeholder":{"en":"CBT, systemic…","fr":"TCC, systémique…"}},
    {"key":"format","type":"select","label":{"en":"Format","fr":"Format"},"options":[{"value":"office","label":{"en":"At my practice","fr":"En cabinet"}},{"value":"online","label":{"en":"Video call","fr":"Visio"}},{"value":"phone","label":{"en":"Phone","fr":"Téléphone"}}]},
    {"key":"audience","type":"multiselect","label":{"en":"Who I see","fr":"Public"},"options":[{"value":"adults","label":{"en":"Adults","fr":"Adultes"}},{"value":"teens","label":{"en":"Teenagers","fr":"Adolescents"}},{"value":"children","label":{"en":"Children","fr":"Enfants"}},{"value":"couples","label":{"en":"Couples","fr":"Couples"}}]}
  ],
  "whatsapp_direct": [
    {"key":"format","type":"select","label":{"en":"Format","fr":"Format"},"options":[{"value":"office","label":{"en":"At my practice","fr":"En cabinet"}},{"value":"online","label":{"en":"Video call","fr":"Visio"}},{"value":"phone","label":{"en":"Phone","fr":"Téléphone"}}]},
    {"key":"audience","type":"multiselect","label":{"en":"Who I see","fr":"Public"},"options":[{"value":"adults","label":{"en":"Adults","fr":"Adultes"}},{"value":"teens","label":{"en":"Teenagers","fr":"Adolescents"}},{"value":"children","label":{"en":"Children","fr":"Enfants"}},{"value":"couples","label":{"en":"Couples","fr":"Couples"}}]},
    {"key":"response_time","type":"select","label":{"en":"Usual response time","fr":"Délai de réponse habituel"},"options":[{"value":"hour","label":{"en":"Within the hour","fr":"Dans l’heure"}},{"value":"day","label":{"en":"Same day","fr":"Dans la journée"}},{"value":"two_days","label":{"en":"Within 48 hours","fr":"Sous 48 h"}}]}
  ],
  "quote_request": [
    {"key":"service","type":"select","label":{"en":"Service","fr":"Intervention"},"options":[{"value":"company","label":{"en":"At a company","fr":"En entreprise"}},{"value":"group","label":{"en":"Support group","fr":"Groupe de parole"}},{"value":"training","label":{"en":"Training","fr":"Formation"}}]},
    {"key":"people","type":"number","label":{"en":"Number of people","fr":"Nombre de personnes"}},
    {"key":"format","type":"select","label":{"en":"Format","fr":"Format"},"options":[{"value":"office","label":{"en":"At my practice","fr":"En cabinet"}},{"value":"online","label":{"en":"Video call","fr":"Visio"}},{"value":"phone","label":{"en":"Phone","fr":"Téléphone"}}]}
  ]
}'::jsonb, true)
 where slug = 'therapist';

update public.activity_categories
   set config = jsonb_set(config, '{templates}', '{
  "calendar_booking": [
    {"key":"format","type":"select","label":{"en":"Format","fr":"Format"},"options":[{"value":"remote","label":{"en":"Remote","fr":"À distance"}},{"value":"on_site","label":{"en":"On site","fr":"Sur site"}},{"value":"hybrid","label":{"en":"Hybrid","fr":"Hybride"}}]},
    {"key":"topic","type":"text","label":{"en":"Topic","fr":"Sujet"},"placeholder":{"en":"Audit, strategy, hiring…","fr":"Audit, stratégie, recrutement…"}},
    {"key":"follow_up","type":"text","label":{"en":"After the session","fr":"Après la séance"},"placeholder":{"en":"Written summary within 48 hours","fr":"Compte-rendu écrit sous 48 h"}}
  ],
  "direct_reservation": [
    {"key":"programme","type":"textarea","label":{"en":"Programme","fr":"Programme"}},
    {"key":"schedule","type":"time","mode":"range","label":{"en":"Time","fr":"Horaire"}},
    {"key":"format","type":"select","label":{"en":"Format","fr":"Format"},"options":[{"value":"remote","label":{"en":"Remote","fr":"À distance"}},{"value":"on_site","label":{"en":"On site","fr":"Sur site"}},{"value":"hybrid","label":{"en":"Hybrid","fr":"Hybride"}}]},
    {"key":"includes","type":"textarea","label":{"en":"What’s included","fr":"Ce qui est inclus"},"placeholder":{"en":"Materials, certificate of attendance","fr":"Supports, attestation de formation"}}
  ],
  "contact_request": [
    {"key":"expertise","type":"textarea","label":{"en":"Areas of expertise","fr":"Domaines d’expertise"}},
    {"key":"format","type":"select","label":{"en":"Format","fr":"Format"},"options":[{"value":"remote","label":{"en":"Remote","fr":"À distance"}},{"value":"on_site","label":{"en":"On site","fr":"Sur site"}},{"value":"hybrid","label":{"en":"Hybrid","fr":"Hybride"}}]},
    {"key":"languages","type":"text","label":{"en":"Languages","fr":"Langues"}}
  ],
  "whatsapp_direct": [
    {"key":"expertise","type":"text","label":{"en":"Areas of expertise","fr":"Domaines d’expertise"}},
    {"key":"format","type":"select","label":{"en":"Format","fr":"Format"},"options":[{"value":"remote","label":{"en":"Remote","fr":"À distance"}},{"value":"on_site","label":{"en":"On site","fr":"Sur site"}},{"value":"hybrid","label":{"en":"Hybrid","fr":"Hybride"}}]},
    {"key":"response_time","type":"select","label":{"en":"Usual response time","fr":"Délai de réponse habituel"},"options":[{"value":"hour","label":{"en":"Within the hour","fr":"Dans l’heure"}},{"value":"day","label":{"en":"Same day","fr":"Dans la journée"}},{"value":"two_days","label":{"en":"Within 48 hours","fr":"Sous 48 h"}}]}
  ],
  "quote_request": [
    {"key":"deliverables","type":"textarea","label":{"en":"Deliverables","fr":"Livrables"}},
    {"key":"turnaround","type":"text","label":{"en":"Turnaround","fr":"Délai"},"placeholder":{"en":"2 to 3 weeks","fr":"2 à 3 semaines"}},
    {"key":"format","type":"select","label":{"en":"Format","fr":"Format"},"options":[{"value":"remote","label":{"en":"Remote","fr":"À distance"}},{"value":"on_site","label":{"en":"On site","fr":"Sur site"}},{"value":"hybrid","label":{"en":"Hybrid","fr":"Hybride"}}]},
    {"key":"pricing","type":"select","label":{"en":"Pricing","fr":"Tarification"},"options":[{"value":"fixed","label":{"en":"Fixed fee","fr":"Au forfait"}},{"value":"daily","label":{"en":"Day rate","fr":"À la journée"}},{"value":"hourly","label":{"en":"Hourly","fr":"À l’heure"}}]}
  ]
}'::jsonb, true)
 where slug = 'consultant';

update public.activity_categories
   set config = jsonb_set(config, '{templates}', '{
  "calendar_booking": [
    {"key":"capacity","type":"number","label":{"en":"Capacity","fr":"Capacité"}},
    {"key":"location","type":"text","label":{"en":"Location","fr":"Lieu"}},
    {"key":"included","type":"textarea","label":{"en":"What’s included","fr":"Ce qui est inclus"},"placeholder":{"en":"Cleaning, bed linen, Wi-Fi","fr":"Ménage, draps, Wi-Fi"}},
    {"key":"gallery","type":"images","label":{"en":"Photo gallery","fr":"Galerie photos"}}
  ],
  "direct_reservation": [
    {"key":"capacity","type":"number","label":{"en":"Capacity","fr":"Capacité"}},
    {"key":"location","type":"text","label":{"en":"Location","fr":"Lieu"}},
    {"key":"included","type":"textarea","label":{"en":"What’s included","fr":"Ce qui est inclus"},"placeholder":{"en":"Cleaning, bed linen, Wi-Fi","fr":"Ménage, draps, Wi-Fi"}},
    {"key":"gallery","type":"images","label":{"en":"Photo gallery","fr":"Galerie photos"}}
  ],
  "contact_request": [
    {"key":"capacity","type":"number","label":{"en":"Capacity","fr":"Capacité"}},
    {"key":"location","type":"text","label":{"en":"Location","fr":"Lieu"}},
    {"key":"equipment","type":"multiselect","label":{"en":"Amenities","fr":"Équipements"},"options":[{"value":"wifi","label":{"en":"Wi-Fi","fr":"Wi-Fi"}},{"value":"parking","label":{"en":"Parking","fr":"Parking"}},{"value":"kitchen","label":{"en":"Kitchen","fr":"Cuisine"}},{"value":"sound","label":{"en":"Sound system","fr":"Sonorisation"}},{"value":"projector","label":{"en":"Projector","fr":"Vidéoprojecteur"}},{"value":"accessible","label":{"en":"Step-free access","fr":"Accès PMR"}}]},
    {"key":"gallery","type":"images","label":{"en":"Photo gallery","fr":"Galerie photos"}}
  ],
  "whatsapp_direct": [
    {"key":"capacity","type":"number","label":{"en":"Capacity","fr":"Capacité"}},
    {"key":"location","type":"text","label":{"en":"Location","fr":"Lieu"}},
    {"key":"gallery","type":"images","label":{"en":"Photo gallery","fr":"Galerie photos"}}
  ],
  "quote_request": [
    {"key":"event_type","type":"select","label":{"en":"Type of event","fr":"Type d’événement"},"options":[{"value":"birthday","label":{"en":"Birthday","fr":"Anniversaire"}},{"value":"seminar","label":{"en":"Seminar","fr":"Séminaire"}},{"value":"wedding","label":{"en":"Wedding","fr":"Mariage"}},{"value":"shoot","label":{"en":"Film shoot","fr":"Tournage"}}]},
    {"key":"capacity","type":"number","label":{"en":"Capacity","fr":"Capacité"}},
    {"key":"equipment","type":"multiselect","label":{"en":"Amenities","fr":"Équipements"},"options":[{"value":"wifi","label":{"en":"Wi-Fi","fr":"Wi-Fi"}},{"value":"parking","label":{"en":"Parking","fr":"Parking"}},{"value":"kitchen","label":{"en":"Kitchen","fr":"Cuisine"}},{"value":"sound","label":{"en":"Sound system","fr":"Sonorisation"}},{"value":"projector","label":{"en":"Projector","fr":"Vidéoprojecteur"}},{"value":"accessible","label":{"en":"Step-free access","fr":"Accès PMR"}}]},
    {"key":"gallery","type":"images","label":{"en":"Photo gallery","fr":"Galerie photos"}}
  ]
}'::jsonb, true)
 where slug = 'rental';

update public.activity_categories
   set config = jsonb_set(config, '{templates}', '{
  "calendar_booking": [
    {"key":"format","type":"select","label":{"en":"Format","fr":"Format"},"options":[{"value":"in_person","label":{"en":"In person","fr":"En présentiel"}},{"value":"online","label":{"en":"Online","fr":"En ligne"}},{"value":"at_home","label":{"en":"At your home","fr":"À domicile"}}]},
    {"key":"location","type":"text","label":{"en":"Location","fr":"Lieu"}},
    {"key":"includes","type":"textarea","label":{"en":"What’s included","fr":"Ce qui est inclus"}}
  ],
  "direct_reservation": [
    {"key":"schedule","type":"time","mode":"range","label":{"en":"Time","fr":"Horaire"}},
    {"key":"location","type":"text","label":{"en":"Location","fr":"Lieu"}},
    {"key":"includes","type":"textarea","label":{"en":"What’s included","fr":"Ce qui est inclus"}},
    {"key":"bring","type":"text","label":{"en":"What to bring","fr":"À apporter"},"placeholder":{"en":"Mat, water bottle…","fr":"Tapis, bouteille d’eau…"}}
  ],
  "contact_request": [
    {"key":"format","type":"select","label":{"en":"Format","fr":"Format"},"options":[{"value":"in_person","label":{"en":"In person","fr":"En présentiel"}},{"value":"online","label":{"en":"Online","fr":"En ligne"}},{"value":"at_home","label":{"en":"At your home","fr":"À domicile"}}]},
    {"key":"area","type":"text","label":{"en":"Area covered","fr":"Zone d’intervention"},"placeholder":{"en":"Central London and nearby","fr":"Paris 11e et alentours"}},
    {"key":"response_time","type":"select","label":{"en":"Usual response time","fr":"Délai de réponse habituel"},"options":[{"value":"hour","label":{"en":"Within the hour","fr":"Dans l’heure"}},{"value":"day","label":{"en":"Same day","fr":"Dans la journée"}},{"value":"two_days","label":{"en":"Within 48 hours","fr":"Sous 48 h"}}]}
  ],
  "whatsapp_direct": [
    {"key":"format","type":"select","label":{"en":"Format","fr":"Format"},"options":[{"value":"in_person","label":{"en":"In person","fr":"En présentiel"}},{"value":"online","label":{"en":"Online","fr":"En ligne"}},{"value":"at_home","label":{"en":"At your home","fr":"À domicile"}}]},
    {"key":"area","type":"text","label":{"en":"Area covered","fr":"Zone d’intervention"},"placeholder":{"en":"Central London and nearby","fr":"Paris 11e et alentours"}},
    {"key":"response_time","type":"select","label":{"en":"Usual response time","fr":"Délai de réponse habituel"},"options":[{"value":"hour","label":{"en":"Within the hour","fr":"Dans l’heure"}},{"value":"day","label":{"en":"Same day","fr":"Dans la journée"}},{"value":"two_days","label":{"en":"Within 48 hours","fr":"Sous 48 h"}}]}
  ],
  "quote_request": [
    {"key":"includes","type":"textarea","label":{"en":"What’s included","fr":"Ce qui est inclus"}},
    {"key":"turnaround","type":"text","label":{"en":"Turnaround","fr":"Délai"},"placeholder":{"en":"Within 2 weeks","fr":"Sous 2 semaines"}},
    {"key":"format","type":"select","label":{"en":"Format","fr":"Format"},"options":[{"value":"in_person","label":{"en":"In person","fr":"En présentiel"}},{"value":"online","label":{"en":"Online","fr":"En ligne"}},{"value":"at_home","label":{"en":"At your home","fr":"À domicile"}}]}
  ]
}'::jsonb, true)
 where slug = 'other';
