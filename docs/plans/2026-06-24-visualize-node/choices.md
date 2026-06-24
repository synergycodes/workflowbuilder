● **Crystallize: Visualize node (generalizacja markdown-preview)**

Ewolucja noda `ai-studio/markdown-preview` w generyczny node "Visualize", który auto-dostosowuje renderer do formatu outputu, ma tryby/parametry, style, export i sensowny empty-state.
2026-06-24

● **Context**

Punkt wyjścia (zbudowane, niepushowane, branch librowski/AI-Studio-UX):

- Node `ai-studio/markdown-preview`: 4-plikowa anatomia (index/schema/uischema/default-properties), executor no-op `{previewed:true}` w workerze (domena + registry).
- UI: karta wstrzykiwana dekoratorem `OptionalNodeContent` -> renderuje się W nodzie na canvasie, skaluje z zoomem; czyta output noda wpiętego wyżej przez krawędź (getStoreEdges/getStoreNodes + extractOutputText); react-markdown+remark-gfm; motyw przez tokeny `--ax-*`; animacja reveal po `completed`; pozycja absolutna pod nodem (top: calc(100% + 2.75rem)).
- Silnik = ścisły DAG (bez pętli). Executor NIE zna krawędzi (lookup upstreamu robi UI). react-markdown+remark-gfm już w deps ai-studio.
- Reguły frontu: CSS Modules, function declarations, named exports, @phosphor-icons/react, React 19, bez inline styles. SDK node-templates renderują nody; konsument dokłada treść tylko przez OptionalNodeContent (nie ma custom node-renderera).

Wizja: generyczny "Visualize" -> markdown to tylko jeden tryb; auto-detekcja formatu + override param; wykresy; diagramy (mamy React Flow); ikonografika/infografika; style/motywy; EXPORT; predefiniowany rozmiar + empty-state ("tu zobaczysz wynik po odpaleniu workflow"); jak najwięcej sensownych feature'ów; dobra wizualizacja outputów tekstowych.

● **Decision (1/ Tożsamość)**

▶ A — Generalizuj/zastąp: rename `ai-studio/markdown-preview` → `ai-studio/visualize`. Markdown staje się jednym z trybów/rendererów. Flagowy template przepinamy. Rdzeń (dekorator OptionalNodeContent, karta, reveal, lookup upstreamu) zostaje jako baza.

● **Decision (2/ Model trybu)**

▶ A — Auto domyślnie + override: `mode: auto | markdown | json | table | chart | diagram | text`, default `auto`. W `auto` heurystyka format->renderer; badge "Auto › X" na karcie; override wymusza konkretny renderer.

● **Insight (research bibliotek, 2026-06-24, źródła zweryfikowane: npm/bundlephobia/docs)**

