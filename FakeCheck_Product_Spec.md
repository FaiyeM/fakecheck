# FakeCheck — Product Specification
**Version:** 1.0 — Concept & Feature Spec  
**Platform:** iOS + Android (React Native)  
**Monetization at launch:** Free  
**Target users:** Casual buyers/resellers and serious collectors  

---

## 1. Product Vision

FakeCheck is a mobile-first authentication app that lets anyone point their phone camera at an item and instantly know what it is — and whether it's real. It combines AI-powered object identification with guided, category-specific authentication flows informed by how expert authenticators actually examine items. Every user correction feeds a learning loop that makes the model smarter over time.

**Core promise:** *"Point. Check. Know."*

---

## 2. High-Level Feature Summary

| Feature | Description |
|---|---|
| Snap & Identify | Camera capture → AI identifies the item + confidence score |
| Fake Check | Guided multi-photo authentication flow tailored to the specific item |
| Verdict Screen | Real / Fake / Uncertain verdict with evidence summary |
| Correction Submission | User disputes verdict, submits context, goes to backend |
| Scan History | All past scans with verdicts, stored locally + optionally synced |
| Item Detail Page | Shows what was checked, why verdict was given, and what to look for |

---

## 3. App Flow Overview

```
Launch
  └── Home Screen (Camera prompt)
        └── Capture Photo
              └── Identifying... (loading)
                    └── Identification Result Screen
                          ├── [Dismiss / New Scan]
                          └── [Check if Fake] button
                                └── Authentication Intro Screen
                                      └── Step-by-step Photo Prompts (1–N)
                                            └── Processing...
                                                  └── Verdict Screen
                                                        ├── [Accept Verdict]
                                                        └── [Dispute / Submit Correction]
                                                              └── Correction Form
                                                                    └── Confirmation
```

---

## 4. Screens — Detailed Specification

---

### 4.1 Home / Camera Screen

**Purpose:** Entry point. Gets the user scanning immediately.

**Elements:**
- Full-screen live camera viewfinder
- Subtle framing guide (rounded rectangle overlay to center item)
- Capture button (large, bottom center)
- Gallery icon — import from photo library instead of live camera
- History icon (top right) — opens Scan History
- App logo / name (top left, minimal)

**Behavior:**
- Camera opens immediately on launch (with permission prompt on first open)
- No login required to scan
- Auto-focus when item fills frame (no manual tap required if possible)
- Flash toggle (top bar)

---

### 4.2 Identification Result Screen

**Purpose:** Show what the AI thinks the item is, with confidence.

**Elements:**
- The photo the user took (top half, full-width)
- Item name (large text) — e.g. "Louis Vuitton Neverfull MM Tote"
- Category tag — e.g. "Luxury Handbag"
- Confidence score — displayed as both a percentage and a visual bar/ring
  - Color coded: Green ≥ 80%, Yellow 50–79%, Red < 50%
- Confidence label:
  - ≥ 80%: "High confidence"
  - 50–79%: "Moderate confidence — better lighting or angle may improve accuracy"
  - < 50%: "Low confidence — try a clearer photo"
- "Not what you have?" link — lets user manually select category (opens a searchable list)
- **[Check if Fake]** CTA button — primary action, prominent
- [Save to History] — secondary action
- [Scan Again] — tertiary / back

**Notes:**
- If confidence is < 40%, gently suggest retaking the photo before offering Fake Check
- The item name should be the most specific possible (brand + line + colorway if detectable)

---

### 4.3 Authentication Intro Screen

**Purpose:** Set expectations before the guided photo flow begins.

**Elements:**
- Item name (confirmed from previous screen)
- Short explanation: "To check authenticity, we'll ask you to take [N] more photos of specific areas. This takes about 60–90 seconds."
- Preview list of what will be photographed (e.g., "Stitching · Hardware · Date code · Lining")
- [Start Authentication] button
- [Not now] to go back

---

### 4.4 Guided Photo Step Screens

**Purpose:** Walk the user through capturing each authentication-relevant photo.

