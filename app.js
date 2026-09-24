/* BoardQuiz is dependency-free so it can be published with GitHub Pages. */
const CREED = [
  `No one is more professional than I. I am a Non-Commissioned Officer, a leader of Soldiers. As a Non-Commissioned Officer, I realize that I am a member of a time honored corps, which is known as “The Backbone of the Army.” I am proud of the Corps of Non-Commissioned Officers and will at all times conduct myself so as to bring credit upon the Corps, the Military Service and my country regardless of the situation in which I find myself. I will not use my grade or position to attain pleasure, profit, or personal safety.`,
  `Competence is my watch-word. My two basic responsibilities will always be uppermost in my mind-accomplishment of my mission and welfare of my Soldiers. I will strive to remain tactically and technically proficient. I am aware of my role as a Non-Commissioned Officer. I will fulfill my responsibilities inherent in that role. All Soldiers are entitled to outstanding leadership; I will provide that leadership. I know my Soldiers and I will always place their needs above my own. I will communicate consistently with my Soldiers and never leave them uninformed. I will be fair and impartial when recommending both rewards and punishment.`,
  `Officers of my unit will have maximum time to accomplish their duties; they will not have to accomplish mine. I will earn their respect and confidence as well as that of my Soldiers. I will be loyal to those with whom I serve; seniors, peers and subordinates alike. I will exercise initiative by taking appropriate action in the absence of orders. I will not compromise my integrity, nor my moral courage. I will not forget, nor will I allow my comrades to forget that we are professionals, Non-Commissioned Officers, Leaders!`
];

const app = document.querySelector('#app');
const nav = document.querySelector('#nav');
const menuButton = document.querySelector('#menuBtn');
const headerStatus = document.querySelector('#headerStatus');
let sets = [];
let selectedSet = 0;
let currentView = 'home';
let flashIndex = 0;
let flashRevealed = false;
let drillQuestion = null;
let quizSession = null;
let creedMode = 'read';
let creedParagraph = 0;

const defaultProgress = () => ({ version: 2, cards: {}, quizzes: {}, creed: {} });

function loadProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem('bqProgress') || 'null');
    if (!saved) return defaultProgress();
    if (saved.version === 2) return { ...defaultProgress(), ...saved, cards: saved.cards || {}, quizzes: saved.quizzes || {} };
    // Supports the flashcard-only format from the original BoardQuiz version.
    return { ...defaultProgress(), cards: saved };
  } catch (_) {
    return defaultProgress();
  }
}

let progress = loadProgress();

function saveProgress() {
  localStorage.setItem('bqProgress', JSON.stringify(progress));
  updateHeaderStatus();
}

function decodeEntities(value = '') {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = value;
  return textarea.value;
}

function escapeHTML(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]);
}

function textToHTML(value = '') {
  return escapeHTML(decodeEntities(value)).replace(/\n/g, '<br>');
}

function allCards() {
  return sets.flatMap((set, setIndex) => set.cards.map(card => ({ ...card, setIndex, setName: set.set })));
}

const cardKey = (setIndex, cardNumber) => `${setIndex}-${cardNumber}`;

function setCardStats(setIndex) {
  const cards = sets[setIndex]?.cards || [];
  const marked = cards.map(card => progress.cards[cardKey(setIndex, card.number)]);
  return {
    total: cards.length,
    mastered: marked.filter(status => status === 'mastered' || status === 'known').length,
    review: marked.filter(status => status === 'review').length
  };
}

function quizStats(setIndex) {
  const stat = progress.quizzes[setIndex] || {};
  return {
    correct: Number(stat.correct) || 0,
    incorrect: Number(stat.incorrect) || 0,
    attempts: Number(stat.attempts) || 0,
    best: Number(stat.best) || 0,
    last: Number(stat.last) || 0
  };
}