✶ Charts: **recharts 3.9.0** - React 19 ✅ (explicit peer), MIT, ~143KB gzip, świetne defaulty, deklaratywne <BarChart>/<LineChart>/<PieChart>/<AreaChart>. Lżejsza alternatywa: chart.js+react-chartjs-2 (~68KB). UNIKAĆ: Tremor (NIE React 19), ECharts (~359KB), html2canvas.
✶ Diagramy: **mermaid 11.15.0** -> SVG w przeglądarce (`mermaid.render` zwraca {svg}), MIT, agnostyczny. DUŻY: ~150KB gzip -> **lazy-load przez dynamic import()**.
⚑ KLUCZOWE: zagnieżdżanie React Flow w nodzie React Flow **oficjalnie nie działa** - offset pozycji i zepsuty drag/pan gdy zoom != 1 (xyflow Discussion #4743). => diagramy robimy jako **statyczny SVG z mermaid w nodzie**, NIE zagnieżdżony React Flow.
✶ Export: **html-to-image 1.11.13** (~5KB, MIT, toPng/toSvg/toBlob), + fast-path natywnej serializacji SVG gdy treść to już SVG (recharts/mermaid). Gotcha: web-fonty (inline @font-face / fontEmbedCSS), cross-origin images taintują canvas, czasem 2 passy.
✶ Clipboard obrazka: `navigator.clipboard.write([ClipboardItem{image/png}])` działa Chromium/Safari; **Firefox nie** -> fallback download. Wymaga secure context + gestu.
✶ JSON tree + tabela: **hand-roll** (0KB, trywialne, pełna kontrola stylu). Detekcja formatu: **hand-roll** try-parse + regex (JSON gate na `{`/`[` + typeof object; markdown wymaga >=2 markerów; CSV >=2 kolumny i wiersze; mermaid: regex keyword + `mermaid.parse(suppressErrors)`).

● **Decision (3/ Zestaw rendererów)**

▶ A — Pełny zestaw (7) jako CEL: `markdown` · `text` · `json` (drzewo) · `table` · `stat-cards` (infografika klucz->wartość) · `chart` (recharts) · `diagram` (mermaid->SVG, lazy). Budowę sekwencjonujemy osobną decyzją (fale MVP -> charts -> diagramy).

● **Decision (4/ Biblioteka wykresów)**

▶ A — recharts 3.9.0 (renderuje SVG: ostre w zoomie + spójna SVG-owa ścieżka exportu z mermaidem). Lazy-loaded. Settled też: mermaid->SVG (diagramy, lazy) + html-to-image (export DOM).

● **Decision (5/ Export)**

▶ A — PNG download + Copy image (Chromium/Safari; Firefox→download fallback) + Copy source (surowy tekst/md/JSON). Mechanizm: natywna serializacja SVG dla chart/diagram (ostry, zero libki) + html-to-image dla DOM (md/json/table/stat-cards). Bonus "Download SVG" dla renderów wektorowych. Przyciski na nagłówku karty.

● **Decision (6/ Agresywność auto)**

▶ A — Auto konserwatywne + sugestia + override. Mapowanie: markdown->md, mermaid fence/keyword->diagram, CSV->table, JSON {tablica obiektów->table, płaski skalarny obiekt->stat-cards, zagnieżdżony->json-tree}, reszta->text. Wykres auto TYLKO przy jednoznacznym kształcie (`{label,value}`/`{x,y}`), inaczej tabela + chip "spróbuj jako wykres". Override wymusza dowolny renderer. Bonus: lekki "chart spec" envelope (`{type,data}`) który agent może świadomie wyemitować -> pewny auto-wykres.

● **Decision (7/ Style/motywy)**

▶ B (na razie wystarczy) — karta dziedziczy motyw apki przez tokeny `--ax-*`, bez param `theme`/presetów. Spójne z edytorem, zero dodatkowej roboty. Presety motywów = ewentualny późniejszy fast-follow (recharts series colors + mermaid themeVariables z tych samych zmiennych).

● **Decision (8/ Rozmiar + empty-state)**

▶ A — Stała karta visualize widoczna ZAWSZE (~360×260), empty-state z placeholderem ("Tu pojawi się wizualizacja po uruchomieniu workflow" + ikona) gdy brak wyniku; po `completed` wypełnia się, overflow scrolluje. Przycisk **Expand** -> wyśrodkowany fullscreen modal (pełny rozmiar, czytelny chart/diagram, miejsce na export). Zmienia obecne zachowanie (dziś karta tylko po completed) -> dla visualize renderujemy zawsze.

● **Decision (9/ Sekwencja budowy)**

▶ B — Wszystko w jednym przebiegu (pełny zestaw naraz). Świadomie wbrew rekomendacji fal; budujemy całość, weryfikujemy na końcu smoke testem. (Wewnętrznie i tak składam komponenty modułowo, ale dowóz = jeden przebieg.)

● **Decisions**

1. Tożsamość → Generalizuj: rename `markdown-preview` → `ai-studio/visualize`; markdown = jeden z trybów.
2. Model trybu → `mode: auto | markdown | text | json | table | stat-cards | chart | diagram`, default `auto` (detekcja) + override.
3. Zestaw rendererów → pełny (7): markdown, text, json-tree, table, stat-cards, chart, diagram.
4. Biblioteka wykresów → recharts 3.9.0 (SVG, lazy). Settled: mermaid->SVG (lazy) + html-to-image.
5. Export → PNG download + Copy image (Firefox->download fallback) + Copy source; SVG-fast-path dla chart/diagram; bonus Download SVG.
6. Auto → konserwatywne + sugestia + override; chart auto tylko przy `{label,value}`/`{x,y}`; opcjonalny chart-spec envelope `{type,data}`.
7. Style → na razie tylko motyw apki (`--ax-*`), bez presetów (fast-follow).
8. Rozmiar/empty → stała karta zawsze (~360×260) + empty-state placeholder + Expand fullscreen modal.
9. Sekwencja → jeden przebieg (pełny zestaw).

● **Plan** (jeden przebieg)

1. **Rename node** — `nodes/markdown-preview/` → `nodes/visualize/`; typ `ai-studio/visualize`; paleta (label "Visualize", icon np. `ChartLineUp`/`Eye`); worker: domena `VisualizeNode` + executor `executeVisualize` (no-op `{visualized:true}`) + registry; przepięcie flagowego template'u (`preview-1` -> visualize).
2. **Schema/params** — `mode` (enum, default auto) w schema/uischema/default-properties.
3. **detectFormat util** — `detectFormat(text)` -> {format, shape}; reguły: JSON(gate `{`/`[`+typeof object){array-of-objects->table, flat-scalar->stat-cards, {label,value}/{x,y}->chart-eligible, nested->tree}; mermaid(keyword+parse)->diagram; CSV(>=2kol,>=2wier)->table; markdown(>=2 markery)->markdown; else text. Chart-spec envelope `{type,data}` -> chart.
4. **Renderery** (registry mode->komponent): markdown (jest), text (`<pre>`), json-tree (hand-roll, zwijane), table (hand-roll), stat-cards (hand-roll kafelki), chart (recharts, **lazy** `React.lazy`/dynamic import), diagram (mermaid, **lazy**, `mermaid.render`->SVG, try/catch->fallback code-block).
5. **VisualizeCard** (dekorator OptionalNodeContent) — renderuje ZAWSZE dla visualize node; empty-state placeholder gdy brak outputu; badge "Auto › X"; dropdown override (mode); reveal anim po completed; nagłówek z akcjami: Expand, Download PNG, Copy image, Copy source, (Download SVG dla wektorowych).
6. **Expand modal** — overlay (wzorzec jak disclaimer-modal) renderujący ten sam renderer w pełnym rozmiarze + akcje export.
7. **export util** — natywna serializacja SVG (chart/diagram) -> PNG/SVG; html-to-image dla DOM; clipboard image + Firefox download fallback; copy source; fontEmbedCSS + 2-pass guard.
8. **deps** — `recharts`, `mermaid`, `html-to-image` (react-markdown+remark-gfm już są).
9. **Verify** — typecheck+lint (ai-studio+worker); smoke test: flagship Run -> markdown auto; podmiana inputu na JSON/CSV/mermaid/{label,value} -> odpowiedni renderer; override; Expand; export PNG/copy; empty-state przed Run.

● **Risks**

⚑ Bundle bloat (recharts ~143KB + mermaid ~150KB) → **lazy-load** obu (dynamic import w komponencie renderera); bazowy bundle bez zmian.
⚑ Nested React Flow w nodzie nie działa (zoom!=1) → diagramy jako statyczny SVG z mermaida, NIE zagnieżdżony React Flow.
⚑ Export: web-fonty/CORS taint → inline fontEmbedCSS, assety lokalnie, 2-pass; SVG-fast-path omija problem dla chart/diagram.
⚑ mermaid render error na złym wejściu od LLM → try/catch, fallback do renderera `text`/code-block + komunikat.
⚑ Auto false-positive → reguły konserwatywne + override + chip sugestii.
⚑ Clipboard image w Firefox brak → feature-detect `ClipboardItem.supports` + fallback download.
⚑ Duży diff (jeden przebieg) → modułowe komponenty + smoke test na końcu; commit dopiero po weryfikacji (niepushowane).

● **Architecture**

```
  upstream node output (via edge lookup, extractOutputText)
        │
        ▼
  detectFormat(text) ──► {format, shape}        mode param (auto│override)
        │                                              │
        └──────────────► resolveRenderer(mode, detected) ◄──┘
                               │
            ┌──────────┬───────┼────────┬─────────┬──────────┬──────────┐
            ▼          ▼       ▼        ▼         ▼          ▼          ▼
         markdown    text   json-tree table  stat-cards  chart       diagram
          (md)      (<pre>) (handroll)(hand) (hand)   (recharts,   (mermaid,
                                                        lazy,SVG)    lazy,SVG)
            └──────────┴───────┴────────┴─────────┴──────────┴──────────┘
                               │
                     VisualizeCard (always-on, empty-state, badge, reveal)
                        │                          │
                   Expand modal               export (PNG/Copy/SVG/source)
```
