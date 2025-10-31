-- FlipFinder - Schema Base de Données PostgreSQL
-- Système d'arbitrage outillage professionnel

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- Pour recherche full-text

-- =======================
-- TABLE: opportunites
-- =======================
CREATE TABLE IF NOT EXISTS opportunites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Métadonnées source
    source VARCHAR(50) NOT NULL DEFAULT 'interencheres',
    url_annonce TEXT NOT NULL UNIQUE,
    id_externe VARCHAR(100),

    -- Informations enchère
    titre TEXT NOT NULL,
    description TEXT,
    prix_depart DECIMAL(10,2),
    prix_actuel DECIMAL(10,2),
    prix_reserve DECIMAL(10,2),
    prix_estime_min DECIMAL(10,2),
    prix_estime_max DECIMAL(10,2),
    nb_encheres INTEGER DEFAULT 0,

    -- Dates
    date_debut TIMESTAMP,
    date_fin TIMESTAMP,
    date_detection TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Localisation
    ville VARCHAR(100),
    code_postal VARCHAR(10),
    departement VARCHAR(5),
    pays VARCHAR(50) DEFAULT 'France',

    -- Vendeur
    vendeur_nom VARCHAR(255),
    vendeur_type VARCHAR(50), -- particulier, entreprise, liquidation, commissaire
    vendeur_note DECIMAL(3,2),

    -- Images
    images JSONB, -- [{url: "", ordre: 1}, ...]
    image_principale TEXT,

    -- Détection & Scoring
    mots_cles_detectes TEXT[],
    marques_detectees JSONB, -- [{marque: "hilti", confiance: 0.95, modele: "TE60"}]
    categories TEXT[],
    etat_estime VARCHAR(50), -- neuf, très bon, bon, moyen, pièces

    -- Analyse IA
    analyse_ia JSONB, -- Résultat complet de Ollama
    analyse_ia_timestamp TIMESTAMP,

    -- Scoring & ROI
    score DECIMAL(5,4) DEFAULT 0, -- Score global 0-1
    score_details JSONB, -- Détail des facteurs de scoring
    roi_estime DECIMAL(10,2), -- ROI en %
    prix_revente_estime DECIMAL(10,2),
    marge_brute_estimee DECIMAL(10,2),

    -- Facteurs de décision
    facteurs JSONB, -- {urgence: 0.8, marque_premium: true, liquidation: true, ...}
    signaux_positifs TEXT[],
    signaux_negatifs TEXT[],

    -- Statut workflow
    statut VARCHAR(50) NOT NULL DEFAULT 'DETECTE',
    -- DETECTE -> ANALYSE -> VALIDE -> SUIVI -> ACHETE -> VENDU -> TERMINE
    -- ou REJETE, EXPIRE

    -- Suivi enchère
    enchere_suivie BOOLEAN DEFAULT false,
    enchere_max_bid DECIMAL(10,2),
    enchere_auto BOOLEAN DEFAULT false,

    -- Métadonnées
    tags TEXT[],
    notes TEXT,
    priorite INTEGER DEFAULT 0,

    -- Audit
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by VARCHAR(100) DEFAULT 'system',
    updated_by VARCHAR(100) DEFAULT 'system'
);

-- Index pour performances
CREATE INDEX idx_opportunites_statut ON opportunites(statut);
CREATE INDEX idx_opportunites_score ON opportunites(score DESC);
CREATE INDEX idx_opportunites_date_fin ON opportunites(date_fin);
CREATE INDEX idx_opportunites_source ON opportunites(source);
CREATE INDEX idx_opportunites_created_at ON opportunites(created_at DESC);
CREATE INDEX idx_opportunites_roi ON opportunites(roi_estime DESC);
CREATE INDEX idx_opportunites_search ON opportunites USING gin(to_tsvector('french', titre || ' ' || COALESCE(description, '')));
CREATE INDEX idx_opportunites_marques ON opportunites USING gin(marques_detectees);