function overallStats() {
  const cards = allCards();
  const mastered = cards.filter(card => ['mastered', 'known'].includes(progress.cards[cardKey(card.setIndex, card.number)])).length;
  const review = cards.filter(card => progress.cards[cardKey(card.setIndex, card.number)] === 'review').length;
  const quizzes = Object.values(progress.quizzes);
  const correct = quizzes.reduce((sum, stat) => sum + (Number(stat.correct) || 0), 0);
  const incorrect = quizzes.reduce((sum, stat) => sum + (Number(stat.incorrect) || 0), 0);
  const answered = correct + incorrect;
  const coverage = cards.length ? mastered / cards.length : 0;
  const accuracy = answered ? correct / answered : 0;
  // Readiness rewards retained cards and demonstrated knowledge on the section tests.
  const score = Math.round(Math.min(100, coverage * 65 + accuracy * 25 + Math.min(1, answered / Math.max(cards.length, 1)) * 10));
  return { totalCards: cards.length, mastered, review, correct, incorrect, answered, coverage, accuracy, score };
}

function getRank(score) {
  if (score >= 90) return { title: 'Board Ready', next: 'Maintain your sharp edge.', threshold: 100 };
  if (score >= 70) return { title: 'Senior Learner', next: '20% to Board Ready', threshold: 90 };
  if (score >= 45) return { title: 'Focused Soldier', next: '25% to Senior Learner', threshold: 70 };
  if (score >= 20) return { title: 'Active Learner', next: '25% to Focused Soldier', threshold: 45 };
  return { title: 'New Recruit', next: 'Begin with one section.', threshold: 20 };
}

const percent = (numerator, denominator) => denominator ? Math.round((numerator / denominator) * 100) : 0;
const plural = (count, singular, pluralForm = `${singular}s`) => `${count} ${count === 1 ? singular : pluralForm}`;

function pageHeader(eyebrow, title, subtitle = '') {
  return `<section class="page-heading"><div><p class="eyebrow">${escapeHTML(eyebrow)}</p><h1>${escapeHTML(title)}</h1>${subtitle ? `<p class="subtitle">${escapeHTML(subtitle)}</p>` : ''}</div></section>`;
}

function sectionSelector() {
  return `<div class="select-row"><label for="setSelect">Study section</label><select id="setSelect">${sets.map((set, index) => `<option value="${index}" ${index === selectedSet ? 'selected' : ''}>${String(index + 1).padStart(2, '0')} · ${escapeHTML(decodeEntities(set.set))} (${set.cards.length})</option>`).join('')}</select></div>`;
}

function updateHeaderStatus() {
  const stats = overallStats();
  headerStatus.innerHTML = `<b>${stats.mastered}</b> / ${stats.totalCards} mastered`;
}

function closeMenu() {
  nav.classList.remove('open');
  menuButton.setAttribute('aria-expanded', 'false');
}

function setActiveNav() {
  nav.querySelectorAll('[data-view]').forEach(button => button.classList.toggle('active', button.dataset.view === currentView));
}

function show(view) {
  currentView = view;
  closeMenu();
  setActiveNav();
  if (!sets.length) return;
  const renderers = { home: renderHome, study: renderStudy, flash: renderFlashcards, test: renderTest, board: renderBoard, creed: renderCreed, progress: renderProgress };
  renderers[view]?.();
  updateHeaderStatus();
  document.title = view === 'home' ? 'BoardQuiz | Army Study Companion' : `${view[0].toUpperCase() + view.slice(1)} | BoardQuiz`;
}

function renderMetric(label, value, note, tone = '') {
  return `<article class="metric"><span class="metric-label">${escapeHTML(label)}</span><strong class="${tone}">${escapeHTML(String(value))}</strong><small>${escapeHTML(note)}</small></article>`;
}

function renderTopicCard(set, index) {
  const cards = setCardStats(index);
  const quiz = quizStats(index);
  const completion = percent(cards.mastered, cards.total);
  const accuracy = quiz.correct + quiz.incorrect ? `${percent(quiz.correct, quiz.correct + quiz.incorrect)}% test accuracy` : 'No test recorded yet';
  return `<article class="topic-card"><div class="topic-card-top"><span class="topic-index">SECTION ${String(index + 1).padStart(2, '0')}</span><span class="tiny">${plural(cards.total, 'card')}</span></div><h3>${escapeHTML(decodeEntities(set.set))}</h3><p>${cards.mastered ? `${cards.mastered} mastered · ${cards.review} to review` : 'Start this section whenever you are ready.'}</p><div class="progress-track" aria-label="${completion}% flashcard mastery"><i style="width:${completion}%"></i></div><div class="topic-card-meta"><span>${completion}% mastered</span><span class="mini-score">${accuracy}</span></div><div class="topic-card-actions"><button class="button-secondary" type="button" data-action="open-study" data-set="${index}">Study</button><button class="button-primary" type="button" data-action="open-test" data-set="${index}">Test</button></div></article>`;
}