**Layout per step:**
- Step counter: "Step 2 of 6"
- Progress bar across top
- **Instruction title** — e.g., "Photograph the interior stamp"
- **Visual guide** — a reference diagram or example photo showing exactly what to capture and how to frame it
- **Tip text** — e.g., "Make sure the text is in sharp focus. Tap to focus if needed."
- Live camera viewfinder (full remaining screen space)
- Capture button
- [Skip this step] — allowed for optional steps; required steps cannot be skipped
- Zoom control (pinch or slider) for close-up details

**Step types:**
- **Required** — verdict cannot be given without this photo (e.g., serial number on a bag)
- **Optional** — adds confidence but not blocking (e.g., dust bag for a handbag)
- **Conditional** — only shown based on a previous answer (e.g., "Does your item have a hologram sticker?" → if yes, photograph it)

---

### 4.5 Processing / Analysis Screen

**Purpose:** Buying time while the AI analyzes all photos.

**Elements:**
- Animated graphic (subtle, not over-designed — e.g., a scanning animation)
- "Analyzing [item name]..." text
- Rotating tips about what the AI is checking (one tip every 2 seconds)
  - e.g., "Checking stitching density..." / "Inspecting hardware engravings..." / "Verifying logo font..."
- Estimated time remaining if known

---

### 4.6 Verdict Screen

**Purpose:** The most important screen — deliver the authentication result.

**Verdict states:**
- ✅ **Authentic** — appears likely to be genuine
- ❌ **Counterfeit** — appears likely to be fake
- ⚠️ **Inconclusive** — not enough evidence to make a determination

**Layout:**
- Large verdict badge (color + icon + label) — takes up top 30% of screen
- Overall confidence score for the verdict (e.g., "87% confident this is authentic")
- **Evidence summary** — list of what was checked and what the AI found:
  - Each check item shows: check name, result (✓ Pass / ✗ Fail / ? Inconclusive), and a one-line finding
  - Tappable — expands to show the photo submitted for that check + what the AI observed
- Collapsed "What to look for" section — educational content about this item category (non-alarming, always visible regardless of verdict)
- **[Dispute this verdict]** button — visible but not prominent (secondary CTA)
- [Done] and [Scan Another Item]

**Verdict confidence display:**
- The overall verdict confidence is derived from the weighted average of all individual checks
- Items where fakes are common (e.g., Yeezys, LV bags) have a higher bar for "Authentic"

---

### 4.7 Correction / Dispute Screen

**Purpose:** Let the user tell us we got it wrong.

**Triggered when:** User taps "Dispute this verdict"

