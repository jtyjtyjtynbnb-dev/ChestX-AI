import { computed } from 'vue';
import { DISEASE_KNOWLEDGE_LIST, ANATOMY_HOTSPOTS, ACADEMY_SIGNS, NINE_STEPS_GUIDE, ACADEMY_QUIZ_LIST } from '../stores/referenceData.js';
import { getRiskStyle } from '../utils/format.js';
export function useAcademy({ AppState }) {
  AppState.academy ||= { tab: 'basics', hotspots: {} }; AppState.quizAnswered ||= {}; const state = AppState.academy;
  const currentSpot = computed(() => ANATOMY_HOTSPOTS.find((spot) => spot.id === AppState.selectedAnatomySpotId) || ANATOMY_HOTSPOTS[0]);
  const academySigns = computed(() => DISEASE_KNOWLEDGE_LIST.map((disease) => { const sign = ACADEMY_SIGNS.find((item) => item.code === disease.code); return { disease, title: sign?.title || disease.name, tag: sign?.tag || `${disease.shortName}影像表现`, risk: disease.severity, desc: sign?.desc || disease.xrayFeature, clinical: sign?.clinical || disease.overview }; }));
  const score = computed(() => ACADEMY_QUIZ_LIST.filter((q) => AppState.quizAnswered[q.id] === q.answerIndex).length);
  const quizChosen = (id) => AppState.quizAnswered[id];
  return { state, currentSpot, anatomyHotspots: ANATOMY_HOTSPOTS, academySigns, nineSteps: NINE_STEPS_GUIDE, quizzes: ACADEMY_QUIZ_LIST, score, quizChosen, getRiskStyle, switchAcademyTab: (tab) => { state.tab = tab; }, selectSpot: (id) => { AppState.selectedAnatomySpotId = Number(id); }, selectSignHotspot: (code, index) => { state.hotspots[code] = Number(index); }, answerQuiz: (id, index) => { AppState.quizAnswered[id] = Number(index); }, renderAcademyPage() {}, renderAcademyQuiz() {}, mount() {} };
}