function renderHome(filter = '') {
  const stats = overallStats();
  const rank = getRank(stats.score);
  const lowerFilter = filter.toLowerCase();
  const visibleSets = sets.map((set, index) => ({ set, index })).filter(({ set }) => decodeEntities(set.set).toLowerCase().includes(lowerFilter));
  app.innerHTML = `<section class="hero"><div class="hero-copy"><p class="eyebrow">YOUR STUDY COMPANION</p><h1>Train with purpose. <br>Walk in prepared.</h1><p class="subtitle">Flashcards, guided review, section tests, and Board Drill questions built around your Army promotion board study sets.</p><div class="hero-actions"><button class="button-primary" type="button" data-action="resume-study">Resume studying</button><button class="button-secondary" type="button" data-view="creed">Practice the NCO Creed</button></div></div><aside class="rank-card"><span>Current rank</span><strong>${escapeHTML(rank.title)}</strong><div class="progress-track"><i style="width:${stats.score}%"></i></div><p>${stats.score}% overall readiness · ${escapeHTML(rank.next)}</p></aside></section><section class="metric-grid" aria-label="Study summary">${renderMetric('Flashcards mastered', stats.mastered, `of ${stats.totalCards} total cards`)}${renderMetric('Correct answers', stats.correct, `${stats.answered} test answers submitted`)}${renderMetric('Need review', stats.review, 'marked during flashcards', 'metric-warning')}${renderMetric('Overall readiness', `${stats.score}%`, rank.title, 'metric-gold')}</section><section><div class="section-heading"><div><p class="eyebrow">24 STUDY SECTIONS</p><h2>Choose your next mission</h2></div><input class="search" id="topicSearch" type="search" value="${escapeHTML(filter)}" placeholder="Search a topic" aria-label="Search study topics"></div><div class="topic-grid" id="topicGrid">${visibleSets.length ? visibleSets.map(({ set, index }) => renderTopicCard(set, index)).join('') : '<div class="empty-state">No section matches that search.</div>'}</div></section>`;
}

function renderSectionOverview(index = selectedSet) {
  const set = sets[index];
  const cards = setCardStats(index);
  const quiz = quizStats(index);
  return `<section class="overview-grid"><div class="panel overview-title"><span class="topic-index">SECTION ${String(index + 1).padStart(2, '0')}</span><h2>${escapeHTML(decodeEntities(set.set))}</h2><p class="muted">${plural(cards.total, 'flashcard')} in this section. Review the guide, practice recall, then take a scored test.</p><div class="section-stat-list"><div class="section-stat"><strong>${cards.mastered}/${cards.total}</strong><small>Mastered</small></div><div class="section-stat"><strong>${quiz.correct}</strong><small>Test correct</small></div><div class="section-stat wrong"><strong>${quiz.incorrect}</strong><small>Test incorrect</small></div></div></div><div class="topic-actions"><button class="button-secondary" type="button" data-action="open-flash" data-set="${index}"><strong>Flashcards</strong><small>Practice at your pace</small></button><button class="button-primary" type="button" data-action="open-test" data-set="${index}"><strong>Section test</strong><small>Start a scored round</small></button></div></section>`;
}

function renderStudy() {
  const set = sets[selectedSet];
  app.innerHTML = pageHeader('STUDY GUIDE', 'Understand the material first.', 'Open any prompt to review its answer, or jump straight into flashcard practice.') + sectionSelector() + renderSectionOverview() + `<section class="section-heading"><div><p class="eyebrow">REFERENCE NOTES</p><h2>Questions & answers</h2></div><button class="button-quiet" type="button" data-action="expand-notes">Open all</button></section><section class="study-list">${set.cards.map(card => `<details class="study-item"><summary><span>${escapeHTML(decodeEntities(card.question))}</span></summary><div class="study-item-answer">${textToHTML(card.answer)}</div></details>`).join('')}</section>`;
}

