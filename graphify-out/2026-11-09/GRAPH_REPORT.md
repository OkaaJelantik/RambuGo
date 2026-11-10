# Graph Report - Ina  (2026-11-09)

## Corpus Check
- 44 files · ~60,031 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: .css 5, (none) 2)

## Summary
- 476 nodes · 1027 edges · 24 communities (19 shown, 5 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 54 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d01196ca`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- App Shell & Stage Machine
- Build Tooling & Dependencies
- Product Brief & Pedagogy
- Ground Scene & Junction
- Meter Table & Perspective Revision
- Scale Guards & Body Metrics
- Scenery Art Kit
- Prop Pool & Depth Rules
- Story Beats & Dialogue Design
- Design Rules & Invariants
- End-to-End Walk Flow Tests
- Screen Projection & Painting
- Deterministic Traffic Spawner
- DOM Slot Style Helpers
- TypeScript Config
- Walk World Reducer
- Vehicle Art
- Pedestrian Art
- Depth Fade Curve
- Art Rules & Color Tokens
- Sign Description & Ordering Rules
- Traffic Density Revision

## God Nodes (most connected - your core abstractions)
1. `WalkScene()` - 53 edges
2. `App()` - 22 edges
3. `offsetX()` - 16 edges
4. `yAt()` - 16 edges
5. `pxAt()` - 15 edges
6. `placeVehicle()` - 14 edges
7. `vitest` - 13 edges
8. `measureViewport()` - 13 edges
9. `react` - 12 edges
10. `placeProp()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `Taksonomi Bentuk + Warna` --semantically_similar_to--> `Rambu Larangan`  [INFERRED] [semantically similar]
  PRODUCT.md → Ref/BAHAN AJAR_Yuk, Kenali Rambu Lalu Lintas.md
- `Taksonomi Bentuk + Warna` --semantically_similar_to--> `Rambu Peringatan`  [INFERRED] [semantically similar]
  PRODUCT.md → Ref/BAHAN AJAR_Yuk, Kenali Rambu Lalu Lintas.md
- `Ascii Art Silhouette (tidak berlabel)` --conceptually_related_to--> `Aturan Art`  [AMBIGUOUS]
  Ref/ascii-art.txt → DESIGN.md
- `Mount React di #root` --conceptually_related_to--> `Petualangan Rambu Lalu Lintas`  [INFERRED]
  index.html → PRODUCT.md
- `Enam Rambu` --shares_data_with--> `Rambu Larangan`  [INFERRED]
  PRODUCT.md → Ref/BAHAN AJAR_Yuk, Kenali Rambu Lalu Lintas.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Perangkat Kosakata Baru Hari Ini** — ref_bahan_ajar_yuk_kenali_rambu_lalu_lintas_kosakata_baru, ref_bahan_ajar_yuk_kenali_rambu_lalu_lintas_lalu_lintas, ref_bahan_ajar_yuk_kenali_rambu_lalu_lintas_zebra_cross, ref_bahan_ajar_yuk_kenali_rambu_lalu_lintas_pelanggaran, ref_bahan_ajar_yuk_kenali_rambu_lalu_lintas_keselamatan, ref_bahan_ajar_yuk_kenali_rambu_lalu_lintas_solusi [EXTRACTED 1.00]
- **Klaster Rambu Larangan: Ciri Bentuk dan Contoh Rambu** — ref_bahan_ajar_yuk_kenali_rambu_lalu_lintas_rambu_larangan, ref_bahan_ajar_yuk_kenali_rambu_lalu_lintas_ciri_ciri_rambu_larangan, ref_bahan_ajar_yuk_kenali_rambu_lalu_lintas_dilarang_berhenti, ref_bahan_ajar_yuk_kenali_rambu_lalu_lintas_dilarang_parkir [EXTRACTED 1.00]
- **Klaster Rambu Peringatan: Ciri Bentuk dan Contoh Rambu** — ref_bahan_ajar_yuk_kenali_rambu_lalu_lintas_rambu_peringatan, ref_bahan_ajar_yuk_kenali_rambu_lalu_lintas_ciri_ciri_rambu_peringatan, ref_bahan_ajar_yuk_kenali_rambu_lalu_lintas_peringatan_penyeberangan, ref_bahan_ajar_yuk_kenali_rambu_lalu_lintas_peringatan_lampu_lalu_lintas [EXTRACTED 1.00]
- **Visual Verification Protocol** — agents_dump_dom_per_frame, agents_ukur_tepi_keras_median, agents_empat_viewport_tiga_waktu, design_verifikasi_visual [EXTRACTED 1.00]
- **Shape-Before-Name Pedagogy** — product_tujuan_belajar, product_bentuk_warna, product_enam_rambu, ref_bahan_ajar_yuk_kenali_rambu_lalu_lintas_rambu_larangan, ref_bahan_ajar_yuk_kenali_rambu_lalu_lintas_rambu_peringatan [INFERRED 0.75]
- **Framing trotoar kiri + satu tabel meter** — docs_superpowers_plans_2026_11_07_walk_scene_2_5d_framing_trotoar_kiri, docs_superpowers_plans_2026_11_07_walk_scene_2_5d_satu_tabel_meter, docs_superpowers_plans_2026_11_08_revisi_perspektif_trafik_pita_lajur_lateral, docs_superpowers_plans_2026_11_08_revisi_perspektif_trafik_sidewalk_centre_0_90, docs_superpowers_specs_2026_11_07_petualangan_rambu_lalu_lintas_design_guard_skala_9_2 [INFERRED 0.85]
- **Naskah -> beat -> panel dialog -> kontrak aksesibilitas** — docs_superpowers_specs_2026_11_07_naskah_cerita_naskah_cerita, docs_superpowers_specs_2026_11_07_naskah_cerita_peta_adegan_11_beat, docs_superpowers_plans_2026_11_07_walk_scene_2_5d_naskah_11_beat_story_ts, docs_superpowers_specs_2026_11_07_petualangan_rambu_lalu_lintas_design_panel_dialog_7_3, docs_superpowers_plans_2026_11_07_walk_scene_2_5d_kontrak_aksesibilitas_panel [INFERRED 0.85]
- **Scene 2.5D: loop rAF, scenery kontinu, trafik, rambu objek dunia** — docs_superpowers_plans_2026_11_07_walk_scene_2_5d_satu_loop_raf_reducer_murni, docs_superpowers_specs_2026_11_07_petualangan_rambu_lalu_lintas_design_walk_scene_2_5d, docs_superpowers_specs_2026_11_08_prd_handoff_scenery_kontinu_pool, docs_superpowers_specs_2026_11_08_prd_handoff_trafik_pejalan_deterministik, docs_superpowers_specs_2026_11_08_prd_handoff_rambu_objek_dunia [INFERRED 0.85]
- **2.5D Scene Rendering Invariants** — agents_satu_meter_untuk_semua, design_model_proyeksi, design_tabel_meter, design_pita_lateral, design_lapisan_z_index [INFERRED 0.85]

## Communities (24 total, 5 thin omitted)

### Community 0 - "App Shell & Stage Machine"
Cohesion: 0.06
Nodes (58): dependencies, react@^19.3.1, react-dom@^19.3.1, react, react-dom, App(), beatAt(), FocusTarget (+50 more)

### Community 1 - "Build Tooling & Dependencies"
Cohesion: 0.07
Nodes (33): devDependencies, jsdom@^31.0.0, @testing-library/dom@^10.4.2, @testing-library/react@^16.3.3, @types/react@^19.3.0, @types/react-dom@^19.3.0, typescript@^7.0.2, vite@^8.3.6 (+25 more)

### Community 2 - "Product Brief & Pedagogy"
Cohesion: 0.07
Nodes (35): Parameter URL Build Dev, Tipografi Fredoka/Nunito, PRD & Spec Teknis serah-terima, Scenery kontinu: pool 10 slot + draw(), Google Fonts: Fredoka + Nunito, Judul Halaman Petualangan Rambu, Alur Stage, Audiens: Anak Kelas II SD (+27 more)

### Community 3 - "Ground Scene & Junction"
Cohesion: 0.12
Nodes (26): Board, Props, band(), GroundScene(), points(), Props, Point, renderGround() (+18 more)

### Community 4 - "Meter Table & Perspective Revision"
Cohesion: 0.08
Nodes (27): Framing trotoar kiri, Guard skala yang menggigit (scale.test.ts), SIGN_EMPHASIS 1,5 sebagai afordansi game, Tabel mutasi Task 14, Anotasi Revised1.png dan Revised2.png, Art 2.5D dari samping (BusStop, Bin, Bench), Diagnosis: art kit elevasi depan ortografis, Pita lajur lateral (+19 more)

### Community 5 - "Scale Guards & Body Metrics"
Cohesion: 0.07
Nodes (25): spriteShare(), BINS, BODY, BuildingPhase, BuildingPhases, HUD, Measurements, opposingVisibleSeconds() (+17 more)

### Community 6 - "Scenery Art Kit"
Cohesion: 0.11
Nodes (25): Bench(), Bin(), Birds(), BusStop(), Fence(), House(), PowerPole(), Shop() (+17 more)

### Community 7 - "Prop Pool & Depth Rules"
Cohesion: 0.13
Nodes (24): FADE_FAR, Band, createPropPool(), fitsPropGap(), freeSlot(), pickPropKind(), pickPropKindOfBand(), PREWARM (+16 more)

### Community 8 - "Story Beats & Dialogue Design"
Cohesion: 0.13
Nodes (13): Naskah 11 beat di story.ts, Panel dialog bawah (DialoguePanel), Rencana Implementasi Scene Berjalan 2.5D, Rencana revisi perspektif, trotoar, rambu, trafik, Baris pembuka lembar 'Apa ini?', Beat leg-* otomatis vs stop-* menunggu tombol, Naskah cerita Petualangan Rambu-Rambu Lalu Lintas, Peta adegan 11 beat (+5 more)

### Community 9 - "Design Rules & Invariants"
Cohesion: 0.10
Nodes (3): Peta Berkas (File Map), Tabel Meter (meters.ts), Mount React di #root

### Community 10 - "End-to-End Walk Flow Tests"
Cohesion: 0.16
Nodes (16): arriveAtSign(), clearWalk(), expectAnyStopLine(), expectNoPanel(), expectPanelLine(), finishQuizPanel(), Frames, LEG_LINES (+8 more)

### Community 11 - "Screen Projection & Painting"
Cohesion: 0.20
Nodes (21): Junction(), offsetX(), pxAt(), yAt(), contains(), measureViewport(), paintedProps(), paintRects() (+13 more)

### Community 12 - "Deterministic Traffic Spawner"
Cohesion: 0.20
Nodes (17): trafficDuringLeg(), between(), BIKE_LANE_OFFSET_M, createRng(), fitsLaneGap(), LANE_DIR, MIN_LANE_GAP, Ped (+9 more)

### Community 13 - "DOM Slot Style Helpers"
Cohesion: 0.15
Nodes (16): depthScale(), propKindsOf(), heroTop(), prefersReducedMotion(), randomWait(), roundHalf(), roundScale(), setBox() (+8 more)

### Community 14 - "TypeScript Config"
Cohesion: 0.17
Nodes (11): compilerOptions, jsx, lib, module, moduleResolution, noEmit, skipLibCheck, strict (+3 more)

### Community 15 - "Walk World Reducer"
Cohesion: 0.29
Nodes (9): SIGN_STOP_D, createWorld(), LEG_SECONDS, Mode, SCROLL_PER_SEC, signDepth(), stepWorld(), WorldState (+1 more)

### Community 16 - "Vehicle Art"
Cohesion: 0.33
Nodes (8): Car(), CarFront(), CarRear(), Motorcycle(), MotorcycleFront(), MotorcycleRear(), VehicleFace, VehicleProps

### Community 17 - "Pedestrian Art"
Cohesion: 0.38
Nodes (6): Head(), Leg(), LegProps, Pedestrian(), PedFace, PedKind

### Community 18 - "Depth Fade Curve"
Cohesion: 0.50
Nodes (5): clampDepth(), fadeAt(), nearFadeAt(), scaleAt(), beltOpacity()

## Ambiguous Edges - Review These
- `Ascii Art Silhouette (tidak berlabel)` → `Aturan Art`  [AMBIGUOUS]
  Ref/ascii-art.txt · relation: conceptually_related_to
- `Google Fonts: Fredoka + Nunito` → `Tipografi Fredoka/Nunito`  [AMBIGUOUS]
  index.html · relation: references

## Knowledge Gaps
- **23 isolated node(s):** `Token Warna`, `Ascii Art Silhouette (tidak berlabel)`, `Google Fonts: Fredoka + Nunito`, `B1: Persimpangan Belum Terbaca`, `Lalu Lintas` (+18 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 138 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `App Shell & Stage Machine` to `Build Tooling & Dependencies`, `Ground Scene & Junction`, `Scale Guards & Body Metrics`, `Scenery Art Kit`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `WalkScene()` (e.g. with `scale.test.ts` and `prefersReducedMotion()`) actually correct?**
  _`WalkScene()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Token Warna`, `Ascii Art Silhouette (tidak berlabel)`, `Google Fonts: Fredoka + Nunito` to the rest of the system?**
  _23 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App Shell & Stage Machine` be split into smaller, more focused modules?**
  _Cohesion score 0.06377151799687011 - nodes in this community are weakly interconnected._
- **Why does `vitest` connect `Build Tooling & Dependencies` to `App Shell & Stage Machine`, `Ground Scene & Junction`, `Scale Guards & Body Metrics`, `Prop Pool & Depth Rules`, `End-to-End Walk Flow Tests`, `Deterministic Traffic Spawner`, `Walk World Reducer`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Ascii Art Silhouette (tidak berlabel)` and `Aturan Art`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Google Fonts: Fredoka + Nunito` and `Tipografi Fredoka/Nunito`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._