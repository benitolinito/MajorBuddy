# MajorBuddy

MajorBuddy is a course planning tool for building term-by-term degree plans and tracking requirements.

## Getting started

```sh
npm install
npm run dev
```

### Environment variables

1. Copy `.env/.env.example` to `.env/.env.local`.
2. Fill in the file with your Firebase project settings (the keys must keep the `VITE_` prefix).
3. Restart `npm run dev` so Vite reloads the updated env variables.

## Scripts

- `npm run dev` - start the Vite dev server
- `npm run build` - create a production build
- `npm run preview` - preview the production build locally
- `npm run lint` - run ESLint

## Tech stack

- Vite + React + TypeScript
- Tailwind CSS + shadcn/ui
- Firebase (auth + Firestore)