function renderFlashcards() {
  const set = sets[selectedSet];
  const card = set.cards[flashIndex];
  const stats = setCardStats(selectedSet);
  const status = progress.cards[cardKey(selectedSet, card.number)];
  app.innerHTML = pageHeader('FLASHCARD PRACTICE', decodeEntities(set.set), `${stats.mastered} of ${stats.total} cards marked mastered in this section.`) + `<div class="flashcard-wrap">${sectionSelector()}<div class="flash-topline"><span>Card <strong>${flashIndex + 1}</strong> of ${set.cards.length}</span><span>${status === 'mastered' || status === 'known' ? '✓ Marked mastered' : status === 'review' ? '↻ Marked for review' : 'Tap the card to reveal'}</span></div><div class="progress-track"><i style="width:${percent(flashIndex + 1, set.cards.length)}%"></i></div><article class="flashcard" role="button" tabindex="0" data-action="reveal-card" aria-label="${flashRevealed ? 'Answer visible. Click to hide it.' : 'Click to reveal the answer.'}"><span class="flashcard-label">${flashRevealed ? 'ANSWER' : 'PROMPT'}</span><div class="flashcard-question">${escapeHTML(decodeEntities(card.question))}</div>${flashRevealed ? `<div class="flashcard-answer">${textToHTML(card.answer)}</div>` : '<p class="flashcard-hint">Click or press Enter to reveal the answer</p>'}</article><div class="flash-actions"><button class="button-secondary" type="button" data-action="previous-card">← Previous</button><button class="button-secondary" type="button" data-action="mark-review">Review again</button><button class="button-primary" type="button" data-action="mark-mastered">I know this ✓</button><button class="button-secondary next-card" type="button" data-action="next-card">Next →</button></div></div>`;
}

function createQuiz() {
  quizSession = { cards: [...sets[selectedSet].cards].sort(() => Math.random() - 0.5), position: 0, correct: 0, incorrect: 0, answered: false, selectedAnswer: null };
}

function answerOptions(question) {
  const alternatives = sets[selectedSet].cards.filter(card => card.number !== question.number && decodeEntities(card.answer) !== decodeEntities(question.answer)).sort(() => Math.random() - 0.5).slice(0, 3);
  return [{ ...question, correct: true }, ...alternatives.map(card => ({ ...card, correct: false }))].sort(() => Math.random() - 0.5);
}

function renderTest() {
  const set = sets[selectedSet];
  const stats = quizStats(selectedSet);
  if (!quizSession) {
    app.innerHTML = pageHeader('SECTION TEST', decodeEntities(set.set), 'Your history is shown before every test. A new round uses every question in this section once.') + `<section class="quiz-intro panel"><div class="quiz-intro-banner">READY CHECK · ${set.cards.length} questions · immediate feedback</div><h2>Know where you stand before you begin.</h2><p class="muted">Every answer is added to this section’s running score. Retake the test as often as needed—your best single-round score is kept separately.</p><div class="score-overview"><div class="score-box"><strong>${stats.correct}</strong><small>Total correct</small></div><div class="score-box incorrect"><strong>${stats.incorrect}</strong><small>Total incorrect</small></div><div class="score-box"><strong>${stats.attempts ? `${stats.best}%` : '—'}</strong><small>Best round</small></div></div><ul class="quiz-rules"><li>Questions are shuffled each time.</li><li>Choose the best answer from four options.</li><li>See the correct answer after each choice.</li></ul><div class="toolbar"><button class="button-primary" type="button" data-action="start-test">Begin section test →</button><button class="button-secondary" type="button" data-action="open-flash" data-set="${selectedSet}">Review flashcards first</button></div></section>`;
    return;
  }
  if (quizSession.position >= quizSession.cards.length) return finishQuiz();
  const question = quizSession.cards[quizSession.position];
  const options = quizSession.options || (quizSession.options = answerOptions(question));
  const answered = quizSession.answered;
  app.innerHTML = pageHeader('SECTION TEST', decodeEntities(set.set), 'Choose the answer that best completes this prompt.') + `<section class="quiz-shell"><div class="quiz-progress"><span>QUESTION ${quizSession.position + 1} / ${quizSession.cards.length}</span><span>Correct ${quizSession.correct} · Incorrect ${quizSession.incorrect}</span></div><div class="progress-track"><i style="width:${percent(quizSession.position, quizSession.cards.length)}%"></i></div><article class="quiz-card"><div class="quiz-topic">${escapeHTML(decodeEntities(set.set))}</div><h2>${escapeHTML(decodeEntities(question.question))}</h2><div>${options.map((option, index) => { const chosen = quizSession.selectedAnswer === index; const correctClass = answered && option.correct ? ' correct answer-reveal' : ''; const incorrectClass = answered && chosen && !option.correct ? ' incorrect' : ''; return `<button type="button" class="answer-choice${correctClass}${incorrectClass}" data-action="answer-quiz" data-option="${index}" ${answered ? 'disabled' : ''}>${textToHTML(option.answer)}</button>`; }).join('')}</div>${answered ? `<div class="quiz-feedback"><p><strong class="${quizSession.lastCorrect ? '' : 'wrong-feedback'}">${quizSession.lastCorrect ? 'Correct.' : 'Incorrect.'}</strong> ${quizSession.lastCorrect ? 'Strong recall—keep the momentum.' : 'The highlighted option is the correct answer.'}</p><button type="button" class="button-primary" data-action="next-question">Next question →</button></div>` : ''}</article></section>`;
}

