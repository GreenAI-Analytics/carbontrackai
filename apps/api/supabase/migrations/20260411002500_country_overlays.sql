-- ============================================================================
-- Country-Specific Overlays — Migration 25
-- Per-country regulatory extensions, filing portals, languages, labour laws.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.country_overlays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  iso_code VARCHAR(2) UNIQUE NOT NULL,
  country_name VARCHAR(100) NOT NULL,
  -- Filing
  filing_portal_name VARCHAR(200),
  filing_portal_url TEXT,
  filing_language VARCHAR(50),
  -- Emission factors
  national_factor_source VARCHAR(200),
  national_factor_url TEXT,
  -- Labour extensions
  labour_reporting_standard VARCHAR(200),
  labour_reporting_description TEXT,
  -- Language
  official_languages TEXT[],
  requires_local_language BOOLEAN DEFAULT true,
  -- Metadata
  csrd_transposition_law VARCHAR(200),
  transposition_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE public.country_overlays IS 'Per-member-state regulatory configuration for multi-country SMEs';
COMMENT ON COLUMN public.country_overlays.filing_portal_name IS 'National OAM portal (e.g. Unternehmensregister for DE, INPI for FR)';
COMMENT ON COLUMN public.country_overlays.labour_reporting_standard IS 'National labour reporting extension (e.g. BDESE for France)';
COMMENT ON COLUMN public.country_overlays.national_factor_source IS 'National emission factor authority (e.g. ADEME for FR, UBA for DE)';

-- Seed major EU countries
INSERT INTO public.country_overlays (iso_code, country_name, filing_portal_name, filing_portal_url, filing_language, national_factor_source, national_factor_url, labour_reporting_standard, labour_reporting_description, official_languages, requires_local_language, csrd_transposition_law, transposition_notes)
VALUES
  ('DE', 'Germany',
   'Unternehmensregister', 'https://www.unternehmensregister.de',
   'de',
   'Umweltbundesamt (UBA)', 'https://www.umweltbundesamt.de',
   'LkSG (Lieferkettensorgfaltspflichtengesetz)',
   'Supply Chain Due Diligence Act — requires human rights and environmental due diligence for companies ≥1,000 employees',
   ARRAY['de'], true,
   'CSRD-Umsetzungsgesetz', 'Transposed via amendments to HGB. ESEF filings via Bundesanzeiger.'
  ),
  ('FR', 'France',
   'INPI (Infogreffe)', 'https://www.infogreffe.fr',
   'fr',
   'ADEME (Base Carbone)', 'https://base-empreinte.ademe.fr',
   'BDESE (Base de Données Économiques, Sociales et Environnementales)',
   'Mandatory economic, social, and environmental database — extends ESRS S1 with additional workforce metrics for companies ≥50 employees',
   ARRAY['fr'], true,
   'Ordonnance 2023-1142', 'DPEF replaced by CSRD. AMF guidance applies for listed companies.'
  ),
  ('IT', 'Italy',
   'Registro delle Imprese', 'https://www.registroimprese.it',
   'it',
   'ISPRA (Istituto Superiore per la Protezione e la Ricerca Ambientale)', 'https://www.isprambiente.gov.it',
   'D.Lgs. 125/2024',
   'CSRD transposition — extends reporting to large non-listed entities. CONSOB oversight for listed companies.',
   ARRAY['it'], true,
   'D.Lgs. 125/2024', 'Transposed CSRD into Italian law. Filing via XBRL to Registro delle Imprese.'
  ),
  ('ES', 'Spain',
   'Registro Mercantil', 'https://www.registradores.org',
   'es',
   'MITECO (Ministerio para la Transición Ecológica)', 'https://www.miteco.gob.es',
   'Ley 11/2018',
   'Non-financial reporting law — extends ESRS with additional diversity and tax transparency requirements for companies ≥250 employees',
   ARRAY['es'], true,
   'Ley 11/2018 (amended)', 'CSRD transposed via amendments to Código de Comercio. CNMV oversight for listed companies.'
  ),
  ('NL', 'Netherlands',
   'Kamer van Koophandel', 'https://www.kvk.nl',
   'nl',
   'RVO (Rijksdienst voor Ondernemend Nederland)', 'https://www.rvo.nl',
   'Wet arbeidsmarkt in balans (WAB)',
   'Labour market reforms — extends ESRS S1 with additional reporting on flexible work and self-employed contractor ratios',
   ARRAY['nl'], true,
   'Implementatiewet CSRD', 'AFM oversight for listed companies. Filing via SBR (Standard Business Reporting).'
  ),
  ('PL', 'Poland',
   'Krajowy Rejestr Sądowy (KRS)', 'https://ekrs.ms.gov.pl',
   'pl',
   'KOBiZE (Krajowy Ośrodek Bilansowania i Zarządzania Emisjami)', 'https://www.kobize.pl',
   'Ustawa o rachunkowości (Accounting Act amendments)',
   'CSRD transposition — extends reporting to large entities. KNF oversight for listed companies.',
   ARRAY['pl'], true,
   'Ustawa o rachunkowości (amended)', 'Transposed via Accounting Act amendments. ESEF filings via KRS.'
  ),
  ('AT', 'Austria',
   'Firmenbuch', 'https://www.justiz.gv.at',
   'de',
   'Umweltbundesamt (E-Control)', 'https://www.umweltbundesamt.at',
   'Nachhaltigkeitsberichtsgesetz (NaBeG)',
   'CSRD transposition — applies to large companies and listed SMEs. FMA oversight for financial institutions.',
   ARRAY['de'], true,
   'NaBeG 2024', 'Transposed via NaBeG. ESEF filings via Firmenbuch.'
  ),
  ('SE', 'Sweden',
   'Bolagsverket', 'https://www.bolagsverket.se',
   'sv',
   'Naturvårdsverket', 'https://www.naturvardsverket.se',
   'Årsredovisningslagen (ÅRL) amendments',
   'CSRD transposition — extends annual report requirements. Finansinspektionen oversight for listed companies.',
   ARRAY['sv'], true,
   'ÅRL amendments 2024', 'Transposed via ÅRL amendments. ESEF filings via Bolagsverket.'
  ),
  ('DK', 'Denmark',
   'Erhvervsstyrelsen', 'https://erhvervsstyrelsen.dk',
   'da',
   'Energistyrelsen', 'https://ens.dk',
   'Årsregnskabsloven (ÅRL) amendments',
   'CSRD transposition — extends reporting to large companies. Finanstilsynet oversight for listed companies.',
   ARRAY['da'], true,
   'ÅRL amendments 2024', 'Transposed via ÅRL amendments. ESEF filings via Erhvervsstyrelsen.'
  )
ON CONFLICT (iso_code) DO UPDATE SET
  filing_portal_name = EXCLUDED.filing_portal_name,
  filing_portal_url = EXCLUDED.filing_portal_url,
  national_factor_source = EXCLUDED.national_factor_source,
  labour_reporting_standard = EXCLUDED.labour_reporting_standard;

-- RLS — readable by all authenticated users
ALTER TABLE public.country_overlays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read country_overlays"
  ON public.country_overlays
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS idx_country_overlays_iso ON public.country_overlays(iso_code);
