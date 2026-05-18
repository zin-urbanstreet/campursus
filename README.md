# Campus Elgg · Live-Cockpit

Ein interaktives Investoren-Cockpit zur Renditesimulation für das Mischnutzungsprojekt **Campus Elgg** (Tetris AG / Viaholding AG) in Elgg ZH. Sechs Gebäude in zwei Etappen — Gewerbe, Büro, Wotel — mit Live-Berechnung relevanter Kennzahlen und Szenarienverwaltung.

![Status](https://img.shields.io/badge/Status-Aktiv-success) ![Stand](https://img.shields.io/badge/Stand-Mai_2026-blue) ![Lizenz](https://img.shields.io/badge/Lizenz-Vertraulich-red)

## Funktionen

- **Live-Simulation** mit 10 Slidern in 4 Themenblöcken (Mietzinse, Anlagekosten, Finanzierung, Nebenerträge)
- **Sofortige Renditeauswirkung** sichtbar in KPI-Karten, Zielbalken, Mietertrags-Aufschlüsselung und Donut-Diagramm
- **Szenarien speichern, laden, löschen** — Zwischenstände bleiben im Browser erhalten (localStorage)
- **JSON-Export/Import** der gesamten Konfiguration und aller Szenarien für Backup oder Versandt an Dritte
- **Reset auf Base Case** mit einem Klick
- **Etappe 1 / Gesamtprojekt** Toggle für Detail- und Konsolidierungssicht
- **Responsive Design** funktioniert auf Desktop, Tablet, Mobile

## Schnellstart

### Lokal öffnen
```bash
# 1. Repository klonen
git clone https://github.com/IHR-USER/campus-elgg-cockpit.git
cd campus-elgg-cockpit

# 2. Im Browser öffnen (kein Build-Schritt nötig)
open index.html
# oder einen lokalen Server starten:
python3 -m http.server 8000
# → http://localhost:8000
```

### Online via GitHub Pages
Sobald das Repo öffentlich ist und GitHub Pages aktiviert wurde (Settings → Pages → Branch `main`, Folder `/ (root)`), ist das Cockpit unter `https://IHR-USER.github.io/campus-elgg-cockpit/` erreichbar.

## Projekt-Struktur

```
campus-elgg-cockpit/
├── index.html                          # Haupt-Einstiegspunkt (Single Page)
├── style.css                           # Swiss-Editorial-Design
├── cockpit.js                          # Berechnungs-Engine + Interaktion
├── Campus_Elgg_Renditemodell.xlsx     # Excel-Modell mit 14 Reitern, 613 Formeln
├── docs/
│   ├── 010_Katasterplan.pdf            # Grundstücksdaten (Tetris/Urbanstreet)
│   ├── Methabau_Leubern_Referenz.pdf   # Vergleichsprojekt
│   └── Umgebungsplan.png               # Parkplatz-Layout
├── README.md                           # Diese Datei
└── .gitignore
```

## Berechnungs-Modell

### Base Case (entspricht Excel V1, Stand Mai 2026)

| Parameter | Wert | Quelle |
|---|---:|---|
| Anlagekosten Etappe 1 | CHF 37.5 Mio. | KV März 2026 |
| Anlagekosten Total | CHF 75.0 Mio. | KV März 2026 |
| Hauptnutzfläche Etappe 1 | 7'051.82 m² | Flächenspiegel |
| Bauland Total | 24'830.99 m² | Katasterplan 010 |
| Soll-Mietertrag HNF E1 (inkl. +20%) | CHF 2'054'974 | Modell |
| Parkplatz-Ertrag E1 | CHF 100'080 | 76 PP × Methabau-Preise |
| PV-Ertrag (3 Häuser × 20k) | CHF 60'000 | Annahme konservativ |
| **Bruttorendite Total (Soll)** | **≈ 5.91%** | Modell |
| **Ziel KV** | **6.37%** | KV |

### Slider-Wirkung

| Slider | Wirkt auf | Range | Schritt |
|---|---|---|---|
| Mietzins-Multiplikator | Alle HNF-Mietzinse | 60–160% | 1% |
| Leerstand | Mietausfall HNF + Nebenflächen | 0–20% | 0.5% |
| Nebenflächen-Umlage | Aufschlag durch Methabau-Methode | 0–15% | 0.5% |
| Baukosten-Faktor | Alle Anlagekosten BKP 0–9 | 80–130% | 1% |
| Landwert-Umlagerung | Anteil BKP 1 → BKP 0 | 0–100% | 5% |
| Eigenkapital-Quote | EK-Anteil Finanzierung | 20–60% | 0.5% |
| FK-Zinssatz | Hypothekarzins | 0.5–6% | 0.1% |
| Bewirtschaftung | % vom Soll-Mietzins | 10–35% | 0.5% |
| Parkplatz-Faktor | PP-Mieten-Multiplikator | 50–200% | 5% |
| PV-Ertrag pro Haus | Absolutbetrag CHF/Jahr | 0–80'000 | 2'000 |

### Methodik

- **Mietausfall** wird nur auf HNF + Nebenflächen-Umlage angewendet (PP-Erträge separat bewirtschaftet, PV vertraglich gesichert)
- **Etappe 2** rechnet mit höherem Anlauf-Leerstand (10% statt 5%) und leichtem Baukostenaufschlag (×1.04)
- **Nebenflächen-Methode** folgt der Methabau-Leubern-Referenz: anteilsmässige Umlage von Treppenhaus/WC/Erschliessung auf HNF-Mieten
- **Landwert-Umlagerung** (Slider C-2) bildet die wirtschaftliche Sicht ab, dass Quartierplan- und Erschliessungskosten Teil des Landwerts sind — verändert die Bruttorendite nicht, aber zeigt den effektiven Landwert pro m²

## Daten & Privatsphäre

- **Keine Cloud-Verbindung**, kein Tracking, keine externen API-Calls
- Alle Szenarien werden ausschliesslich im Browser des Nutzers (localStorage) gespeichert
- JSON-Export erfolgt lokal als Download
- Schriften werden von Google Fonts geladen (Fraunces, Inter Tight, JetBrains Mono) — optional kann das durch lokale Hosting der WOFF2-Dateien ersetzt werden

## GitHub-Publizierung

1. Neues Repository auf GitHub anlegen (privat oder öffentlich)
2. Lokales Repo initialisieren:
   ```bash
   cd campus-elgg-cockpit
   git init
   git add .
   git commit -m "Initial commit: Campus Elgg Live-Cockpit"
   git branch -M main
   git remote add origin https://github.com/IHR-USER/campus-elgg-cockpit.git
   git push -u origin main
   ```
3. Für GitHub Pages: Repo Settings → Pages → Source = `Deploy from a branch` → Branch = `main` / `(root)` → Save
4. Nach 1–2 Minuten ist das Cockpit unter `https://IHR-USER.github.io/campus-elgg-cockpit/` erreichbar

## Browser-Kompatibilität

Modernes ES2018+ (alle aktuellen Chrome, Firefox, Safari, Edge). Kein Internet Explorer.

## Vertraulichkeit

Diese Unterlage ist **vertraulich** und nur für den intern berechtigten Empfängerkreis bestimmt (VR Viaholding AG, Tetris AG, beratende Stellen). Werte beruhen auf Annahmen und sind nicht garantiert. Stand: März/Mai 2026.

## Lizenz

Proprietär · Tetris AG / Viaholding AG · 2026
