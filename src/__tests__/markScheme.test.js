import { describe, it, expect } from 'vitest';
import { markResponse, scoreSession } from '../lib/markScheme.js';

describe('markResponse', () => {
  describe('mcq', () => {
    it('marks correct MCQ response', () => {
      expect(markResponse('mcq', 'b', 'b')).toEqual({ marked_correct: true, marks_awarded: 1 });
    });
    it('marks incorrect MCQ response', () => {
      expect(markResponse('mcq', 'a', 'b')).toEqual({ marked_correct: false, marks_awarded: 0 });
    });
    it('returns null for empty response', () => {
      expect(markResponse('mcq', '', 'b')).toEqual({ marked_correct: null, marks_awarded: null });
    });
    it('respects maxMarks', () => {
      expect(markResponse('mcq', 'b', 'b', 3)).toEqual({ marked_correct: true, marks_awarded: 3 });
    });
  });

  describe('true_false', () => {
    it('marks correct true/false', () => {
      expect(markResponse('true_false', 'true', 'true')).toEqual({ marked_correct: true, marks_awarded: 1 });
    });
    it('marks incorrect true/false', () => {
      expect(markResponse('true_false', 'false', 'true')).toEqual({ marked_correct: false, marks_awarded: 0 });
    });
  });

  describe('fill_blank', () => {
    it('matches with different casing', () => {
      expect(markResponse('fill_blank', 'Mango', 'mango')).toEqual({ marked_correct: true, marks_awarded: 1 });
    });
    it('matches with leading/trailing whitespace', () => {
      expect(markResponse('fill_blank', '  mango  ', 'mango')).toEqual({ marked_correct: true, marks_awarded: 1 });
    });
    it('marks wrong answer', () => {
      expect(markResponse('fill_blank', 'banana', 'mango')).toEqual({ marked_correct: false, marks_awarded: 0 });
    });
  });

  describe('drag_order', () => {
    it('marks correct order', () => {
      expect(markResponse('drag_order', ['a', 'b', 'c'], ['a', 'b', 'c'])).toEqual({ marked_correct: true, marks_awarded: 1 });
    });
    it('marks wrong order', () => {
      expect(markResponse('drag_order', ['b', 'a', 'c'], ['a', 'b', 'c'])).toEqual({ marked_correct: false, marks_awarded: 0 });
    });
    it('handles different length arrays', () => {
      expect(markResponse('drag_order', ['a', 'b'], ['a', 'b', 'c'])).toEqual({ marked_correct: false, marks_awarded: 0 });
    });
  });

  describe('image_label', () => {
    it('marks fully correct labels', () => {
      expect(markResponse('image_label', { r1: 'l1', r2: 'l2' }, { r1: 'l1', r2: 'l2' })).toEqual({ marked_correct: true, marks_awarded: 1 });
    });
    it('marks partially wrong labels', () => {
      expect(markResponse('image_label', { r1: 'l1', r2: 'l3' }, { r1: 'l1', r2: 'l2' })).toEqual({ marked_correct: false, marks_awarded: 0 });
    });
  });

  describe('short_answer', () => {
    it('returns null (not auto-marked)', () => {
      expect(markResponse('short_answer', 'Some answer', 'Any answer')).toEqual({ marked_correct: null, marks_awarded: null });
    });
  });

  describe('unknown type', () => {
    it('returns null', () => {
      expect(markResponse('drawing', 'anything', 'anything')).toEqual({ marked_correct: null, marks_awarded: null });
    });
  });
});

describe('scoreSession', () => {
  it('sums marks for auto-marked questions', () => {
    const questions = [
      { id: 'q1', type: 'mcq', correct_answer: 'a', marks: 1 },
      { id: 'q2', type: 'mcq', correct_answer: 'b', marks: 2 },
      { id: 'q3', type: 'fill_blank', correct_answer: 'mango', marks: 1 },
    ];
    const responses = { q1: 'a', q2: 'c', q3: 'Mango' };
    const result = scoreSession(questions, responses);
    expect(result.total).toBe(2); // q1 (1) + q3 (1), q2 wrong
    expect(result.possible).toBe(4); // 1+2+1
    expect(result.byQuestion.q1.marked_correct).toBe(true);
    expect(result.byQuestion.q2.marked_correct).toBe(false);
    expect(result.byQuestion.q3.marked_correct).toBe(true);
  });

  it('excludes short_answer from possible marks', () => {
    const questions = [
      { id: 'q1', type: 'mcq', correct_answer: 'a', marks: 1 },
      { id: 'q2', type: 'short_answer', correct_answer: null, marks: 2 },
    ];
    const responses = { q1: 'a' };
    const result = scoreSession(questions, responses);
    expect(result.possible).toBe(1); // short_answer excluded
    expect(result.total).toBe(1);
  });
});
