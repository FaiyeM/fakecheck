# Google Play Store Submission Instructions for Snap Check

This document outlines the next steps and guidelines to publish **Snap Check** (powered by flossin) on the Google Play Store.

---

## 1. Prepare Google Play Console Account
1. Log in to your [Google Play Console](https://play.google.com/console/).
2. Select your developer account.
3. Click **Create app** in the upper-right corner:
   * **App name:** `Snap Check`
   * **Default language:** English (United States)
   * **App or game:** App
   * **Free or paid:** Free
   * **Declarations:** Confirm compliance with Developer Program Policies and US export laws.

---

## 2. Upload Branding & Visual Assets
Go to **Grow > Store presence > Main store listing** and fill in the visual assets we created for you:

### Text Assets
* **Short description:** `Snap a photo to instantly identify and check the authenticity of sneakers, bags, cards, and watches.`
* **Full description:**
  ```text
  Snap Check is the ultimate high-fashion companion for collectors, resellers, and enthusiasts. Powered by flossin, Snap Check lets you point and shoot to instantly identify items, then guides you through step-by-step checks to determine authenticity.

  FEATURES:
  • Universal Object Identification: Point at sneakers, luxury bags, collectibles, or any everyday item and instantly see brand, model, release year, and retail price.
  • Step-by-Step Guided Check: Photograph key details (labels, stitching, outsoles) with interactive overlays and reference guides.
  • Multi-Tiered AI Verdict Engine: High-fidelity vision models compute pass/fail/inconclusive outcomes based on visual evidence.
  • Offline Corrections: Disputed verdicts are safely queued locally and synced once you are back online.
  • Brutalist Monochromatic UI: A chic, high-fashion warm light theme optimized for clarity and ease of use.
  ```

### Graphics & Media
All assets are generated and formatted to exact Play Store specifications in the [store-assets/](file:///Users/faye/Documents/Claude/Projects/flossin-Fakecheck/store-assets) directory:
1. **App icon:** Upload [icon-512.png](file:///Users/faye/Documents/Claude/Projects/flossin-Fakecheck/store-assets/icon-512.png) (512x512, 32-bit PNG, no transparency).
2. **Feature graphic:** Upload [feature-1024x500.png](file:///Users/faye/Documents/Claude/Projects/flossin-Fakecheck/store-assets/feature-1024x500.png) (1024x500, PNG).
3. **Phone screenshots:** Upload all four screenshots from the [store-assets/](file:///Users/faye/Documents/Claude/Projects/flossin-Fakecheck/store-assets) directory:
   * [screenshot-1-camera.png](file:///Users/faye/Documents/Claude/Projects/flossin-Fakecheck/store-assets/screenshot-1-camera.png) (AI Recognition viewfinder)
   * [screenshot-2-identify.png](file:///Users/faye/Documents/Claude/Projects/flossin-Fakecheck/store-assets/screenshot-2-identify.png) (Sneaker brand/model metadata card)
   * [screenshot-3-guided.png](file:///Users/faye/Documents/Claude/Projects/flossin-Fakecheck/store-assets/screenshot-3-guided.png) (Guided steps silhouette capture)
   * [screenshot-4-verdict.png](file:///Users/faye/Documents/Claude/Projects/flossin-Fakecheck/store-assets/screenshot-4-verdict.png) (Authenticity score and checklist)

---

## 3. Fill "App Content" Declarations
Go to **Policy > App content** and complete the required declarations:
* **Privacy policy:** Enter the live privacy policy URL hosted by your Railway backend:
  `https://fakecheck-production.up.railway.app/privacy`
* **Ads:** Declare "No, my app contains no ads."
* **App access:** Select "All functionality is available without special access" (no user login is required to run a scan).
* **Content rating:** Complete the questionnaire. This is a utility/tool app, so it should receive a standard 3+ rating (suitable for everyone).
* **Target audience:** Select ages 13 and up (or 18+ depending on preference).
* **Financial features:** Select "No financial features" (Snap Check is currently free and does not facilitate financial transactions).

---

## 4. Deploy and Publish via EAS
1. Build the production App Bundle (.aab) on EAS:
   ```bash
   npx eas-cli build -p android --profile production
   ```
2. Submit the build to the Internal Testing track:
   ```bash
   npx eas-cli submit -p android --profile production
   ```
3. In Play Console, go to **Release > Testing > Internal testing**, click **Create new release**, select the uploaded App Bundle, write short release notes, and click **Save and Publish**.
