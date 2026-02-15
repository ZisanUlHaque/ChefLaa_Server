## Cheflaa – AI‑Native Kitchen Copilot (Demo Scan Mode)

Cheflaa is an AI‑first recipe and meal‑planning web app designed to turn a single photo of your fridge or ingredients into structured recipes, macros, and cooking steps.

> ⚠️ Current status: **manual/demo scan mode**  
> Image uploads are processed by a simulated “AI” backend that generates realistic random ingredients and recipes. True AI image detection (Gemini/Groq/etc.) is planned and the architecture is already prepared for it.

---

### What Cheflaa Does

- **Scan from a photo**
  - Upload a photo of your fridge, pantry, or ingredients.
  - The backend simulates AI by:
    - Picking realistic ingredient sets.
    - Generating recipe objects with:
      - `title`, `short` description
      - `time`, `servings`, `difficulty`, `cuisine`
      - `kcal`, `protein`, `carbs`, `fats`
      - `ingredients[]`, `steps[]`, `tips[]`
  - Returns 1–3 recipes per scan + the “detected” ingredients.

- **Auth & user accounts**
  - JWT‑based **sign up / login** (email + password).
  - Current user endpoint (`/api/auth/me`) for session restore.
  - User preferences scaffolded for future diet/allergy settings.

- **Saved recipes**
  - Logged‑in users can save recipes from the scan results.
  - `Saved Recipes` page shows a grid of all favorited recipes.
  - Remove from saved with a single click.

- **Scan history**
  - Every scan is stored in MongoDB with:
    - ingredients list
    - recipe count
    - timestamp & file meta
  - `Scan History` page shows:
    - all past scans (expandable)
    - per‑scan ingredients
    - simple stats: total ingredients, recipes generated, active days.

- **Recipe details page**
  - Dedicated route per recipe (`/recipe/:slug`).
  - Displays:
    - Hero image (unsplash placeholder based on title)
    - Title, short description
    - Time, servings, difficulty
    - Full macros: kcal, protein, carbs, fats
    - Ingredients list
    - Step‑by‑step instructions
    - Tips / notes

---

### Frontend

- **Tech stack**
  - React (Vite)
  - React Router
  - Tailwind CSS + DaisyUI
  - Context providers for:
    - Theme (light/dark)
    - Auth state (user + token)

- **UI Highlights**
  - **Landing / Hero page**
    - Animated background slider with food photos.
    - Glassmorphism navbar with brand logo (**Cheflaa**).
    - Personalized greeting if the user is logged in.
    - Primary CTA: *“Start a free scan”*.
  - **Scan page**
    - Drag & drop or click‑to‑upload image input.
    - Live image preview.
    - Fake AI progress ring (0–90% while waiting for response).
    - “Detected ingredients” chip list.
    - “Generated recipes” list with quick view and CTA to full recipe.
    - A marquee banner explaining:
      - this is a **manual/demo scan**
      - AI image integration is **coming soon**.
  - **Saved Recipes page**
    - Responsive card grid with:
      - recipe title, short description
      - macros snippet
      - quick link to full recipe
      - remove from saved.
  - **Scan History page**
    - Timeline‑style list of scans.
    - Expandable rows to see all ingredients.
    - Quick stats summary (total ingredients, recipes, active days).
  - **Auth pages**
    - Polished login & signup UIs with validation.
    - Redirect back to the originally requested page after login.

- **Theming / Branding**
  - Full light/dark mode toggle.
  - Brand palette:
    - Primary: `#1B4332` (forest green)
    - Secondary: `#D8F3DC` (fresh mint)
    - Accent: `#FF7043` (sunset orange)
  - Navbar & buttons are styled around these colors.

---

### Backend

- **Tech stack**
  - Node.js + Express
  - MongoDB (MongoDB Atlas)
  - JWT for authentication
  - Bcrypt for password hashing

- **Core endpoints**
  - `POST /api/auth/signup` – create account
  - `POST /api/auth/login` – login and receive JWT
  - `GET /api/auth/me` – current user info (protected)

  - `POST /api/scan` – image upload
    - Uses `multer` for file handling.
    - Simulates AI by:
      - Generating a random but plausible ingredient list.
      - Generating 1–3 recipe objects from those ingredients.
    - Saves:
      - scan record → `scans` collection
      - recipes → `recipes` collection

  - `GET /api/recipes/:slug` – fetch single recipe by slug
  - `GET /api/recipes` – list recipes with pagination (for future use)

  - `POST /api/saved-recipes` – save recipe for current user
  - `GET /api/saved-recipes` – list current user’s saved recipes
  - `DELETE /api/saved-recipes/:slug` – remove saved recipe

  - `GET /api/scan-history` – list current user’s scans

- **Data model (conceptual)**
  - **User**
    - `_id`, `name`, `email`, `passwordHash`
    - `avatar` (UI Avatars / seed)
    - `preferences` (diet, allergies – for future)
  - **Recipe**
    - `slug`, `title`, `short`
    - `time`, `servings`, `difficulty`, `cuisine`
    - `kcal`, `protein`, `carbs`, `fats`
    - `ingredients[]`, `steps[]`, `tips[]`
    - `image`, `aiGenerated`, `createdAt`
  - **Scan**
    - `userId` (nullable for guests)
    - `ingredients[]`
    - `recipeCount`
    - `fileName`, `fileSize`
    - `createdAt`
  - **SavedRecipe**
    - `userId`
    - `recipeSlug`
    - `savedAt`

---

### Roadmap / Next Steps

- Replace the manual/demo ingredient & recipe generation with:
  - Real image understanding via Gemini / Groq / other vision models.
  - Smarter ingredient merging (e.g. “tomatoes” → `tomato`).
- Add:
  - Dietary filters (vegetarian, vegan, halal, keto, etc.).
  - Allergy exclusion (nuts, dairy, gluten).
  - More advanced search and filtering for saved recipes.
- Improve:
  - Recipe rating & feedback system
  - Multi‑language support
Live link: https://chef-laa.vercel.app/
---

Cheflaa in its current state is a polished **demo** showing the full UX, auth flow, and data model for an AI‑powered cooking companion.  
Only the “brain” (real AI vision + LLM recipes) is left to be plugged in.
