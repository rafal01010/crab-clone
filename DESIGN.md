# Your workplace has the answer. Just ask Dala for it. — Style Reference

## Game presentation rules

These game-specific rules take precedence over the website reference below. The menu reference supplies the black, violet, and amber identity, typographic composition, and constellation imagery. Gameplay needs its own readable, compact layouts.

- Design the low-quality experience for Intel HD 620-class browser laptops. Target at least 30 rendered FPS at 1280 by 720 internal resolution and readable UI at 1366 by 768 CSS pixels. These targets require measurement on recorded hardware before claiming support. Render scale controls the drawing buffer independently of UI scale and quality.
- Use coherent stylized low-poly hovercrafts with recognizable hulls, designed attachment points, matte materials, and restrained emissive accents. Distinguish bot roles by silhouette and pose. Give biomes distinct shapes, quiet palettes, and sparse landmark clusters. Keep combatants and useful objects visually separate from decoration.
- Establish a representative scene and compare two inexpensive visual treatments before producing the complete asset set. Show early and late builds, two bot roles, terrain, pickups, HUD, and an upgrade overlay at the actual camera distance. Record the chosen palette, proportions, lighting, material and icon rules, and scene budgets here as implementation decisions are made.
- Use simple lighting and inexpensive contact-shadow shapes to ground entities. Low quality must retain the intended art direction without real-time shadow maps, bloom, screen-space effects, or large transparent particle layers. Share materials and geometry, instance repeated decoration where useful, bound effects, and release resources on teardown.
- Use readable regular or medium-weight gameplay text, compact spacing, and restrained opaque or translucent backing surfaces where needed for contrast. Huge display headings and ultra-light body text belong to menu compositions. Gameplay may use bounded panels, dividers, and upgrade-option outlines for clarity. Preserve the flat palette and restrained accents.
- Show upgrade rarity through an explicit name, a colored accent, and a distinct badge treatment. Use neutral for common, blue for rare, violet for epic, and amber for legendary. Show branching and specialization as named choice types. Keep rarity distinct from rank, affinity, selection, and disabled state. Apply the same system to offers, equipment, and build inspection; it must remain understandable without color.
- Confirm actual attacks on visible bots with a short impact flash or simple shape, responsive health/plating feedback, and a compact local-attacker hit cue. Use authorized server outcomes; predicted overlap is insufficient. Distinguish hull damage, plating absorption or break, dodge, blocked hits, and misses. Coalesce rapid ticks and make damage numbers optional. Low effects, muted play, and reduced motion retain essential confirmation without camera shake or sound.
- Keep boundary warnings visible during choices and explain that selection protection does not pause the world. Preserve the requested removal of minimaps.
- Prioritize visuals and interaction over audio. Start with only optional short hit, pickup, upgrade, and danger cues after visual implementation. Original browser-synthesized tones and noise are sufficient; external audio packs are not required. Music and elaborate ambience are deferred. Every audible cue has a visual equivalent.

### Chosen gameplay treatment

The visual-direction comparison uses `scripts/visual-target.html` and `scripts/visual-target.ts`. Run `node node_modules/vite/bin/vite.js --config scripts/visual-target.config.ts`, then open `http://127.0.0.1:5182/scripts/visual-target.html`. Both scenes use a 45-degree perspective camera at `(0, 12, 12)`, a 1280 by 720 drawing buffer, and the same early and late builds, hunter, forager, terrain, pickups, HUD, and Epic offer. The normal gameplay camera uses this minimum distance and moves outward for large hulls.

The native Chrome comparison on 2026-11-17 selected treatment A, matte lighting. Its directional faces separate hull planes and bot bodies more clearly than treatment B's unlit fills. Both retain the pickup silhouettes and repair cross. This observation settles the art direction only. It does not establish crowded combat readability, frame rate, or target-hardware support. An incompatible indexed geometry merge initially prevented the comparison from rendering. The shared builder now converts its parts to non-indexed geometry before merging.