-- =======================
-- TABLE: achats
-- =======================
CREATE TABLE IF NOT EXISTS achats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    opportunite_id UUID NOT NULL REFERENCES opportunites(id) ON DELETE CASCADE,

    -- Transaction
    date_achat TIMESTAMP NOT NULL DEFAULT NOW(),
    prix_achat DECIMAL(10,2) NOT NULL,
    frais_achat DECIMAL(10,2) DEFAULT 0, -- frais enchère, transport, etc.
    cout_total DECIMAL(10,2) GENERATED ALWAYS AS (prix_achat + COALESCE(frais_achat, 0)) STORED,

    -- Détails achat
    mode_achat VARCHAR(50), -- enchere_manuelle, enchere_auto, achat_immediat
    num_transaction VARCHAR(100),

    -- Livraison
    frais_livraison DECIMAL(10,2) DEFAULT 0,
    date_livraison_estimee TIMESTAMP,
    date_livraison_reelle TIMESTAMP,
    statut_livraison VARCHAR(50), -- en_attente, expedie, livre, probleme

    -- Stock
    lieu_stockage VARCHAR(255),
    etat_reception VARCHAR(50), -- conforme, endommage, different

    -- Photos & Docs
    photos_reception JSONB,
    facture_url TEXT,

    -- Notes
    notes TEXT,

    -- Audit
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_achats_opportunite ON achats(opportunite_id);
CREATE INDEX idx_achats_date ON achats(date_achat DESC);
CREATE INDEX idx_achats_statut_livraison ON achats(statut_livraison);

-- =======================
-- TABLE: ventes
-- =======================
CREATE TABLE IF NOT EXISTS ventes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    achat_id UUID NOT NULL REFERENCES achats(id) ON DELETE CASCADE,

    -- Annonce LeBonCoin
    plateforme VARCHAR(50) NOT NULL DEFAULT 'leboncoin',
    url_annonce TEXT,
    id_annonce_externe VARCHAR(100),

    -- Prix
    prix_affiche DECIMAL(10,2) NOT NULL,
    prix_negocie DECIMAL(10,2),
    prix_final DECIMAL(10,2),

    -- Dates
    date_publication TIMESTAMP NOT NULL DEFAULT NOW(),
    date_vente TIMESTAMP,
    delai_vente INTEGER GENERATED ALWAYS AS (EXTRACT(DAY FROM date_vente - date_publication)) STORED,

    -- Statistiques annonce
    nb_vues INTEGER DEFAULT 0,
    nb_messages INTEGER DEFAULT 0,
    nb_appels INTEGER DEFAULT 0,
    nb_favoris INTEGER DEFAULT 0,

    -- Statut
    statut VARCHAR(50) NOT NULL DEFAULT 'EN_LIGNE',
    -- EN_LIGNE, OPTION, VENDU, RETIREE, EXPIREE

    -- Acheteur
    acheteur_nom VARCHAR(255),
    acheteur_type VARCHAR(50), -- particulier, professionnel
    acheteur_note DECIMAL(3,2),

    -- Livraison/Remise
    mode_remise VARCHAR(50), -- main_propre, envoi, livraison
    frais_expedition DECIMAL(10,2) DEFAULT 0,

    -- Performance
    taux_conversion DECIMAL(5,2), -- nb_messages / nb_vues

    -- Notes
    notes TEXT,

    -- Audit
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ventes_achat ON ventes(achat_id);
CREATE INDEX idx_ventes_statut ON ventes(statut);
CREATE INDEX idx_ventes_date_publication ON ventes(date_publication DESC);
CREATE INDEX idx_ventes_plateforme ON ventes(plateforme);

-- =======================
-- TABLE: transactions
-- =======================
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    achat_id UUID REFERENCES achats(id) ON DELETE CASCADE,
    vente_id UUID REFERENCES ventes(id) ON DELETE CASCADE,

    -- Calculs P&L
    cout_achat DECIMAL(10,2) NOT NULL,
    prix_vente DECIMAL(10,2),
    frais_totaux DECIMAL(10,2) DEFAULT 0,

    marge_brute DECIMAL(10,2) GENERATED ALWAYS AS (COALESCE(prix_vente, 0) - cout_achat) STORED,
    marge_nette DECIMAL(10,2) GENERATED ALWAYS AS (COALESCE(prix_vente, 0) - cout_achat - COALESCE(frais_totaux, 0)) STORED,
    roi_reel DECIMAL(10,2) GENERATED ALWAYS AS (
        CASE
            WHEN cout_achat > 0 THEN ((COALESCE(prix_vente, 0) - cout_achat - COALESCE(frais_totaux, 0)) / cout_achat * 100)
            ELSE 0
        END
    ) STORED,

    -- Timing
    duree_cycle INTEGER, -- jours entre achat et vente

    -- Statut
    statut VARCHAR(50) DEFAULT 'EN_COURS',
    -- EN_COURS, COMPLETE, ANNULEE, PERTE

    -- Métadonnées
    tags TEXT[],
    notes TEXT,

    -- Audit
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transactions_achat ON transactions(achat_id);
CREATE INDEX idx_transactions_vente ON transactions(vente_id);
CREATE INDEX idx_transactions_statut ON transactions(statut);
CREATE INDEX idx_transactions_roi ON transactions(roi_reel DESC);