function finishQuiz() {
  const total = quizSession.cards.length;
  const roundScore = percent(quizSession.correct, total);
  const previous = quizStats(selectedSet);
  progress.quizzes[selectedSet] = { correct: previous.correct + quizSession.correct, incorrect: previous.incorrect + quizSession.incorrect, attempts: previous.attempts + 1, best: Math.max(previous.best, roundScore), last: roundScore, lastDate: new Date().toISOString() };
  saveProgress();
  const result = { ...quizSession, score: roundScore };
  quizSession = null;
  app.innerHTML = pageHeader('TEST COMPLETE', decodeEntities(sets[selectedSet].set), 'Your score has been added to this section and your overall readiness rank.') + `<section class="result-card"><p class="eyebrow">ROUND SCORE</p><div class="result-score">${result.score}%</div><p class="muted">${result.score >= 80 ? 'Excellent work. You are building board-ready recall.' : result.score >= 60 ? 'Solid foundation. Review missed material and try again.' : 'Keep training. Flashcards are the quickest way to strengthen recall.'}</p><div class="score-overview"><div class="score-box"><strong>${result.correct}</strong><small>Correct this round</small></div><div class="score-box incorrect"><strong>${result.incorrect}</strong><small>Incorrect this round</small></div><div class="score-box"><strong>${sets[selectedSet].cards.length}</strong><small>Questions answered</small></div></div><div class="toolbar"><button class="button-primary" type="button" data-action="restart-test">Take it again</button><button class="button-secondary" type="button" data-action="open-flash" data-set="${selectedSet}">Review flashcards</button></div></section>`;
}

function renderBoard() {
  if (!drillQuestion) drillQuestion = allCards()[Math.floor(Math.random() * allCards().length)];
  app.innerHTML = pageHeader('BOARD DRILL', 'Answer out loud. Then check yourself.', 'A random prompt across every study section—ideal for short, high-focus practice.') + `<section class="drill-card"><article class="panel"><p class="eyebrow">${escapeHTML(decodeEntities(drillQuestion.setName))}</p><h2>${escapeHTML(decodeEntities(drillQuestion.question))}</h2><div id="drillAnswer"><button class="button-primary" type="button" data-action="reveal-drill">Reveal answer</button></div></article></section>`;
}

function revealDrillAnswer() {
  document.querySelector('#drillAnswer').innerHTML = `<div class="drill-answer">${textToHTML(drillQuestion.answer)}</div><div class="drill-mark"><button class="button-secondary" type="button" data-action="next-drill">Another question</button><button class="button-primary" type="button" data-action="next-drill">Next drill →</button></div>`;
}

