import { MCQQuestion } from './MCQQuestion.jsx';
import { TrueFalseQuestion } from './TrueFalseQuestion.jsx';
import { FillBlankQuestion } from './FillBlankQuestion.jsx';
import { ShortAnswerQuestion } from './ShortAnswerQuestion.jsx';
import { AudioQuestion } from './AudioQuestion.jsx';
import { DragOrderQuestion } from './DragOrderQuestion.jsx';
import { ImageLabelQuestion } from './ImageLabelQuestion.jsx';

/**
 * Delegates to the correct question component based on question.type.
 * All question components share the same prop interface:
 *   { question, selectedValue, onSelect }
 */
export function QuestionRenderer({ question, selectedValue, onSelect }) {
  const props = { question, selectedValue, onSelect };

  switch (question.type) {
    case 'mcq':        return <MCQQuestion {...props} />;
    case 'true_false': return <TrueFalseQuestion {...props} />;
    case 'fill_blank': return <FillBlankQuestion {...props} />;
    case 'short_answer': return <ShortAnswerQuestion {...props} />;
    case 'audio':      return <AudioQuestion {...props} />;
    case 'drag_order': return <DragOrderQuestion {...props} />;
    case 'image_label': return <ImageLabelQuestion {...props} />;
    default:
      return (
        <p className="text-oecs-neutral-400 text-sm">
          Unsupported question type: {question.type}
        </p>
      );
  }
}