-- =======================
-- TABLE: prix_reference
-- =======================
CREATE TABLE IF NOT EXISTS prix_reference (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Identification produit
    marque VARCHAR(100) NOT NULL,
    modele VARCHAR(255) NOT NULL,
    categorie VARCHAR(100),
    sous_categorie VARCHAR(100),

    -- Prix
    prix_neuf_moyen DECIMAL(10,2),
    prix_occasion_bon DECIMAL(10,2),
    prix_occasion_moyen DECIMAL(10,2),
    prix_occasion_mauvais DECIMAL(10,2),

    -- Sources
    sources JSONB, -- [{source: "leboncoin", prix: 450, date: "2024-10-31"}, ...]
    nb_observations INTEGER DEFAULT 1,
    derniere_observation TIMESTAMP,

    -- Statistiques
    prix_min DECIMAL(10,2),
    prix_max DECIMAL(10,2),
    ecart_type DECIMAL(10,2),

    -- Métadonnées
    popularite INTEGER DEFAULT 0,
    demande VARCHAR(50), -- faible, moyenne, forte

    -- Audit
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    UNIQUE(marque, modele)
);

CREATE INDEX idx_prix_ref_marque ON prix_reference(marque);
CREATE INDEX idx_prix_ref_categorie ON prix_reference(categorie);
CREATE INDEX idx_prix_ref_updated ON prix_reference(updated_at DESC);

