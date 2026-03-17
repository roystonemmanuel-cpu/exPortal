import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';

// Mock Dexie helpers since examStore calls them
vi.mock('../lib/db.js', () => ({
  writeResponse: vi.fn().mockResolvedValue(undefined),
  toggleFlag: vi.fn().mockResolvedValue(true),
  getFlaggedQuestions: vi.fn().mockResolvedValue([]),
  getResponseMap: vi.fn().mockResolvedValue({}),
}));

// Import after mocking
const { useExamStore } = await import('../store/examStore.js');

const mockExam = {
  id: 'exam1',
  exam_questions: [
    { order: 1, question: { id: 'q1', type: 'mcq', stem_text: 'What colour is the sky?', choices: [{ id: 'a', text: 'Blue' }], correct_answer: 'a' } },
    { order: 2, question: { id: 'q2', type: 'true_false', stem_text: 'Mango is a fruit.', correct_answer: 'true' } },
    { order: 3, question: { id: 'q3', type: 'fill_blank', stem_text: 'The capital of Saint Lucia is ___.', correct_answer: 'Castries' } },
  ],
};

describe('examStore navigation', () => {
  beforeEach(async () => {
    useExamStore.getState().reset();
    await useExamStore.getState().loadExam(mockExam, 'session1');
  });

  it('starts at question 0', () => {
    expect(useExamStore.getState().currentIndex).toBe(0);
  });

  it('goNext advances index', () => {
    useExamStore.getState().goNext();
    expect(useExamStore.getState().currentIndex).toBe(1);
  });

  it('goPrev does not go below 0', () => {
    useExamStore.getState().goPrev();
    expect(useExamStore.getState().currentIndex).toBe(0);
  });

  it('goTo sets exact index', () => {
    useExamStore.getState().goTo(2);
    expect(useExamStore.getState().currentIndex).toBe(2);
  });

  it('goTo ignores out-of-bounds index', () => {
    useExamStore.getState().goTo(99);
    expect(useExamStore.getState().currentIndex).toBe(0); // unchanged
  });

  it('goNext stops at last question', () => {
    useExamStore.getState().goTo(2);
    useExamStore.getState().goNext();
    expect(useExamStore.getState().currentIndex).toBe(2);
  });

  it('loads correct number of questions', () => {
    expect(useExamStore.getState().questions).toHaveLength(3);
  });
});

describe('examStore recordResponse', () => {
  beforeEach(async () => {
    useExamStore.getState().reset();
    await useExamStore.getState().loadExam(mockExam, 'session1');
  });

  it('stores response in state', async () => {
    await useExamStore.getState().recordResponse('session1', 'q1', 'a');
    expect(useExamStore.getState().responses['q1']).toBe('a');
  });

  it('overwrites previous response', async () => {
    await useExamStore.getState().recordResponse('session1', 'q1', 'a');
    await useExamStore.getState().recordResponse('session1', 'q1', 'b');
    expect(useExamStore.getState().responses['q1']).toBe('b');
  });
});

describe('examStore flags', () => {
  it('adds flag to flaggedIds', async () => {
    const { toggleFlag } = await import('../lib/db.js');
    toggleFlag.mockResolvedValue(true);
    useExamStore.getState().reset();
    await useExamStore.getState().loadExam(mockExam, 'session1');
    await useExamStore.getState().toggleFlag('session1', 'q1');
    expect(useExamStore.getState().flaggedIds.has('q1')).toBe(true);
  });

  it('removes flag on second toggle', async () => {
    const { toggleFlag } = await import('../lib/db.js');
    toggleFlag.mockResolvedValue(false);
    useExamStore.getState().reset();
    await useExamStore.getState().loadExam(mockExam, 'session1');
    // Manually set flaggedIds to simulate flag already existing
    useExamStore.setState({ flaggedIds: new Set(['q1']) });
    await useExamStore.getState().toggleFlag('session1', 'q1');
    expect(useExamStore.getState().flaggedIds.has('q1')).toBe(false);
  });
});
