# BoardQuiz

Responsive Army Promotion Board study web app built from exported Quizlet study sets.

## Features
- 24 study topics / 236 questions
- Topic review
- Flashcards with browser-saved progress
- Multiple-choice test mode
- Random Board Simulation
- NCO Creed training: read, hidden words, first-letter cues, and typed recall
- Responsive desktop/mobile navigation
- No backend or account required

## Publish with GitHub Pages
1. Upload all files in this folder to the repository root.
2. In GitHub: **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select branch **main** and folder **/(root)**, then Save.
5. GitHub will provide the public Pages URL.

## Files
- `index.html` — app shell
- `style.css` — responsive design
- `app.js` — study modes and NCO Creed trainer
- `quizlet_backup_24_sets.json` — study content

Progress is saved locally with `localStorage` and therefore stays on the device/browser where the student studies.