| Element | Production rule |
|---|---|
| Hull and mounts | Pale gray-green shell `#b3c8bf`, dark lift pods `#303c42`, violet mounts `#a78bdb`, and small amber heading lights `#ffbc51`. The core fits inside its collision diameter. Small external mounts are cosmetic and do not enlarge hit or attack geometry. |
| Proportions | The unit hull is 0.9 units wide with a low canopy. Side mounts share the same left and right mounting points. Rear propulsion, dorsal sensors, front weapons, lateral protection, and rear command masts occupy distinct positions. Rank detail grows by 3.5% per rank, capped after four increments. The whole model follows the server radius. |
| Materials and light | Roughness 1, metalness 0, flat faces, hemisphere fill, and one directional light. One atlas supplies the effects. The hulls and terrain props use vertex colors. Low-sided contact disks ground the craft and bots. Night retains fill light for silhouettes. |
| Terrain | Grass `#526647`, sand `#9b7953`, snow `#a5bac8`, and shallow water `#3d8fab` anchor the palette. World coordinates drive moss patches, sand ripples, snow drifts, and surface ripples on water. Reeds and pale foam mark the banks. Darker blue shows deeper water. Obstacles use a full-width base and faceted stone tops within the server box. Landmarks stay clear of movement routes. |
| Icons | Original 24-unit SVG line drawings with a 1.6-unit stroke. Power, salvage, plating, attack, manipulators, movement, wings, projectiles, sensors, and beacons share the same rounded stroke rules. Text supplies the meaning. |
| Feedback | Danger and impact have priority over repair, rewards, and decoration. Authoritative labels distinguish hull, plating, break, dodge, blocked, repair, salvage, and level gain. Impact bursts, bot health and plating bars, and a local attack-outcome label work without audio or damage numbers. No camera shake is used. |

### Menu, HUD, and choice composition

Menus use an asymmetric two-column composition on black. The title wraps in the left column beside an original outlined hovercraft constellation. Inter display text uses weight 400, menu introductions use weight 200, and only the current primary action has a filled violet background. Room rows, crew seats, result tables, loading states, and amber failures share this flat treatment. Secondary actions use underlined text. All font files remain local.

Gameplay fills the viewport. The left edge holds hull, plating, experience, statuses, and personal risk. Ability keys and readiness sit at the bottom. Nearby actions use the right edge, while weather, boundary, and meteor warnings occupy the top center. Gameplay text uses weight 400 or 600 with dark backing. Build details scroll inside their bounded area. No minimap is introduced.

Offers use three outlined columns with regular-weight descriptions and a sticky deadline and warning region. Current and next effects appear separately. Requirements and affinities expand below the benefit. Rarity has an explicit name and a separate badge treatment. Common uses a plain neutral border and one circle. Rare uses a dashed blue border and two diamonds. Epic uses a double violet border and three diamonds. Legendary uses an amber border with distinct corners and four diamonds. Rank, affinity, selection, and unavailable states use separate labels. Equipment, offers, final builds, and the existing build list reuse the same badge component.

The equipment editor previews replacement and movement between slots before submitting. Prompt transactions wait for the host and discard responses belonging to an older offer revision. Native keyboard behavior remains available on focused buttons and selects. Choice warnings and server countdowns remain visible while longer content scrolls. Reduced motion requires no menu animation or camera effect. Laptop layout, grayscale recognition, timed choices, and the complete journey still require the assigned presentation checkpoint.

Nearby interaction panels distinguish personal discovery credit from the shared site's claim. Claim and consumption controls wait for host results. Unavailable options keep their cost and reason visible. Firmware shows the viewer's identification result without a hidden effect mapping. Shelters show occupancy, estimated entry duration, and a forced-exit countdown. Build inspection lists the local craft's learned and equipped abilities, specializations, current stats, and recorded modifiers. The optional field guide is available before readiness and during play. Inspection captures controls without granting protection; its danger notices remain above scrolling content.

Render scale controls the drawing buffer independently of the HUD. Low quality caps pixel ratio at 1, displays up to 40 nearby clusters per biome, and uses eight weather streaks. Balanced displays up to 92 nearby clusters per biome and 24 weather streaks. Both retain the same visibility, combat feedback, and danger geometry. Reduced motion keeps the key attack poses and static effects. Settings use a bounded scrolling panel and repeat boundary and meteor warnings. Timed choices take focus priority over rebinding.

All nine gameplay actions use one complete, unique binding map. The editor resolves conflicts through explicit swaps, reserves menu navigation keys, and supports reset. Gameplay clears held input on remapping and waits for a fresh key press. Labels derive from that map throughout the UI. Only validated local presentation and input preferences persist.

