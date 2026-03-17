/**
 * Auto-marking engine for tier-1 and tier-2 question types.
 * Short answer (tier 3) is NOT auto-marked here — it goes to the marking queue.
 */

/**
 * Normalise a string response for fill-in-the-blank comparison.
 * - Lowercase
 * - Trim whitespace
 * - Collapse multiple spaces
 * - Remove leading/trailing punctuation
 * @param {string} value
 * @returns {string}
 */
function normalise(value) {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^[^\w]+|[^\w]+$/g, '');
}

/**
 * Mark a single response.
 * @param {'mcq'|'true_false'|'fill_blank'|'drag_order'|'image_label'|'audio'|'short_answer'} type
 * @param {*} response - Student's response value
 * @param {*} correctAnswer - The correct answer from the question record
 * @param {number} [maxMarks=1] - Maximum marks available
 * @returns {{ marked_correct: boolean|null, marks_awarded: number|null }}
 */
export function markResponse(type, response, correctAnswer, maxMarks = 1) {
  if (response === null || response === undefined || response === '') {
    return { marked_correct: null, marks_awarded: null };
  }

  switch (type) {
    case 'mcq':
    case 'true_false':
    case 'audio': {
      const correct = String(response) === String(correctAnswer);
      return { marked_correct: correct, marks_awarded: correct ? maxMarks : 0 };
    }

    case 'fill_blank': {
      const correct = normalise(response) === normalise(correctAnswer);
      return { marked_correct: correct, marks_awarded: correct ? maxMarks : 0 };
    }

    case 'drag_order': {
      // correctAnswer is an array of ids in the correct order
      if (!Array.isArray(response) || !Array.isArray(correctAnswer)) {
        return { marked_correct: false, marks_awarded: 0 };
      }
      const correct = response.length === correctAnswer.length &&
        response.every((v, i) => String(v) === String(correctAnswer[i]));
      return { marked_correct: correct, marks_awarded: correct ? maxMarks : 0 };
    }

    case 'image_label': {
      // correctAnswer is a Record<regionId, labelId>
      // response is the same structure
      if (typeof response !== 'object' || typeof correctAnswer !== 'object') {
        return { marked_correct: false, marks_awarded: 0 };
      }
      const keys = Object.keys(correctAnswer);
      const correct = keys.every(k => String(response[k]) === String(correctAnswer[k]));
      return { marked_correct: correct, marks_awarded: correct ? maxMarks : 0 };
    }

    case 'short_answer':
      // Not auto-marked
      return { marked_correct: null, marks_awarded: null };

    default:
      return { marked_correct: null, marks_awarded: null };
  }
}

/**
 * Score an entire session's responses against an exam's mark scheme.
 * @param {Array<{id:string, type:string, correct_answer:*, marks:number}>} questions
 * @param {Record<string,*>} responseMap - questionId → responseValue
 * @returns {{ total: number, possible: number, byQuestion: Record<string,{marked_correct:boolean|null,marks_awarded:number|null}> }}
 */
export function scoreSession(questions, responseMap) {
  let total = 0;
  let possible = 0;
  const byQuestion = {};

  for (const q of questions) {
    const response = responseMap[q.id];
    const result = markResponse(q.type, response, q.correct_answer, q.marks ?? 1);
    byQuestion[q.id] = result;
    if (result.marks_awarded !== null) total += result.marks_awarded;
    if (q.type !== 'short_answer') possible += q.marks ?? 1;
  }

  return { total, possible, byQuestion };
}
