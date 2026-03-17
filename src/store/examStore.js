import { create } from 'zustand';
import { writeResponse, toggleFlag, getFlaggedQuestions, getResponseMap } from '../lib/db.js';

/**
 * @typedef {Object} ExamStore
 * @property {Object|null} exam - Current exam package
 * @property {Object[]} questions - Flat list of questions for current sitting
 * @property {number} currentIndex - Zero-based index of the active question
 * @property {Record<string,*>} responses - questionId → responseValue (local mirror of IndexedDB)
 * @property {Set<string>} flaggedIds - Set of flagged questionIds
 * @property {'idle'|'active'|'review'|'submitted'} phase
 */

const useExamStore = create((set, get) => ({
  exam: null,
  questions: [],
  currentIndex: 0,
  responses: {},
  flaggedIds: new Set(),
  phase: 'idle',

  /** Load exam package into store and hydrate responses + flags from IndexedDB. */
  loadExam: async (examPackage, sessionId) => {
    const questions = buildQuestionList(examPackage);
    const [responseMap, flaggedArray] = await Promise.all([
      getResponseMap(sessionId),
      getFlaggedQuestions(sessionId),
    ]);

    set({
      exam: examPackage,
      questions,
      currentIndex: 0,
      responses: responseMap,
      flaggedIds: new Set(flaggedArray),
      phase: 'active',
    });
  },

  /** Navigate to a specific question index. */
  goTo: (index) => {
    const { questions } = get();
    if (index >= 0 && index < questions.length) {
      set({ currentIndex: index });
    }
  },

  goNext: () => {
    const { currentIndex, questions } = get();
    if (currentIndex < questions.length - 1) set({ currentIndex: currentIndex + 1 });
  },

  goPrev: () => {
    const { currentIndex } = get();
    if (currentIndex > 0) set({ currentIndex: currentIndex - 1 });
  },

  /**
   * Record a response. Writes to IndexedDB immediately; updates store state.
   * @param {string} sessionId
   * @param {string} questionId
   * @param {*} value
   */
  recordResponse: async (sessionId, questionId, value) => {
    await writeResponse(sessionId, questionId, value);
    set(state => ({
      responses: { ...state.responses, [questionId]: value },
    }));
  },

  /**
   * Toggle a flag for a question.
   * @param {string} sessionId
   * @param {string} questionId
   */
  toggleFlag: async (sessionId, questionId) => {
    const isFlagged = await toggleFlag(sessionId, questionId);
    set(state => {
      const next = new Set(state.flaggedIds);
      if (isFlagged) next.add(questionId);
      else next.delete(questionId);
      return { flaggedIds: next };
    });
  },

  setPhase: (phase) => set({ phase }),

  reset: () => set({
    exam: null,
    questions: [],
    currentIndex: 0,
    responses: {},
    flaggedIds: new Set(),
    phase: 'idle',
  }),
}));

/**
 * Flatten exam questions (including stimulus children) into a single ordered list.
 * @param {Object} examPackage
 * @returns {Object[]}
 */
function buildQuestionList(examPackage) {
  const questions = [];
  for (const item of examPackage.exam_questions ?? []) {
    const q = item.question;
    if (!q) continue;

    if (q.stimulus) {
      // Stimulus block: emit each child question, carrying stimulus reference
      for (const child of q.stimulus.stimulus_questions ?? []) {
        questions.push({ ...child.question, stimulus: q.stimulus, _stimulusRoot: true });
      }
    } else {
      questions.push(q);
    }
  }
  return questions;
}

export { useExamStore };