Audio consists of four original browser-synthesized sine or triangle sweeps for hits, pickups, confirmed upgrades, and danger. No sampled or remote sounds are used. A single gesture-unlocked context uses a master gain, mute, category rate limits, and a six-voice cap. It respects private deafness, viewer-authorized feedback, tab visibility, disconnects, and round reset. These are implementation budgets, not measured hardware capacity.

### Asset inventory and provenance

The local art bundle combines adapted CC0 models with original attachment geometry, glyphs, and animation. Quaternius's individual pack pages and downloaded license notices identify these models as CC0. Kenney's downloaded archives include the same dedication. The Inter font retains its bundled license. [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)

| Creator and source | Original files | Shipped adaptation |
|---|---|---|
| Quaternius · [Ultimate Spaceships Pack](https://quaternius.com/packs/ultimatespaceships.html) | `Pancake.gltf` | Starter shell, cockpit, and nacelles. The shortened hull faces +Z and leaves space for front, side, and rear mounts. |
| Quaternius · [Ultimate Space Kit](https://quaternius.com/packs/ultimatespacekit.html) | `Rover_Round.gltf`, `Rover_1.gltf`, `Rover_2.gltf` | The main chassis sections form the broad forager, narrow hunter, and long scavenger. The adapted bodies use original scoops, jaws, and probes. |
| Kenney · [Nature Kit 2.1](https://kenney.nl/assets/nature-kit) | `rock_largeA.glb`, `rock_smallFlatA.glb`, `grass_large.glb`, `log_stack.glb`, `tree_oak.glb` | Outcrops, stones, tufts, reeds, exposed roots, and landmark trees. Prop pivots sit at ground level. |
| Kenney · [Particle Pack](https://opengameart.org/content/particle-pack-80-sprites) | `trace_01.png`, `scorch_01.png`, `smoke_04.png` | Muzzle streak, hit spark, and thruster puff in a single atlas. |

The [art preparation script](scripts/prepare-game-art.py) bakes the palette into mesh vertices and writes the local mesh bundle and effect atlas. Its inputs are the original files above. The browser loads both files from the LAN host before confirming readiness.

| Family | Included assets and binding |
|---|---|
| Craft | Continuous painted shell, recessed cockpit, twin lift pods, amber heading lamps, and a contact shadow. Health, damage, and other stat-only improvements remain in the existing stats UI instead of creating invented hardware. |
| Structural mounts | Manipulator arms, flex mounts, lift pods, wing panels, stabilizers, hydrofoils, lightweight rails, reactive studs, sensor probes, and firmware fabricators follow learned public structural upgrades. Optical arrays and signal antennas occupy dorsal sensor positions. |
| Equipped modules | Rear jets represent movement abilities. Front barrels represent Plasma Shot, Slug Launcher, and Shock Harpoon. Paired manipulators represent contact tools. Piercing Blade and Follow-up Blade use blades. Hull Ram uses a front bumper. These are shared role silhouettes. Equipped techniques without a physical mount use their actual guard, status, movement, projectile, or field feedback. |
| Protection and command | Lateral armor follows Armor Panels, Layered Armor, Plated, and Outer Frame. Command Chassis and Squad Link add a command mast. Commanding and Strength in Numbers do not invent physical attachments. |
| Specializations | Public crest and fin variants reuse the registry's declared visual contract. Private specializations do not gain public geometry. Other branches retain their parent's mount and actual behavior feedback. |
| Bots | The forager tilts a scoop, the hunter closes forward jaws, and the scavenger extends probes. Windup, strike, and recovery follow authoritative state. The tier badge grows for elites and uses mint for allies. Stun, corrosion, and slow keep their distinct marks. |
| Resources | A leaf cluster, wrecked component, and sealed cylinder identify plant, wreck, and aquatic salvage. A cross marks healing. One to four diamonds identify rarity. Remaining stage marks and shrinking bulk show salvage progress. |
| Firmware | Sixteen combinations of counted marks, orientation, and neutral capsule detailing follow appearance IDs only. Stage changes reduce capsule bulk. Identifying a capsule does not alter its geometry or disclose another player's knowledge. |
| Landmarks | Reed-fringed pools, trees, reef spires, specimen crystal, mushroom cap, lotus petals, drone dock, and dial. Claimed markers flatten, reserved markers stretch, and available markers remain diamonds. Shelter arches have an outward exit wedge and reflect remaining lifetime. |
| World effects | Grounded snares and foam trails, bright projectile cores and trails, muzzle flashes, contact arcs, thrust, and field outlines. Meteor and boundary geometry retain their warning shapes. Reduced motion keeps the contact, movement, area, and hit-outcome cues visible. |

### Provisional low-quality budgets

These are design ceilings and implementation limits, not measurements. Presentation verification must record actual render costs, and hardware acceptance remains a later gate. If a representative scene exceeds the proposed draw or triangle budget, simplify shared geometry or instance another family. Do not hide gameplay entities to satisfy a budget.

| Cost | Budget or bound |
|---|---|
| Drawing buffer | Canvas CSS dimensions multiplied by the device pixel ratio and a render scale from 0.5 to 1. The camera uses the canvas aspect ratio. |
| Visible geometry | Target at most 200,000 rendered triangles and 600 draw calls in the representative crowded scene. Terrain is instanced by biome and water depth. These targets still need measurement. |
| Materials | Share the craft, bot, pickup, and module palettes. Target at most 32 active materials, including terrain, warnings, and occlusion materials. No per-impact materials. |
| Textures | One 256 × 128 RGBA atlas, 9,947 bytes on disk and 131,072 decoded bytes without mipmaps. The vertex-colored GLB is 65,340 bytes. |
| Decoration | Low quality draws up to 40 nearby clusters per biome using eight scenery batches. Each cluster uses up to two low-profile pieces. Coordinates determine placement across streamed views. |
| Transient feedback | At most 32 reusable labels and impact shapes, one active label per target, with a 700 ms display window. Repeated ticks reuse the target's slot. Bot hull loss trails settle over 650 ms after a short hold. Numbers are optional. |
| Network feedback | At most 256 retained outcomes globally and 64 in a viewer projection, retained for 900 ms. Monotonic IDs suppress replay. Visibility is checked at emission and projection, including the spectating identity and hidden-player rules. Lethal outcomes retain only the authorized last position. No attacker identity is sent. |
| Lifecycle | The view reuses shared models across rounds. Round and spectator changes clear projected effects. Replacing terrain releases its scene-owned geometry. Teardown releases pools, materials, the texture, and its decoded image. The lobby can retry a failed art load. |

## Website style reference

> constellation floating on black velvet

**Theme:** dark

Source measurements are normalized; roles and recommendations are interpreted. Font summary lists are independent, not paired by position. HTML examples are reconstructions, not source components.

Dala operates as a dark-stage environment where black voids meet a single vivid violet accent, punctuated by amber sparks. Typography is monolithic and weightless — PPNeueMontreal at weight 400 dominates every heading at outsized scales (78–113px) with aggressive negative tracking, so headlines feel sculptural rather than informational. The visual centerpiece is a constellation of tiny multicolored triangular particles forming an organic brain shape, which acts as the brand's signature gesture: knowledge visualized as distributed intelligence rather than hierarchical data. Layout follows a spacious two-column rhythm — oversized left-aligned headlines paired with generous body copy, floating on pure black with no panels, borders, or cards. Components are intentionally reduced to their most essential form: one violet pill button, ghost text links, and large-format text blocks.

## Tokens — Colors

| Name | Value | Token | Role |
|------|-------|-------|------|
| Void | `#000000` | `--color-void` | Page canvas, section backgrounds, negative space — pure black is the dominant surface, not dark gray, creating the void that lets chromatic accents float |
| Bone White | `#ffffff` | `--color-bone-white` | Headlines, body text, icon fills, nav active state — the only typographic color, carrying maximum hierarchy on black |
| Ash Gray | `#9a9a9a` | `--color-ash-gray` | Muted nav text, ghost link color, secondary labels — recedes behind primary text without going invisible |
| Silver Mist | `#bdbdbd` | `--color-silver-mist` | Tertiary body text, caption-level information — the quietest readable gray, for supporting context |
| Electric Iris | `#8052ff` | `--color-electric-iris` | Primary action buttons, logo mark, brand accents — the single saturated violet that signals interactivity and brand identity against the black void |
| Saffron Spark | `#ffb829` | `--color-saffron-spark` | Highlight emphasis text, accent links, attention punctuation — warm yellow against violet creates the brand's chromatic tension |
| Deep Verdant | `#15846e` | `--color-deep-verdant` | Secondary surface tint, logo gradient stop — appears as the deeper end of the brand gradient and in subtle accent washes |

## Tokens — Typography

### PPNeueMontreal — Single typeface across all UI contexts. Display sizes (78–113px) carry headlines at weight 400 with -0.04em tracking — the same weight as body text but massive scale creates hierarchy. Weight 200 (ultra-light) is reserved for 18px body copy, a signature choice: most AI/SaaS sites use 400 for body, but Dala strips weight to make paragraphs feel airy and non-aggressive. Weight 600 at 14px with 0.025em tracking and uppercase serves nav and small labels. The number 400 doing both 113px display and 15px body is unusual — it means the brand trusts scale, not weight, for hierarchy. · `--font-ppneuemontreal`
- **Substitute:** Inter
- **Weights:** 200, 400, 600, 700
- **Sizes:** 12, 14, 15, 18, 24, 27, 36, 42, 48, 78, 113px
- **Line height:** 0.81, 0.90, 1.00, 1.10, 1.20, 1.25, 1.30, 1.50
- **Letter spacing:** -4.52px at 113px, -3.12px at 78px, -1.68px at 42px, -0.48px at 24px, normal at 18px body; 0.025em at 14px uppercase nav
- **OpenType features:** `"ss01" on`
- **Role:** Single typeface across all UI contexts. Display sizes (78–113px) carry headlines at weight 400 with -0.04em tracking — the same weight as body text but massive scale creates hierarchy. Weight 200 (ultra-light) is reserved for 18px body copy, a signature choice: most AI/SaaS sites use 400 for body, but Dala strips weight to make paragraphs feel airy and non-aggressive. Weight 600 at 14px with 0.025em tracking and uppercase serves nav and small labels. The number 400 doing both 113px display and 15px body is unusual — it means the brand trusts scale, not weight, for hierarchy.

### Type Scale

| Role | Family | Weight | Size | Line Height | Letter Spacing | Token |
|------|--------|--------|------|-------------|----------------|-------|
| caption | — | — | 12px | 1.5 | — | `--text-caption` |
| nav-label | — | — | 14px | 1.2 | 0.35px | `--text-nav-label` |
| body | — | — | 18px | 1.5 | — | `--text-body` |
| heading-2xs | — | — | 24px | 1.25 | -0.48px | `--text-heading-2xs` |
| heading-xs | — | — | 27px | 1 | — | `--text-heading-xs` |
| subheading | — | — | 36px | 1.2 | — | `--text-subheading` |
| heading-sm | — | — | 42px | 1.2 | -1.68px | `--text-heading-sm` |
| heading | — | — | 48px | 1.1 | -1.68px | `--text-heading` |
| heading-lg | — | — | 78px | 1.1 | -3.12px | `--text-heading-lg` |
| display | — | — | 113px | 1.1 | -4.52px | `--text-display` |

## Tokens — Spacing & Shapes

**Base unit:** 6px

**Density:** comfortable

### Spacing Scale

| Name | Value | Token |
|------|-------|-------|
| 6 | 6px | `--spacing-6` |
| 12 | 12px | `--spacing-12` |
| 18 | 18px | `--spacing-18` |
| 24 | 24px | `--spacing-24` |
| 30 | 30px | `--spacing-30` |
| 36 | 36px | `--spacing-36` |
| 60 | 60px | `--spacing-60` |
| 96 | 96px | `--spacing-96` |
| 120 | 120px | `--spacing-120` |

### Border Radius

| Element | Value |
|---------|-------|
| nav | 24px |
| tags | 9999px |
| cards | 24px |
| buttons | 24px |

### Layout

- **Page max-width:** 1280px
- **Section gap:** 60-120px
- **Card padding:** 24-38px
- **Element gap:** 6-18px

## Components

### Primary Action Button
**Role:** Filled violet pill, the sole interactive CTA

Background #8052ff (Electric Iris), white text, 22.5px border-radius (pill), 14.4px vertical padding × 15.96px horizontal padding. PPNeueMontreal 14px weight 400 or 600, uppercase with 0.025em tracking. The high radius (22.5px on ~45px height) creates a full pill shape — soft, friendly, unmistakable as the primary action.

### Ghost Text Button
**Role:** Underlined or bare text link, secondary action

No background, no border, color #ffffff or #9a9a9a. PPNeueMontreal 14px weight 400. Used for nav items and inline links. The absence of any container means visual hierarchy comes entirely from type weight and tracking.

### Logo Lockup
**Role:** Brand mark + wordmark in header

Small triangular icon in #8052ff (violet) with a gradient fade through #15846 (teal), paired with 'Dala' wordmark in white. The icon is a stylized angular fragment — geometric, sharp-edged, echoing the triangular particles in the hero visualization.

### Team Member Card
**Role:** Portrait + name + role display

No background, no border, no shadow. Large rounded-rectangle portrait photo (~24px corner radius) with role label in 12px uppercase #8052ff and name in large white display type below. Social icons (Twitter, LinkedIn) appear as small inline glyphs. Cards float on the black canvas with only whitespace separation.

### Carousel Navigation Dot
**Role:** Indicator for slide position in team/investor carousels

Small filled circle ~8px diameter, #8052ff violet for active state. Inactive dots are dimmer or omitted. Padding is minimal — sits directly in the content flow without a container.

### Hero Constellation Visualization
**Role:** Signature brand imagery — brain-shape particle cloud

Thousands of tiny triangular glyphs (outlined, 1-2px) in a full spectrum of vivid colors (violet, amber, teal, magenta, blue) forming an organic brain or cloud shape against pure black. Individual particles are scattered/ambient across the surrounding space as well. This is the site's defining visual — not a static image but an animated field of point-lights.

### Section Headline Block
**Role:** Oversized left-aligned headline + supporting copy

Two-column asymmetric layout: headline at 78–113px weight 400 PPNeueMontreal in white with -0.04em tracking, occupying left half. Body copy at 18px weight 200 (ultra-light) in white or silver, with a small uppercase label (#ffb829 amber) above the body. No boxes, no borders — pure typographic composition on black.

### Navigation Bar
**Role:** Top-aligned site navigation

Transparent background sitting directly on black canvas. Logo left, nav links center/right (Manifesto, Team, Blog) in 14px uppercase PPNeueMontreal with 0.025em tracking. Active or hover state: white. Inactive: #9a9a9a. Request Access button (filled violet pill) anchors the right edge. No border, no backdrop blur on the nav itself.

### Ambient Particle Field
**Role:** Decorative scattered triangle glyphs

Small outlined triangles in various chromatic colors (#8052ff violet, #ffb829 amber, #15846 teal, plus assorted purples and blues) scattered at low opacity across the background outside the main constellation. Creates atmospheric depth without competing with the central visualization.

## Do's and Don'ts

### Do
- Use #8052ff (Electric Iris) exclusively for filled action buttons — no other saturated color should appear as a button background
- Set every headline at weight 400, never bold — Dala achieves hierarchy through scale (78–113px) and tracking (-0.04em), not font weight
- Use PPNeueMontreal weight 200 for 18px body text — the ultra-light weight is a signature, do not substitute weight 400
- Maintain pure #000000 black as every section background — never use dark gray panels or card surfaces; the void is the design
- Apply -0.04em letter-spacing on all display sizes 42px and above, converting to approximately -4.52px at 113px
- Use 24px border-radius for buttons, cards, and nav elements as the consistent radius token — pill shapes only at very small sizes
- Let the particle constellation be the only hero imagery — do not introduce photography, illustrations, or product screenshots into the hero region

### Don't
- Do not use filled violet (#8052ff) for large background blocks or full sections — it is a button and accent color, not a surface
- Do not set body text at weight 400 — Dala's signature ultra-light (200) body copy is what distinguishes the reading experience
- Do not introduce card containers with borders, shadows, or background fills — elements float on black with whitespace alone
- Do not use color #0000ee (default browser link blue) — never specify it; use #ffb829 amber or #ffffff for links
- Do not add gradients to UI components — Dala's palette is flat; gradients belong only in the logo and the particle visualization
- Do not use system fonts as substitutes when PPNeueMontreal-equivalent geometry matters — use Inter as fallback but preserve the weight 200 body and weight 400 headline convention
- Do not place multiple filled buttons in proximity — the violet pill is reserved for singular primary actions per view

## Surfaces

| Level | Name | Value | Purpose |
|-------|------|-------|---------|
| 0 | Void Canvas | `#000000` | Full-page background, all section backgrounds, the base void |
| 1 | Deep Verdant Tint | `#15846` | Subtle accent surface for brand gradient and logo depth |
| 2 | Electric Iris | `#8052ff` | Highest surface — filled buttons, active interactive elements only |

## Elevation

Dala uses no shadows or elevation. All hierarchy is achieved through scale, color contrast, and whitespace on a flat black canvas. The absence of cards-with-shadows is deliberate — the void is the design, and any shadow would break the floating-in-space quality of the typography and particle constellation.

## Imagery

Imagery is entirely procedural and abstract — no photography except team portraits. The signature visual is a dense cloud of thousands of tiny outlined triangular particles in a full vivid spectrum (violets, ambers, teals, magentas, blues) forming an organic brain/neural shape. This particle field is animated and acts as both hero art and brand identity. Surrounding ambient particles drift at lower density across the page background. Triangles are outlined, 1–2px stroke, sharp-edged, in saturated chromatic colors — never grayscale. Team portraits appear as large rounded-rectangle crops (24px radius) without frames or overlays. No product screenshots, no lifestyle photography, no 3D renders — the particle system IS the visual brand.

## Layout

Full-bleed sections on pure black canvas, max content width ~1280px centered. Hero is a two-column asymmetric split: oversized left-aligned headline (113px) with body copy and CTA on the left half, particle brain visualization occupying the right half at massive scale. Subsequent sections alternate the two-column composition (visual-left/text-right, then text-left/visual-right) creating a zigzag reading rhythm. Section gaps are generous (60–120px vertical). No card grids, no pricing tables, no multi-column feature blocks — content lives in spacious two-column text+visual arrangements. Navigation is a minimal transparent top bar, no sidebar, no mega-menu. Density is extremely spacious — one or two elements per viewport, never information-dense.

## Agent Prompt Guide

## Quick Color Reference
- Text: #ffffff (primary), #9a9a9a (secondary), #bdbdbd (tertiary)
- Background: #000000 (canvas only)
- Border: none — Dala uses no visible borders or dividers
- Accent: #ffb829 (Saffron Spark) for emphasis highlights
- primary action: #8052ff (filled action)

## Example Component Prompts

1. **Hero Section**: Full-bleed #000000 canvas. Two-column split. Left: headline at 78px PPNeueMontreal weight 400, #ffffff, letter-spacing -3.12px, reading 'Unlock collective wisdom.' Body copy at 18px weight 200 PPNeueMontreal, #ffffff, max-width 480px. Above body, a small uppercase label at 14px weight 600, #ffb829 amber, letter-spacing 0.35px. Below body, a filled violet pill button: #8052ff background, white text, 14px weight 600 uppercase, 22.5px border-radius, 14.4px vertical padding × 16px horizontal padding. Right: large particle constellation visualization (thousands of tiny colored triangles forming a brain shape).

2. **Section Headline + Body**: #000000 background. Left-aligned headline at 42px PPNeueMontreal weight 400, #ffffff, letter-spacing -1.68px. Supporting body text at 18px weight 200 PPNeueMontreal, #bdbdbd, max-width 520px. No boxes, no borders, no cards — text floats on void.

3. **Navigation Bar**: Transparent background on black. Left: small violet (#8052ff) triangular logo icon + 'Dala' wordmark in #ffffff 14px. Right: nav links 'Manifesto', 'Team', 'Blog' in 14px PPNeueMontreal weight 600, uppercase, 0.025em letter-spacing, color #9a9a9a (inactive) or #ffffff (active). Far right: filled violet pill 'Request Access' button — #8052ff background, white text, 22.5px radius, 14px weight 600 uppercase.

4. **Team Card**: No background, no border. Large portrait photo with 24px border-radius. Above name: role label 'CO FOUNDER & CTO' at 12px PPNeueMontreal weight 400, #8052ff, uppercase. Below photo: name 'Joel Kang' at 27px PPNeueMontreal weight 400, #ffffff. Social icons inline as small glyphs in #9a9a9a.

5. **Carousel Indicator**: Two small dots ~8px, filled #8052ff for active position, no background or border around the dot container. Sits centered below carousel content with 30px gap.

## Similar Brands

- **Linear** — Same dark-void aesthetic with oversized weight-400 display type, generous whitespace, and a single saturated accent (violet/blue) reserved for action — both treat black as an active design material rather than a fallback
- **Vercel** — Identical pattern: pure black canvas, geometric minimalism, single brand color, weight-400 typography at massive display sizes with aggressive negative tracking — both make black the hero
- **Anthropic** — Dark mode-first philosophy with serif-free geometric sans, restrained color palette where one accent dominates, and a typographic system that trusts scale over weight for hierarchy
- **Runway** — Dark void aesthetic with particle/constellation-style generative visuals as brand identity, combined with ultra-light body type and single vivid accent color for CTAs

## Quick Start

### CSS Custom Properties

```css
:root {
  /* Colors */
  --color-void: #000000;
  --color-bone-white: #ffffff;
  --color-ash-gray: #9a9a9a;
  --color-silver-mist: #bdbdbd;
  --color-electric-iris: #8052ff;
  --color-saffron-spark: #ffb829;
  --color-deep-verdant: #15846e;

  /* Typography — Font Families */
  --font-ppneuemontreal: 'PPNeueMontreal', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

  /* Typography — Scale */
  --text-caption: 12px;
  --leading-caption: 1.5;
  --text-nav-label: 14px;
  --leading-nav-label: 1.2;
  --tracking-nav-label: 0.35px;
  --text-body: 18px;
  --leading-body: 1.5;
  --text-heading-2xs: 24px;
  --leading-heading-2xs: 1.25;
  --tracking-heading-2xs: -0.48px;
  --text-heading-xs: 27px;
  --leading-heading-xs: 1;
  --text-subheading: 36px;
  --leading-subheading: 1.2;
  --text-heading-sm: 42px;
  --leading-heading-sm: 1.2;
  --tracking-heading-sm: -1.68px;
  --text-heading: 48px;
  --leading-heading: 1.1;
  --tracking-heading: -1.68px;
  --text-heading-lg: 78px;
  --leading-heading-lg: 1.1;
  --tracking-heading-lg: -3.12px;
  --text-display: 113px;
  --leading-display: 1.1;
  --tracking-display: -4.52px;

  /* Typography — Weights */
  --font-weight-extralight: 200;
  --font-weight-regular: 400;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  /* Spacing */
  --spacing-unit: 6px;
  --spacing-6: 6px;
  --spacing-12: 12px;
  --spacing-18: 18px;
  --spacing-24: 24px;
  --spacing-30: 30px;
  --spacing-36: 36px;
  --spacing-60: 60px;
  --spacing-96: 96px;
  --spacing-120: 120px;

  /* Layout */
  --page-max-width: 1280px;
  --section-gap: 60-120px;
  --card-padding: 24-38px;
  --element-gap: 6-18px;

  /* Border Radius */
  --radius-3xl: 24px;
  --radius-full: 9999px;

  /* Named Radii */
  --radius-nav: 24px;
  --radius-tags: 9999px;
  --radius-cards: 24px;
  --radius-buttons: 24px;

  /* Surfaces */
  --surface-void-canvas: #000000;
  --surface-deep-verdant-tint: #15846;
  --surface-electric-iris: #8052ff;
}
```

### Tailwind v4

```css
@theme {
  /* Colors */
  --color-void: #000000;
  --color-bone-white: #ffffff;
  --color-ash-gray: #9a9a9a;
  --color-silver-mist: #bdbdbd;
  --color-electric-iris: #8052ff;
  --color-saffron-spark: #ffb829;
  --color-deep-verdant: #15846e;

  /* Typography */
  --font-ppneuemontreal: 'PPNeueMontreal', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

  /* Typography — Scale */
  --text-caption: 12px;
  --leading-caption: 1.5;
  --text-nav-label: 14px;
  --leading-nav-label: 1.2;
  --tracking-nav-label: 0.35px;
  --text-body: 18px;
  --leading-body: 1.5;
  --text-heading-2xs: 24px;
  --leading-heading-2xs: 1.25;
  --tracking-heading-2xs: -0.48px;
  --text-heading-xs: 27px;
  --leading-heading-xs: 1;
  --text-subheading: 36px;
  --leading-subheading: 1.2;
  --text-heading-sm: 42px;
  --leading-heading-sm: 1.2;
  --tracking-heading-sm: -1.68px;
  --text-heading: 48px;
  --leading-heading: 1.1;
  --tracking-heading: -1.68px;
  --text-heading-lg: 78px;
  --leading-heading-lg: 1.1;
  --tracking-heading-lg: -3.12px;
  --text-display: 113px;
  --leading-display: 1.1;
  --tracking-display: -4.52px;

  /* Spacing */
  --spacing-6: 6px;
  --spacing-12: 12px;
  --spacing-18: 18px;
  --spacing-24: 24px;
  --spacing-30: 30px;
  --spacing-36: 36px;
  --spacing-60: 60px;
  --spacing-96: 96px;
  --spacing-120: 120px;

  /* Border Radius */
  --radius-3xl: 24px;
  --radius-full: 9999px;
}
```
