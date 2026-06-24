# FakeCheck — Store Listing & Submission Pack (Phase 14)

Draft metadata for Google Play (and reusable for the App Store later). Review the
copy, then paste into the Play Console "Store listing" + complete the declaration
forms below. Replace any **[TODO]** before publishing.

---

## App identity

- **App name:** FakeCheck
- **Android package (permanent):** `com.flossinfakecheck.app`
- **EAS owner / project slug:** flossin / fakecheck
- **Category:** Shopping (alt: Lifestyle)
- **Default language:** English (US)
- **Contact email:** support@flossinfakecheck.app  **[TODO: confirm mailbox exists]**
- **Privacy policy URL:** **[TODO: host `docs/legal/privacy-policy.md` and paste the URL]**

## Short description (max 80 chars)

> Snap a photo, get an instant AI authenticity check on sneakers, bags & more.

## Full description (max 4000 chars)

> Worried something might be a fake? FakeCheck gives you a fast, AI-assisted
> authenticity opinion before you buy or sell.
>
> Just snap a photo. FakeCheck identifies the item, walks you through a few quick
> guided photos of the details that matter, and returns a clear verdict with the
> evidence behind it — so you can see *why*, not just a yes or no.
>
> Built for four high-counterfeit categories:
> • Sneakers
> • Luxury handbags
> • Pokémon cards
> • Luxury watches
>
> Why FakeCheck:
> • Fast — most checks take under a couple of minutes.
> • Transparent — every verdict shows the specific checks that passed or failed.
> • Guided — on-screen prompts show exactly which angles and details to capture.
> • Private — no account, no name or email required. Scan photos are deleted
>   within 30 days.
> • Honest — if the photos aren't clear enough to call it, we say so instead of
>   guessing.
>
> FakeCheck provides an AI-assisted opinion, not a guarantee of authenticity.
> Always use your own judgment for any purchase or resale decision.
>
> Questions or feedback? support@flossinfakecheck.app

## Graphics checklist (Play requirements)

- [ ] **App icon** — 512 × 512 PNG, 32-bit, no alpha edges issues
- [ ] **Feature graphic** — 1024 × 500 PNG/JPG (shown at top of listing)
- [ ] **Phone screenshots** — at least 2 (recommend 4–8), 16:9 or 9:16, min 320px
      → suggested: Home/camera, Identification result, Guided steps, Verdict
- [ ] (Optional) 7"/10" tablet screenshots — skip (app is phone-only, no tablet)

## Required Play Console declarations ("Set up your app")

**App access:** All functionality available without special access (no login). 

**Ads:** Contains ads = **No**.

**Content rating:** Complete the IARC questionnaire. FakeCheck has no violence,
sexual, or sensitive content → expect **Everyone / PEGI 3**. **[verify by
answering the questionnaire]**

**Target audience & content:** Target age **18+** (resale/authentication tool;
keeps it out of the child-directed program). Not designed for children.

**Data safety form — answers:**
- Data collected: **Photos** (item images) and **App activity/diagnostics**
  (app version, anonymous device id).
- Purpose: **App functionality** and **Analytics / app improvement**.
- Is data shared with third parties? **No** (processors only — hosting, storage,
  AI vision — to provide the app).
- Is data encrypted in transit? **Yes**.
- Can users request deletion? **Yes** (via support email; local history clearable
  in-app). Photos auto-deleted within 30 days.
- Collects no name, email, location, financial info, or advertising id.

**Government/financial app:** No.

## Release track

- First release → **Internal testing** track (fastest; add tester emails).
- Promote to **Closed → Open testing → Production** once the 4 category flows pass
  on real devices.

## App Store (iOS) — fill later in Phase 14b

- Apple Developer account + bundle id `com.flossinfakecheck.app`
- Reuse the descriptions above (App Store: 30-char name, 170-char subtitle,
  4000-char description); add the AI-assist disclaimer in the description.
- App Privacy "nutrition label" mirrors the Data safety answers above.