-- =======================
-- TABLE: marques
-- =======================
CREATE TABLE IF NOT EXISTS marques (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Identité
    nom VARCHAR(100) NOT NULL UNIQUE,
    nom_alternatifs TEXT[], -- variations, fautes courantes

    -- Classification
    categorie VARCHAR(100),
    segment VARCHAR(50), -- premium, milieu_gamme, entree_gamme, gsb

    -- Scoring
    multiplicateur_roi DECIMAL(4,2) DEFAULT 1.5,
    fiabilite_score DECIMAL(3,2) DEFAULT 0.5,

    -- Patterns reconnaissance
    patterns_regex TEXT[],
    patterns_modeles TEXT[],

    -- Statistiques
    nb_detections INTEGER DEFAULT 0,
    nb_achats INTEGER DEFAULT 0,
    taux_conversion DECIMAL(5,2),
    roi_moyen DECIMAL(10,2),

    -- Notes
    notes TEXT,
    actif BOOLEAN DEFAULT true,

    -- Audit
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_marques_segment ON marques(segment);
CREATE INDEX idx_marques_actif ON marques(actif);
CREATE INDEX idx_marques_roi ON marques(multiplicateur_roi DESC);

-- =======================
-- TABLE: alertes
-- =======================
CREATE TABLE IF NOT EXISTS alertes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Type
    type VARCHAR(50) NOT NULL,
    -- OPPORTUNITE_DETECTEE, ENCHERE_BIENTOT_FINIE, PRIX_BAISSE, VENTE_RAPIDE, ANOMALIE

    niveau VARCHAR(20) NOT NULL DEFAULT 'INFO',
    -- INFO, WARNING, URGENT, CRITIQUE

    -- Référence
    opportunite_id UUID REFERENCES opportunites(id) ON DELETE CASCADE,
    achat_id UUID REFERENCES achats(id) ON DELETE CASCADE,
    vente_id UUID REFERENCES ventes(id) ON DELETE CASCADE,

    -- Message
    titre VARCHAR(255) NOT NULL,
    message TEXT,
    donnees JSONB,

    -- Notification
    notifie BOOLEAN DEFAULT false,
    canal_notification VARCHAR(50), -- telegram, email, webhook
    date_notification TIMESTAMP,

    -- Statut
    lue BOOLEAN DEFAULT false,
    traitee BOOLEAN DEFAULT false,

    -- Audit
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alertes_type ON alertes(type);
CREATE INDEX idx_alertes_niveau ON alertes(niveau);
CREATE INDEX idx_alertes_notifie ON alertes(notifie);
CREATE INDEX idx_alertes_created ON alertes(created_at DESC);

-- =======================
-- TABLE: configurations
-- =======================
CREATE TABLE IF NOT EXISTS configurations (
    cle VARCHAR(100) PRIMARY KEY,
    valeur JSONB NOT NULL,
    description TEXT,
    categorie VARCHAR(50),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Configurations par défaut
INSERT INTO configurations (cle, valeur, description, categorie) VALUES
('scoring.seuil_alerte', '0.7', 'Score minimum pour déclencher une alerte', 'scoring'),
('scoring.roi_minimum', '150', 'ROI minimum en % pour considérer une opportunité', 'scoring'),
('encheres.bid_max_ratio', '0.6', 'Ratio max du prix de revente estimé pour enchérir', 'encheres'),
('scanner.intervalle_minutes', '30', 'Intervalle de scan en minutes', 'scanner'),
('scanner.mots_cles', '["hilti", "festool", "milwaukee", "makita", "dewalt", "bosch professionnel"]', 'Mots-clés à scanner', 'scanner'),
('capital.disponible', '1000', 'Capital disponible pour achats en euros', 'finance'),
('vente.delai_max_jours', '14', 'Délai maximum de vente souhaité en jours', 'vente')
ON CONFLICT (cle) DO NOTHING;

-- =======================
-- TABLE: logs_activite
-- =======================
CREATE TABLE IF NOT EXISTS logs_activite (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Action
    action VARCHAR(100) NOT NULL,
    acteur VARCHAR(100) DEFAULT 'system',

    -- Contexte
    entite_type VARCHAR(50), -- opportunite, achat, vente, etc.
    entite_id UUID,

    -- Détails
    details JSONB,
    ancienne_valeur JSONB,
    nouvelle_valeur JSONB,

    -- Métadonnées
    ip_address VARCHAR(45),
    user_agent TEXT,

    -- Timestamp
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_logs_action ON logs_activite(action);
CREATE INDEX idx_logs_entite ON logs_activite(entite_type, entite_id);
CREATE INDEX idx_logs_created ON logs_activite(created_at DESC);

-- =======================
-- FONCTIONS & TRIGGERS
-- =======================

-- Fonction: Update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers updated_at
CREATE TRIGGER update_opportunites_updated_at BEFORE UPDATE ON opportunites
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_achats_updated_at BEFORE UPDATE ON achats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ventes_updated_at BEFORE UPDATE ON ventes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prix_reference_updated_at BEFORE UPDATE ON prix_reference
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_marques_updated_at BEFORE UPDATE ON marques
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Fonction: Logger les changements
CREATE OR REPLACE FUNCTION log_opportunite_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.statut != NEW.statut THEN
        INSERT INTO logs_activite (action, entite_type, entite_id, ancienne_valeur, nouvelle_valeur)
        VALUES (
            'CHANGEMENT_STATUT',
            'opportunite',
            NEW.id,
            jsonb_build_object('statut', OLD.statut),
            jsonb_build_object('statut', NEW.statut)
        );
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER log_opportunite_statut_changes AFTER UPDATE ON opportunites
    FOR EACH ROW EXECUTE FUNCTION log_opportunite_changes();

-- =======================
-- VUES UTILES
-- =======================

-- Vue: Dashboard KPIs
CREATE OR REPLACE VIEW v_kpis_dashboard AS
SELECT
    COUNT(DISTINCT o.id) as total_opportunites,
    COUNT(DISTINCT a.id) as total_achats,
    COUNT(DISTINCT v.id) as total_ventes,
    COALESCE(SUM(a.cout_total), 0) as capital_investi,
    COALESCE(SUM(v.prix_final), 0) as ca_realise,
    COALESCE(SUM(t.marge_nette), 0) as profit_total,
    COALESCE(AVG(t.roi_reel), 0) as roi_moyen,
    COALESCE(AVG(v.delai_vente), 0) as delai_vente_moyen
FROM opportunites o
LEFT JOIN achats a ON o.id = a.opportunite_id
LEFT JOIN ventes v ON a.id = v.achat_id
LEFT JOIN transactions t ON a.id = t.achat_id;

-- Vue: Top opportunités actives
CREATE OR REPLACE VIEW v_top_opportunites AS
SELECT
    id,
    titre,
    source,
    prix_actuel,
    prix_revente_estime,
    roi_estime,
    score,
    date_fin,
    statut,
    marques_detectees,
    url_annonce
FROM opportunites
WHERE statut IN ('DETECTE', 'ANALYSE', 'VALIDE', 'SUIVI')
    AND (date_fin IS NULL OR date_fin > NOW())
    AND score > 0.5
ORDER BY score DESC, roi_estime DESC
LIMIT 50;

-- Vue: Performance par marque
CREATE OR REPLACE VIEW v_performance_marques AS
SELECT
    m.nom as marque,
    m.segment,
    COUNT(DISTINCT o.id) as nb_detections,
    COUNT(DISTINCT a.id) as nb_achats,
    COUNT(DISTINCT v.id) as nb_ventes,
    COALESCE(AVG(t.roi_reel), 0) as roi_moyen,
    COALESCE(AVG(v.delai_vente), 0) as delai_vente_moyen,
    COALESCE(SUM(t.marge_nette), 0) as profit_total
FROM marques m
LEFT JOIN opportunites o ON o.marques_detectees::text LIKE '%' || m.nom || '%'
LEFT JOIN achats a ON o.id = a.opportunite_id
LEFT JOIN ventes v ON a.id = v.achat_id
LEFT JOIN transactions t ON a.id = t.achat_id
WHERE m.actif = true
GROUP BY m.id, m.nom, m.segment
ORDER BY roi_moyen DESC;

-- Vue: Inventaire en cours
CREATE OR REPLACE VIEW v_inventaire_actuel AS
SELECT
    a.id as achat_id,
    o.titre,
    o.marques_detectees,
    a.date_achat,
    a.cout_total,
    v.statut as statut_vente,
    v.prix_affiche,
    v.nb_vues,
    v.nb_messages,
    EXTRACT(DAY FROM NOW() - a.date_achat) as jours_en_stock,
    o.prix_revente_estime
FROM achats a
JOIN opportunites o ON a.opportunite_id = o.id
LEFT JOIN ventes v ON a.id = v.achat_id
WHERE v.statut IS NULL OR v.statut NOT IN ('VENDU')
ORDER BY a.date_achat;

-- =======================
-- DONNÉES DE RÉFÉRENCE
-- =======================

-- Insert marques premium
INSERT INTO marques (nom, nom_alternatifs, categorie, segment, multiplicateur_roi, patterns_regex) VALUES
('Hilti', ARRAY['HILTI', 'hilty'], 'Outillage électroportatif', 'premium', 2.5, ARRAY['TE\d+', 'DD\d+', 'SID', 'SF']),
('Festool', ARRAY['FESTOOL', 'festo'], 'Outillage électroportatif', 'premium', 2.3, ARRAY['TS\d+', 'OF\d+', 'DOMINO', 'CTL']),
('Milwaukee', ARRAY['MILWAUKEE', 'milwaukie'], 'Outillage électroportatif', 'premium', 2.1, ARRAY['M\d{2}', 'FUEL', 'ONE-KEY']),
('Makita', ARRAY['MAKITA', 'mackita'], 'Outillage électroportatif', 'premium', 2.0, ARRAY['D[A-Z]{2}\d{3}', 'DHP', 'DTD']),
('DeWalt', ARRAY['DEWALT', 'de walt'], 'Outillage électroportatif', 'premium', 1.9, ARRAY['DC[A-Z]\d{3}', 'DCD', 'DCF']),
('Bosch Professional', ARRAY['BOSCH PRO', 'bosch bleu'], 'Outillage électroportatif', 'milieu_gamme', 1.7, ARRAY['GBH', 'GSR', 'GWS']),
('Metabo', ARRAY['METABO'], 'Outillage électroportatif', 'milieu_gamme', 1.6, ARRAY['SB', 'BS', 'W']),
('Ryobi', ARRAY['RYOBI', 'ryobbi'], 'Outillage électroportatif', 'entree_gamme', 1.3, ARRAY['R\d{2}', 'ONE\+'])
ON CONFLICT (nom) DO NOTHING;

-- =======================
-- PERMISSIONS (Optionnel)
-- =======================

-- Créer un rôle read-only pour monitoring
-- CREATE ROLE flipfinder_readonly;
-- GRANT CONNECT ON DATABASE outillage TO flipfinder_readonly;
-- GRANT USAGE ON SCHEMA public TO flipfinder_readonly;
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO flipfinder_readonly;

-- =======================
-- COMMENTAIRES
-- =======================

COMMENT ON TABLE opportunites IS 'Opportunités détectées par le scanner';
COMMENT ON TABLE achats IS 'Achats réalisés';
COMMENT ON TABLE ventes IS 'Annonces et ventes sur plateformes';
COMMENT ON TABLE transactions IS 'Cycle complet achat-vente avec P&L';
COMMENT ON TABLE prix_reference IS 'Prix de référence du marché';
COMMENT ON TABLE marques IS 'Référentiel des marques';
COMMENT ON TABLE alertes IS 'Système d''alertes et notifications';
COMMENT ON TABLE configurations IS 'Paramètres système';
COMMENT ON TABLE logs_activite IS 'Logs d''audit et traçabilité';

-- Fin du script