function formatCreed(text, mode) {
  if (mode === 'hide') { let count = 0; return escapeHTML(text).replace(/\b([A-Za-z][A-Za-z'’-]*)\b/g, (word, value) => (++count % 4 === 0 ? `<span class="hidden-word">${value}</span>` : value)); }
  if (mode === 'letters') return escapeHTML(text).replace(/\b([A-Za-z])[A-Za-z'’-]*/g, '<span class="letter-cue">$1.</span>');
  return escapeHTML(text);
}

function renderCreed() {
  const paragraphText = CREED[creedParagraph];
  const modes = [['read', 'Read'], ['hide', 'Hide words'], ['letters', 'First letters'], ['type', 'Type it']];
  const content = creedMode === 'type' ? `<div class="panel creed-typing"><h2>Type paragraph ${creedParagraph + 1} from memory</h2><p class="muted">Write what you remember, then check the order of your words against the original.</p><textarea id="creedInput" placeholder="Start reciting here…" aria-label="Type the NCO Creed from memory"></textarea><div class="toolbar"><button class="button-primary" type="button" data-action="check-creed">Check my recall</button></div><div id="creedResult"></div></div>` : `<article class="panel creed-text"><p>${formatCreed(paragraphText, creedMode).replace(/\n/g, '<br>')}</p></article>`;
  app.innerHTML = pageHeader('NCO CREED TRAINING', 'Read it. Recall it. Own it.', 'Use the different practice modes to move from recognition to recitation.') + `<div class="toolbar">${modes.map(([mode, label]) => `<button class="${creedMode === mode ? 'button-primary' : 'button-secondary'}" type="button" data-action="creed-mode" data-mode="${mode}">${label}</button>`).join('')}</div><section class="creed-layout"><div>${content}</div><aside class="creed-sidebar"><h3>Choose a paragraph</h3><p>Train one portion at a time. The source text follows the version supplied for this project.</p>${CREED.map((_, index) => `<button class="${creedParagraph === index ? 'button-primary' : 'button-secondary'}" type="button" data-action="creed-paragraph" data-paragraph="${index}">Paragraph ${index + 1}</button>`).join('')}</aside></section>`;
}

function checkCreed() {
  const typed = document.querySelector('#creedInput').value.toLowerCase().match(/[\w’'-]+/g) || [];
  const original = CREED[creedParagraph].toLowerCase().match(/[\w’'-]+/g) || [];
  const matches = typed.filter((word, index) => word === original[index]).length;
  const score = percent(matches, original.length);
  document.querySelector('#creedResult').innerHTML = `<div class="creed-result"><h3>${score}% word-order match</h3><p class="muted">${matches} of ${original.length} words matched in the same position. Use this as a practice cue, then compare with Read mode.</p><button type="button" class="button-secondary" data-action="show-creed-original">Show original paragraph</button></div>`;
}

function renderProgress() {
  const stats = overallStats();
  const rank = getRank(stats.score);
  const remaining = Math.max(0, rank.threshold - stats.score);
  app.innerHTML = pageHeader('PROGRESS RANK', 'Your readiness, at a glance.', 'Your rank combines flashcards mastered and demonstrated test accuracy. All results stay in this browser.') + `<section class="panel rank-panel"><div class="rank-emblem"><span>STUDY RANK</span><strong>${escapeHTML(rank.title)}</strong></div><div><h2>${stats.score}% overall readiness</h2><p>${stats.mastered} flashcards mastered, ${stats.correct} correct test answers, and ${stats.review} cards marked for review.</p><div class="progress-text"><span>${escapeHTML(rank.next)}</span><b>${remaining ? `${remaining}% to go` : 'Maximum rank reached'}</b></div><div class="progress-track"><i style="width:${stats.score}%"></i></div></div></section><section class="panel performance-table"><table><thead><tr><th>Section</th><th>Flashcards</th><th>Correct</th><th>Incorrect</th><th>Best test</th></tr></thead><tbody>${sets.map((set, index) => { const cards = setCardStats(index); const quiz = quizStats(index); return `<tr><td>${escapeHTML(decodeEntities(set.set))}</td><td class="table-mastered">${cards.mastered}/${cards.total}</td><td>${quiz.correct}</td><td class="table-incorrect">${quiz.incorrect}</td><td>${quiz.attempts ? `${quiz.best}%` : '—'}</td></tr>`; }).join('')}</tbody></table></section><div class="toolbar"><button class="button-secondary button-danger" type="button" data-action="reset-progress">Reset saved progress</button></div>`;
}

function setSelected(index, view) {
  selectedSet = Math.max(0, Math.min(sets.length - 1, Number(index)));
  flashIndex = 0;
  flashRevealed = false;
  quizSession = null;
  show(view);
}

document.addEventListener('change', event => { if (event.target.id === 'setSelect') setSelected(event.target.value, currentView); });
document.addEventListener('input', event => {
  if (event.target.id !== 'topicSearch') return;
  const value = event.target.value;
  renderHome(value);
  // Rendering the filtered cards replaces the input, so restore the typing position.
  const search = document.querySelector('#topicSearch');
  search?.focus();
  search?.setSelectionRange(value.length, value.length);
});
document.addEventListener('keydown', event => { if ((event.key === 'Enter' || event.key === ' ') && event.target.classList.contains('flashcard')) { event.preventDefault(); flashRevealed = !flashRevealed; renderFlashcards(); } });

document.addEventListener('click', event => {
  const element = event.target.closest('[data-action], [data-view]');
  if (!element) return;
  const { action, view, set, option, mode, paragraph } = element.dataset;
  if (view) { show(view); return; }
  if (action === 'open-study') return setSelected(set, 'study');
  if (action === 'open-test') return setSelected(set, 'test');
  if (action === 'open-flash') return setSelected(set, 'flash');
  if (action === 'resume-study') return show('flash');
  if (action === 'expand-notes') { document.querySelectorAll('.study-item').forEach(item => { item.open = true; }); return; }
  if (action === 'reveal-card') { flashRevealed = !flashRevealed; return renderFlashcards(); }
  if (action === 'previous-card') { flashIndex = Math.max(0, flashIndex - 1); flashRevealed = false; return renderFlashcards(); }
  if (action === 'next-card') { flashIndex = Math.min(sets[selectedSet].cards.length - 1, flashIndex + 1); flashRevealed = false; return renderFlashcards(); }
  if (action === 'mark-review' || action === 'mark-mastered') { const card = sets[selectedSet].cards[flashIndex]; progress.cards[cardKey(selectedSet, card.number)] = action === 'mark-mastered' ? 'mastered' : 'review'; saveProgress(); if (action === 'mark-mastered' && flashIndex < sets[selectedSet].cards.length - 1) flashIndex += 1; flashRevealed = false; return renderFlashcards(); }
  if (action === 'start-test' || action === 'restart-test') { createQuiz(); return renderTest(); }
  if (action === 'answer-quiz' && quizSession && !quizSession.answered) { const selectedOption = Number(option); const isCorrect = quizSession.options[selectedOption].correct; quizSession.answered = true; quizSession.selectedAnswer = selectedOption; quizSession.lastCorrect = isCorrect; if (isCorrect) quizSession.correct += 1; else quizSession.incorrect += 1; return renderTest(); }
  if (action === 'next-question' && quizSession?.answered) { quizSession.position += 1; quizSession.answered = false; quizSession.selectedAnswer = null; quizSession.options = null; return renderTest(); }
  if (action === 'reveal-drill') return revealDrillAnswer();
  if (action === 'next-drill') { drillQuestion = null; return renderBoard(); }
  if (action === 'creed-mode') { creedMode = mode; return renderCreed(); }
  if (action === 'creed-paragraph') { creedParagraph = Number(paragraph); return renderCreed(); }
  if (action === 'check-creed') return checkCreed();
  if (action === 'show-creed-original') { creedMode = 'read'; return renderCreed(); }
  if (action === 'reset-progress' && window.confirm('Reset all flashcard and test results stored in this browser?')) { progress = defaultProgress(); saveProgress(); renderProgress(); }
});

menuButton.addEventListener('click', () => { const opened = nav.classList.toggle('open'); menuButton.setAttribute('aria-expanded', String(opened)); });

fetch('quizlet_backup_24_sets.json').then(response => { if (!response.ok) throw new Error('Study data could not be loaded.'); return response.json(); }).then(data => { sets = data; show('home'); }).catch(() => { app.innerHTML = '<div class="empty-state"><h2>Study data could not be loaded</h2><p>Open BoardQuiz through GitHub Pages or a local web server so the study file can be read.</p></div>'; });
