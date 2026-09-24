# BoardQuiz

Responsive, no-backend Army Promotion Board study companion built from 24 Quizlet-exported study sets.

## Included

- Flashcards with **mastered** and **review again** tracking.
- Expandable study guides for every section.
- Separate scored tests for every study section. Before every test, the user sees the accumulated correct, incorrect, and best-round score.
- Random Board Drill questions for oral-practice sessions.
- NCO Creed practice: read, hidden words, first-letter cues, and typed recall.
- A general readiness rank based on flashcard mastery and test accuracy.
- A desktop-first design that adapts to phones.

Progress is saved locally in the browser with `localStorage`; no account or backend is required.

## Test locally

Open the `boardquiz` folder using a local web server, then visit `index.html`. The study data is loaded from `quizlet_backup_24_sets.json`, and browsers may block that request if the HTML file is opened directly.

## Publish with GitHub Pages

1. Put the contents of this `boardquiz` folder at the root of your GitHub repository.
2. On GitHub, go to **Settings → Pages**.
3. Under **Build and deployment**, select **Deploy from a branch**.
4. Choose `main` and `/(root)`, then save.
5. GitHub will display the public website address once deployment finishes.

## Main files

- `index.html` — app layout and navigation
- `style.css` — responsive visual design
- `app.js` — study modes, tests, ranking, and saved progress
- `quizlet_backup_24_sets.json` — supplied study content