**Elements:**
- Header: "Tell us what we got wrong"
- Original verdict shown (e.g., "We said: Counterfeit")
- Toggle: "This item is actually..." → [Authentic] / [Fake] / [I'm not sure, but the verdict seems wrong]
- Text field (required): "Tell us why" — 20–500 characters
  - Placeholder: "e.g., I purchased this directly from the Louis Vuitton store and have the receipt. The date code matches my purchase date."
- Optional: "Add supporting photos" — up to 3 photos the user can attach (receipt, certificate of authenticity, purchase confirmation)
- [Submit Correction] button
- Small disclaimer: "Your correction and photos will be reviewed and used to improve our model. Nothing identifying you will be attached."

**On submit:**
- Optimistic confirmation: "Thanks — your correction has been submitted."
- The scan in History is updated with a "Disputed" tag
- Data is queued for backend sync

---

### 4.8 Scan History Screen

**Purpose:** All past scans, stored locally.

**Elements:**
- Chronological list (most recent first)
- Each row: thumbnail · item name · verdict badge · date · category
- Filter bar: All / Authentic / Counterfeit / Inconclusive / Disputed
- Search by item name
- Tap a row → opens the original Verdict Screen for that scan (read-only)
- Swipe to delete a scan
- "Clear all history" in settings

**Storage:**
- Stored locally on device (AsyncStorage or SQLite via expo-sqlite)
- Optional: If user creates an account (future), syncs to backend

---

### 4.9 Settings Screen

**Purpose:** App preferences and account management.

**Elements:**
- Notification preferences (if any push notifications are added later)
- Camera quality setting (balanced vs. high quality — affects upload speed)
- Clear scan history
- Privacy policy and Terms of use links
- App version
- "Send feedback" — opens email or in-app form
- [Create Account] / [Sign In] — placeholder for future auth (not functional at launch)

---

## 5. Item Identification Engine

### 5.1 How It Works

1. User captures a photo
2. Photo is sent to backend API
3. API routes to a vision model (e.g., Google Vision API, AWS Rekognition, or a fine-tuned model) that returns:
   - Item category (e.g., `luxury_handbag`, `sneaker`, `trading_card`)
   - Brand (e.g., `louis_vuitton`, `nike`, `pokemon`)
   - Specific product line if detectable (e.g., `neverfull_mm`, `air_jordan_1`)
   - Raw confidence scores for top N candidates
4. App displays the top result with its confidence, plus "Was this…?" alternatives if top confidence is below 90%

### 5.2 Category Taxonomy (V1)

The app should be capable of identifying and authenticating items in these categories at launch:

| Category | Examples |
|---|---|
| Luxury Handbags | Louis Vuitton, Gucci, Chanel, Hermès, Prada, Dior, Balenciaga |
| Sneakers | Nike / Air Jordan, Adidas (Yeezy, Stan Smith), New Balance, Off-White collabs |
| Trading Cards | Pokémon, Magic: The Gathering, sports cards (NBA, NFL) |
| Luxury Watches | Rolex, Omega, AP, Patek Philippe, Cartier |
| Streetwear / Apparel | Supreme, Off-White, Bape, Stone Island |
| Art Prints | Signed prints, limited editions, street art (Banksy, KAWS) |
| Wine / Spirits | Champagne (Dom Pérignon, Krug), Scotch, rare bottles |
| Vintage Sneakers / Shoes | General vintage footwear |
| Jewelry | Rings, necklaces, bracelets — gold/diamond verification |
| Sunglasses | Ray-Ban, Cartier, Chanel |
| Collectible Toys | Funko Pop, LEGO sets, vintage action figures |
| Cars | VIN verification, odometer, general condition |

---

## 6. Authentication Flows — Category-Specific Guides

Each category has a defined authentication protocol: a sequence of photos to request and what the AI checks in each.

---

### 6.1 Luxury Handbags

**Brands covered:** Louis Vuitton, Gucci, Chanel, Hermès, Prada, Dior, Balenciaga, Celine, Fendi

**Photo steps:**

| Step | What to photograph | What AI checks | Required? |
|---|---|---|---|
| 1 | Overall exterior (front) | Monogram/logo alignment, canvas pattern, symmetry | ✅ |
| 2 | Stitching (close-up, corner or seam) | Stitch count per inch (authentic LV = ~5–6), even tension, thread color | ✅ |
| 3 | Hardware (zipper pulls, clasps, D-rings) | Logo engraving depth, metal finish, zipper brand (Lampo/Éclair for LV) | ✅ |
| 4 | Date code / serial number (interior stamp) | Format matches brand/era, font, placement | ✅ |
| 5 | Interior lining | Color, texture, brand-stamped lining (Gucci GG pattern, LV microfiber) | ✅ |
| 6 | Exterior bottom | Feet alignment, piping quality, canvas continuation | Optional |
| 7 | Dust bag (if available) | Correct color/format for brand/year, drawstring type | Optional |
| 8 | Authenticity card (if available) | Font, hologram, card stock | Optional |

**Key red flags to detect:**
- LV: Monogram cut off at seams incorrectly (authentic bags center the LV on front pockets), "LV" never appears upside down on the back, vachetta leather starts pale and darkens with use
- Gucci: Double-G should be symmetrical; fabric shouldn't pill; "GUCCI" text on hardware should be crisp
- Chanel: Quilting should be perfectly diamond-shaped; chain should alternate leather/chain; CC logo should perfectly align
- Hermès: Blind stamp (craftsman code) inside flap; stitching done by hand (slight irregularity is authentic); hardware screws should all face same direction

---

### 6.2 Sneakers

**Brands covered:** Nike/Air Jordan, Adidas (Yeezy, Forum, Samba, Stan Smith), New Balance, Converse, Off-White collabs, Travis Scott collabs

**Photo steps:**

| Step | What to photograph | What AI checks | Required? |
|---|---|---|---|
| 1 | Box label (full) | SKU format, font kerning, barcode placement, colorway name spelling | ✅ |
| 2 | Shoe overall (side profile) | Silhouette accuracy, proportions, swoosh/stripe placement | ✅ |
| 3 | Toe box (front close-up) | Shape, stitching, material texture | ✅ |
| 4 | Heel (back) | Heel counter shape, Nike/Adidas heel tab font, stitching | ✅ |
| 5 | Sole (bottom) | Tread pattern accuracy, "Air" text on Air units, outsole texture | ✅ |
| 6 | Tongue label | Font, sizing info, country of manufacture, logo placement | ✅ |
| 7 | Insole | Logo print, texture, removability | Optional |
| 8 | Lace tips (aglets) | Metal vs. plastic, color match | Optional |

**Key red flags:**
- Jordan 1: Swoosh should be continuous leather, not split; toe box shape is very specific (fake J1s often too bulbous); heel tab stitching count; Nike Air text on sole
- Yeezy Boost 350: Boost texture (real = irregular, organic-looking; fake = uniform grid); primeknit weave pattern; heel tab width; "SPLY-350" text presence/absence varies by colorway (a common fake tell)
- Nike Dunk: Toe cap stitching; sole curvature; lace eyelet spacing

---

### 6.3 Trading Cards (Pokémon, MTG, Sports)

**Photo steps:**

| Step | What to photograph | What AI checks | Required? |
|---|---|---|---|
| 1 | Card front (full) | Print quality, color accuracy, font, HP/damage numbers format | ✅ |
| 2 | Card back (full) | Blue swirl pattern accuracy, color saturation | ✅ |
| 3 | Card edge (close-up) | Layer structure (real cards have black core visible at edge), thickness | ✅ |
| 4 | Holographic area (foil cards) | Holo pattern type matches the set/year | ✅ |
| 5 | Card front under angle light | Surface texture, print rosette pattern (visible under macro) | Optional |
| 6 | Card vs. known real card (side by side) | Thickness comparison | Optional |

**Key red flags:**
- Pokémon: Real cards have a thin black layer in the middle visible on the card edge; holo patterns are set-specific; font on older sets (Base Set) is very specific; energy symbols have precise sizing; fake cards often have slightly different blue on the back
- Magic: The Gathering: The font ("Matrix Bold" and "Mplantin") is very specific; real cards pass the "rip test" (black layer in center, though we don't suggest destroying cards); set symbols should match the rarity dot
- Sports cards: Print quality of player photos; Topps/Panini-specific security features; hologram placement

---

### 6.4 Luxury Watches

**Photo steps:**

| Step | What to photograph | What AI checks | Required? |
|---|---|---|---|
| 1 | Dial (front face) | Logo font, hands finish, dial text layout, lume accuracy, indices | ✅ |
| 2 | Case profile (3 o'clock side) | Case finishing (brushed vs. polished, alternating correctly), crown | ✅ |
| 3 | Caseback | Exhibition caseback movement or solid caseback engravings, serial number format | ✅ |
| 4 | Bracelet / clasp | Clasp engravings, link finishing, clasp mechanism type | ✅ |
| 5 | Crown close-up | Logo engraved on crown, correct number of grooves | Optional |
| 6 | Cyclops / date window (Rolex) | Magnification level (genuine = 2.5x), date font | Optional |

**Key red flags:**
- Rolex: Cyclops magnification (fakes often much less than 2.5x); "Swiss Made" at 6 o'clock; Rolex crown logo on dial should be perfectly formed; date wheel font; rehaut (inner bezel) engraving; serial number on caseback (Rolex moved it to the rehaut post-2005)
- AP Royal Oak: Tapisserie dial pattern (should be very fine and precise); "Grande Tapisserie" text; screw beveling on case; crown shape

---

### 6.5 Art Prints & Limited Editions

**Photo steps:**

| Step | What to photograph | What AI checks | Required? |
|---|---|---|---|
| 1 | Full print front | Print quality, color saturation, composition accuracy vs. known originals | ✅ |
| 2 | Signature (if present) | Signature location, consistency with artist's known signature style | ✅ |
| 3 | Edition numbering | Format (e.g., "42/200"), placement, font | ✅ |
| 4 | Paper/canvas edge | Texture, deckled vs. cut edge, paper weight appearance | Optional |
| 5 | Back of piece | Publisher stamp, COA attachment points, hanging hardware | Optional |
| 6 | Certificate of Authenticity (if available) | COA format, hologram, publisher details | Optional |

**Key red flags:**
- KAWS prints: Specific paper type (often Arches or Coventry Rag); edition numbers hand-written; KAWS signature is very specific
- Banksy: Pest Control COA is the gold standard — check COA format carefully; canvas prints vs. paper; stencil texture
- General: Inkjet vs. screen print can often be distinguished under magnification

---

### 6.6 Wine & Spirits

**Photo steps:**

| Step | What to photograph | What AI checks | Required? |
|---|---|---|---|
| 1 | Label (front, full) | Label printing quality, font accuracy, vineyard crest details | ✅ |
| 2 | Back label | Text, importer information, regulatory text | ✅ |
| 3 | Capsule (top of bottle) | Capsule material, embossing, color, brand markings | ✅ |
| 4 | Cork (if accessible) | Brand-branded cork, cork condition | Optional |
| 5 | Fill level (ullage) | Appropriate level for stated vintage (older wines lose volume) | Optional |
| 6 | Authentication code / hologram | Bottle-specific security features (some estates use QR + hologram) | Optional |

**Key red flags:**
- Dom Pérignon: Specific label typography; capsule foil quality; vintage years have specific design language
- Pappy Van Winkle: Extremely common to counterfeit; label printing quality; glass bottle mold seam; fill level; correct closure type per year
- General: Real wine labels from premium estates are printed with very high quality — blurriness, color inconsistency, and cheap label stock are major red flags

---

### 6.7 Cars

**Photo steps:**

| Step | What to photograph | What AI checks | Required? |
|---|---|---|---|
| 1 | VIN plate (dashboard, visible through windshield) | VIN format, font, presence of anti-tamper features | ✅ |
| 2 | Door jamb VIN sticker | VIN matches dashboard, sticker condition | ✅ |
| 3 | Odometer | Reading, consistency with wear on steering wheel/pedals | ✅ |
| 4 | Panel gaps (door-to-fender) | Uniformity suggests no unreported body work | ✅ |
| 5 | Engine bay | VIN stamp on engine, general cleanliness, OEM components | Optional |
| 6 | Steering wheel/pedals (wear) | Wear level should match mileage | Optional |
| 7 | Interior overall | Wear, replaced components, OEM vs. aftermarket | Optional |

**Key red flags:**
- VIN cloning: VIN numbers copied from a legitimate vehicle and applied to a stolen one; multiple VIN locations should all match and be in OEM condition
- Odometer rollback: Interior wear (steering wheel leather, pedal rubber) should match stated mileage
- Flood damage: Waterlines in trunk/door sills, musty smell, corrosion under carpets (hard to detect via photo — flag for in-person inspection)
- Salvage title washing: Cross-reference detected VIN against known databases (Carfax integration is a V2 feature)

---

### 6.8 Streetwear & Apparel

**Photo steps:**

| Step | What to photograph | What AI checks | Required? |
|---|---|---|---|
| 1 | Front of garment | Print placement, graphic accuracy, colorway | ✅ |
| 2 | Interior tag (brand tag + care tag) | Font, tag placement, care instructions format, country of manufacture | ✅ |
| 3 | Stitching/seams | Quality, stitch density | ✅ |
| 4 | Box logo / main graphic (close-up) | Font consistency, print quality, ink bleeding | ✅ |

**Key red flags:**
- Supreme: Box logo font (Futura Heavy Oblique); stitching on interior neck tape; season-specific tag formats; "R" trademark symbol placement
- Off-White: Zip tie tag format; "FOR WALKING" quotes typography; Helvetica font consistency
- Bape: Shark hoodie zipper (should be a YKK); ape head embroidery count; camo pattern print quality

---

### 6.9 Jewelry

**Photo steps:**

| Step | What to photograph | What AI checks | Required? |
|---|---|---|---|
| 1 | Full piece | Overall design, proportions | ✅ |
| 2 | Hallmark / stamps | Metal purity stamps (750 = 18k gold, 925 = sterling silver, PT950 = platinum), format | ✅ |
| 3 | Stone(s) if present | Cut precision, clarity, setting quality | ✅ |
| 4 | Clasp / closure | Mechanism type, brand stamps on clasp | Optional |

**Note:** Jewelry authentication via photo is inherently limited — the spec should clearly communicate this to users. Photo analysis can flag obvious fakes (missing hallmarks, wrong stamp format) but cannot replace gemological testing for diamond certification.

---

### 6.10 Collectible Toys (Funko, LEGO, Vintage)

**Photo steps:**

| Step | What to photograph | What AI checks | Required? |
|---|---|---|---|
| 1 | Box/packaging (front) | Print quality, correct UPC, logo placement, hologram sticker position | ✅ |
| 2 | Figure itself | Paint quality, face decal alignment, material finish | ✅ |
| 3 | Box bottom | Barcode, item number format | Optional |
| 4 | Any authenticity sticker | Sticker design, hologram pattern | Optional |

---

## 7. Verdict Logic

### 7.1 Check Scoring

Each photo check returns a score 0–100. Scores are weighted by importance per category:

- **Critical checks** (weight 3): Serial number/date code, logo accuracy, primary authentication marker
- **Strong checks** (weight 2): Stitching, hardware, materials
- **Supporting checks** (weight 1): Dust bag, packaging, accessories

### 7.2 Verdict Thresholds

```
Weighted average ≥ 80  →  Authentic
Weighted average 50–79 →  Inconclusive (recommend expert verification)
Weighted average < 50  →  Counterfeit
```

### 7.3 Hard Fails

Certain checks, if they fail definitively, override the weighted average and produce an immediate Counterfeit verdict:

- LV date code format completely wrong for the stated era
- Pokémon card missing the black core layer
- VINs don't match across locations
- Watch serial number format inconsistent with brand/reference

### 7.4 Inconclusive Handling

When verdict is Inconclusive, the app should:
- Explain which checks were uncertain and why
- Suggest specific in-person verification steps (e.g., "Take this to an authorized dealer" or "Submit to a grading service like PSA/BGS")
- List reputable professional authentication services for that category

---

## 8. Correction & Feedback System

### 8.1 Submission Flow

When a user disputes a verdict:

1. User selects the correct verdict (Authentic / Fake / Unknown)
2. User enters free text explanation (required, min 20 chars)
3. User optionally attaches up to 3 supporting photos
4. App sends the following to backend:
   - All original scan photos
   - AI's verdict and confidence scores per check
   - User's correction and text
   - Supporting photos
   - Item category and identified product
   - Timestamp and app version

### 8.2 Backend Storage

Correction payloads are stored in a dedicated `corrections` table/collection. The data schema is designed so that AI agents can:
- Filter corrections by category, product, and verdict type
- Compare original AI analysis against user-provided ground truth
- Identify systematic failure patterns (e.g., "the AI consistently fails on Yeezy 350 Turtle Dove colorway")
- Generate fine-tuning datasets from confirmed corrections

### 8.3 Moderation Pipeline (V2)

In a future version, high-volume corrections on the same item/check can trigger:
- A review queue for a human moderator
- If confirmed, the correction feeds directly into model retraining
- User who submitted gets a "Contributed to training" badge in their history

---

## 9. Backend Architecture

### 9.1 Services

| Service | Purpose | Suggested tech |
|---|---|---|
| API Gateway | Routes mobile requests to appropriate services | Node.js + Express or FastAPI |
| Identification Service | Classifies item from first photo | Vision model API (Google Vision, GPT-4o Vision, or fine-tuned CLIP) |
| Authentication Service | Analyzes multi-photo sets and returns per-check scores | Custom orchestration + vision model |
| Correction Ingest Service | Receives, validates, stores user corrections | Lightweight REST endpoint |
| Storage | Photos, correction attachments | AWS S3 or GCS |
| Database | Scan records, corrections, audit logs | PostgreSQL |
| Queue | Async processing for heavy analysis jobs | Redis + BullMQ or AWS SQS |

### 9.2 Authentication Service Flow

```
POST /auth/analyze
  → Receive: { item_category, product_id, photos: [{step_id, image_url}] }
  → For each photo:
      → Send to vision model with step-specific prompt
      → Receive: { score, flags, observations }
  → Aggregate scores with weights
  → Apply hard-fail rules
  → Return: { verdict, overall_confidence, checks: [{name, score, result, observation}] }
```

### 9.3 Correction Ingest Schema

```json
{
  "scan_id": "uuid",
  "user_correction": "authentic | counterfeit | unknown",
  "explanation": "string (20–500 chars)",
  "supporting_image_urls": ["string"],
  "original_verdict": "authentic | counterfeit | inconclusive",
  "original_confidence": 0.87,
  "item_category": "luxury_handbag",
  "product_id": "lv_neverfull_mm",
  "original_checks": [
    {
      "check_id": "stitching",
      "score": 45,
      "result": "fail",
      "observation": "Stitch count appears low at approximately 3 per inch"
    }
  ],
  "all_scan_image_urls": ["string"],
  "submitted_at": "ISO 8601 timestamp",
  "app_version": "1.0.0",
  "platform": "ios | android"
}
```

---

## 10. AI / ML Architecture

### 10.1 V1 — Prompt Engineering on Foundation Model

At launch, leverage existing vision models (GPT-4o Vision or Gemini Vision) with carefully engineered prompts per category and check step. This avoids the need for training data upfront.

**Approach:**
- Each authentication check has a specific system prompt tuned to detect the relevant feature
- Prompts include:
  - What to look for
  - What authentic looks like
  - Common fake indicators
  - A scoring instruction (return 0–100 and a reason)

**Example prompt for Pokémon card edge check:**
```
You are an expert Pokémon card authenticator. The user has photographed the edge of a card.

Examine this image and assess:
1. Is a black core layer visible at the card's edge? (Authentic cards have a thin black line in the center when viewed edge-on)
2. Does the card appear to have the correct thickness for a genuine WOTC/Nintendo Pokémon card?
3. Are the card layers clearly defined, or does it appear to be a single-layer printout?

Return a JSON object:
{
  "score": 0-100,
  "black_core_visible": true|false|null,
  "observations": "brief description of what you see",
  "red_flags": ["list any concerning features"]
}
```

### 10.2 V2 — Fine-Tuned Models

Once correction data has been collected (estimated: 6–12 months of usage):
- Fine-tune a lightweight vision model (e.g., CLIP, Phi-3 Vision, or LLaVA) on the labeled correction dataset
- Category-specific models can be trained independently, allowing the most-used categories to get better faster
- Human-reviewed corrections become the gold standard training set

### 10.3 Learning Loop

```
User Corrections
      ↓
Correction Ingest Service
      ↓
PostgreSQL corrections table
      ↓
Nightly batch job: export confirmed corrections → labeled dataset
      ↓
Fine-tuning pipeline (V2)
      ↓
Model registry → new model version deployed
      ↓
A/B test new vs. old on held-out scan set
      ↓
If improved, promote to production
```

---

## 11. React Native Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native (Expo managed workflow) |
| Camera | expo-camera or react-native-vision-camera |
| Image handling | expo-image-picker, expo-image-manipulator |
| Local storage | expo-sqlite (scan history) |
| State management | Zustand or Redux Toolkit |
| Navigation | React Navigation v6 |
| Networking | Axios or fetch with React Query |
| Animations | React Native Reanimated v3 |
| UI components | Custom components + React Native Paper or NativeBase for base components |
| Icons | Expo Vector Icons |
| Backend API | REST (JSON) |
| File uploads | Multipart form data via Axios |
| Analytics (V2) | Mixpanel or PostHog |

---

## 12. UX & Design Principles

1. **Speed over ceremony** — The user should be scanning within 2 seconds of opening the app. No splash screens, no onboarding walls.
2. **Guide, don't gatekeep** — If a photo step is unclear, show a reference image. Never just say "take a photo of the stitching" without showing what that means.
3. **Confidence is transparent** — Never show a binary Real/Fake without a confidence score and the evidence behind it. Users should understand why we said what we said.
4. **Corrections are first-class** — The dispute flow should feel empowering, not hidden. We want corrections. Make the button easy to find.
5. **Offline resilience** — Scan history works offline. Corrections queue for sync when connection is restored.
6. **Accessibility** — All interactive elements meet WCAG AA contrast ratios. Verdict colors are never the only indicator (always paired with text).

---

## 13. Edge Cases & Error Handling

| Scenario | Handling |
|---|---|
| Photo too blurry | Detect blur score before upload; prompt to retake with tip |
| Item not recognized | Return "Unknown item" with option to manually pick category |
| Network error during analysis | Show error state with retry button; queue for when online |
| User skips too many required steps | Cannot submit for verdict; show what steps are still needed |
| API returns low confidence on all checks | Return Inconclusive, not a forced verdict |
| User uploads a screenshot of an item (not a real photo) | Flag if exif data absent; note it may reduce accuracy |
| Item is authentic but listing photos show fake | Remind users to photograph the actual item, not listing photos |

---

## 14. Privacy & Data Handling

- Photos sent to the server are used only for authentication and, if submitted as corrections, for model improvement
- No photos are stored beyond 30 days unless explicitly attached to a user correction
- Correction photos are stored indefinitely for training purposes, but stripped of any EXIF location data before storage
- No personal information is required to use the app
- If an account system is added later, opt-in only for history sync

---

## 15. Metrics to Track (for product iteration)

| Metric | Why it matters |
|---|---|
| Identification accuracy | Are we identifying items correctly? |
| Fake check conversion rate | % of identifications that proceed to fake check |
| Step completion rate | Which photo steps do users skip most? |
| Correction rate | % of verdicts that get disputed |
| Correction direction | Are users correcting Fake→Real or Real→Fake? |
| Category distribution | Which categories are used most? |
| Time to verdict | How long does the full flow take? |
| Retry rate on photo steps | Which steps are hardest to photograph? |

---

## 16. V2 / Future Feature Roadmap

These features are intentionally excluded from V1 but should be designed for:

| Feature | Description |
|---|---|
| User accounts | Sync scan history across devices, contribution history |
| Expert verification marketplace | Connect users with human authenticators for high-value items |
| Carfax / VIN database integration | Real-time title and accident history for vehicles |
| Price estimator | After authentication, show current market value |
| Social sharing | Share a "Certified Authentic" card to social media |
| Grading service integration | One-tap submission to PSA, BGS, Beckett for cards/shoes |
| Subscription tier | Unlimited deep-checks, priority processing, expert review |
| Barcode / QR scan | Scan product QR codes as a supplemental authentication signal |
| AR overlay | Highlight specific areas on live camera with AR guides |
| Watchlist | User saves specific items they collect; gets alerts when model updates |
| Batch check | Upload multiple photos at once for dealers/resellers |
| API for resale platforms | B2B: integrate authentication into eBay/StockX/Depop listings |

---

## 17. Key Open Questions Before Development

1. **Vision model selection** — GPT-4o Vision is strong but costly at scale. Consider tiered approach: cheap model for identification, expensive model only for authentication checks.
2. **Authentication prompt library** — The per-check prompts are the core IP of this product. These need to be written and tested before launch for each category.
3. **Legal positioning** — The app should never position itself as a definitive legal authentication service. All verdicts should include a disclaimer: "This is an AI-assisted assessment, not a certified appraisal."
4. **Category prioritization** — Recommend launching with 3–4 categories (sneakers, handbags, Pokémon cards, watches) rather than all 12, to allow deeper prompt tuning per category before expanding.
5. **App name** — "FakeCheck" is used as a working title in this spec. Trademark check required before launch.
