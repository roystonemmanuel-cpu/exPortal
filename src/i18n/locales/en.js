/** @type {Record<string,string|Object>} */
const en = {
  // ── App-wide ──────────────────────────────────────────────────────────────
  app: {
    name: 'OECS Examination Portal',
    offline: 'You are offline. Your answers are saved.',
    online: 'Back online. Syncing your answers.',
  },

  // ── Student PIN login ──────────────────────────────────────────────────────
  pin: {
    title: 'Welcome!',
    subtitle: 'Enter your student number to begin.',
    label: 'Student Number',
    placeholder: '· · · · · ·',
    submit: 'Start Exam',
    error_invalid: 'That number did not match. Please try again.',
    error_empty: 'Please enter your student number.',
    session_code_label: 'Session Code',
    session_code_hint: 'Your teacher will give you this code.',
  },

  // ── Exam delivery ─────────────────────────────────────────────────────────
  exam: {
    question_of: 'Question {{current}} of {{total}}',
    flag: 'Flag for review',
    unflag: 'Remove flag',
    next: 'Next',
    prev: 'Previous',
    review: 'Review answers',
    submit: 'Submit',
    submit_confirm: 'Are you sure you want to submit? You cannot change your answers after this.',
    submit_confirm_yes: 'Yes, submit',
    submit_confirm_no: 'Go back',
    unanswered_warning: 'You have {{count}} unanswered question.',
    unanswered_warning_plural: 'You have {{count}} unanswered questions.',
    submitted_title: 'Well done!',
    submitted_body: 'Your answers have been saved. Your teacher will collect the tablet now.',
    audio_play: 'Play',
    audio_replay: 'Replay',
    audio_playing: 'Playing…',
    type_true: 'True',
    type_false: 'False',
    drag_hint: 'Drag the items into the correct order.',
    label_hint: 'Tap a label then tap where it belongs.',
    short_answer_hint: 'Write your answer below.',
    short_answer_max: '(maximum {{max}} words)',
  },

  // ── Progress dots ─────────────────────────────────────────────────────────
  progress: {
    answered: 'Answered',
    current: 'Current question',
    flagged: 'Flagged for review',
    unanswered: 'Not yet answered',
  },

  // ── Invigilator ───────────────────────────────────────────────────────────
  invigilator: {
    title: 'Invigilator Dashboard',
    session_code: 'Session Code',
    students_seated: '{{count}} seated',
    students_submitted: '{{count}} submitted',
    pause: 'Pause all',
    resume: 'Resume all',
    extend: 'Extend time',
    collect: 'Collect tablets',
    incident: 'Log incident',
    incident_saved: 'Incident logged.',
    status_active: 'Active',
    status_paused: 'Paused',
    status_submitted: 'Submitted',
  },

  // ── Admin ─────────────────────────────────────────────────────────────────
  admin: {
    title: 'Admin Dashboard',
    item_bank: 'Item Bank',
    exam_builder: 'Exam Builder',
    scheduler: 'Scheduler',
    analytics: 'Analytics',
    results: 'Results',
    marking_queue: 'Marking Queue',
    new_question: 'New Question',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    publish: 'Publish',
    archived: 'Archived',
    grade: 'Grade',
    subject: 'Subject',
    type: 'Question type',
    search_placeholder: 'Search questions…',
  },

  // ── Common ────────────────────────────────────────────────────────────────
  common: {
    loading: 'Loading…',
    error: 'Something went wrong.',
    retry: 'Try again',
    back: 'Back',
    close: 'Close',
    yes: 'Yes',
    no: 'No',
    sign_out: 'Sign out',
  },
};

export default en;
