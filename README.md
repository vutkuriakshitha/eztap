# EZTAP

A hyperlocal task marketplace. Customers post tasks, nearby helpers apply, the customer hires one, and the job moves through to completion and a review.

**Live demo:** https://eztap-8a876.web.app

**Stack:** React 19, Vite, React Router, Firebase Auth, Firestore, Firebase Hosting

## Features

- One account for everyone, with a navbar switch between *Get tasks done* (customer) and *Earn as helper*
- Email/password and Google sign-in, plus password reset
- Post tasks with category, description, budget and city; browse open tasks and apply with a message
- Hiring flow enforced by security rules: `open → assigned → in-progress → completed` (or `cancelled`)
- Star reviews after completion, and public helper profiles with review history
- Trust levels:
  - **Verified**: confirmed email or Google account
  - **Trusted**: helper submits phone and proof, an admin approves it
  - **Community trusted**: vouches from verified members or past customers
- In-app notifications and an admin page for reviewing Trusted requests

## Design notes

- All Firestore access lives in `src/lib/data.js`, so pages never call Firestore directly.
- `firestore.rules` is the real backend logic. It validates every status transition, stops users granting themselves `verified` or `trusted`, keeps phone numbers in a private `trustRequests` collection, and limits who can read applications.
- Admins are accounts with a document in the `admins` collection. That collection is not writable from the client.

## Project structure

```
src/
  pages/        One component per route
  components/   Navbar, Footer, Onboarding, Badges, ProtectedRoute
  context/      AuthContext (Firebase Auth + Firestore profile)
  lib/          firebase.js (init), data.js (Firestore reads/writes)
  styles/       global, landing and onboarding CSS
firestore.rules         Security rules
firestore.indexes.json  Composite indexes
firebase.json           Hosting + Firestore config
```

## Run locally

1. Create a Firebase project, register a web app, and enable **Email/Password** and **Google** under Authentication. Create a Firestore database.
2. Copy the env template and fill in your web app config:
   ```bash
   cp .env.example .env.local
   ```
3. Install and start:
   ```bash
   npm install
   npm run dev
   ```
4. To use the admin page, sign in, open `/admin` to see your user ID, then create a document with that ID in the Firestore `admins` collection.

## Deploy

```bash
npm run build
npx firebase-tools login
npx firebase-tools deploy
```

This publishes the site, the security rules and the indexes. `deploy.bat` runs the same steps on Windows.

## Not built yet

- Real payments (Razorpay/Stripe integration)
- Government ID / KYC verification (Requires paid subscription)

