import Dexie from 'dexie';

/**
 * @typedef {Object} ExamPackage
 * @property {string} id
 * @property {string} sessionId
 * @property {number} downloadedAt
 * @property {Object} exam - Full exam object with questions and assets
 */

/**
 * @typedef {Object} Response
 * @property {number} [id] - Auto-incremented primary key
 * @property {string} sessionId
 * @property {string} questionId
 * @property {*} responseValue
 * @property {number} updatedAt
 * @property {0|1} synced - 0=unsynced, 1=synced (booleans are not valid IDB key types)
 */

/**
 * @typedef {Object} Session
 * @property {string} id
 * @property {string} studentPin
 * @property {string} schoolId
 * @property {'active'|'paused'|'submitted'|'expired'} status
 */

/**
 * @typedef {Object} Flag
 * @property {number} [id] - Auto-incremented primary key
 * @property {string} sessionId
 * @property {string} questionId
 */

const db = new Dexie('OECSExamPortal');

db.version(1).stores({
  examPackages: 'id, sessionId, downloadedAt',
  responses: '++id, sessionId, questionId, updatedAt, synced',
  sessions: 'id, studentPin, schoolId, status',
  flags: '++id, sessionId, questionId',
});

// ─── Helper functions ────────────────────────────────────────────────────────

/**
 * Write a response for a question. Creates or updates (upsert by sessionId+questionId).
 * @param {string} sessionId
 * @param {string} questionId
 * @param {*} responseValue
 */
export async function writeResponse(sessionId, questionId, responseValue) {
  const existing = await db.responses
    .where({ sessionId, questionId })
    .first();

  if (existing) {
    await db.responses.update(existing.id, {
      responseValue,
      updatedAt: Date.now(),
      synced: 0,
    });
  } else {
    await db.responses.add({
      sessionId,
      questionId,
      responseValue,
      updatedAt: Date.now(),
      synced: 0,
    });
  }
}

/**
 * Get all responses for a session, keyed by questionId.
 * @param {string} sessionId
 * @returns {Promise<Record<string,*>>}
 */
export async function getResponseMap(sessionId) {
  const rows = await db.responses.where({ sessionId }).toArray();
  return Object.fromEntries(rows.map(r => [r.questionId, r.responseValue]));
}

/**
 * Get all unsynced responses.
 * @returns {Promise<Response[]>}
 */
export async function getUnsyncedResponses() {
  return db.responses.where({ synced: 0 }).toArray();
}

/**
 * Mark a list of response ids as synced.
 * @param {number[]} ids
 */
export async function markSynced(ids) {
  await db.transaction('rw', db.responses, async () => {
    for (const id of ids) {
      await db.responses.update(id, { synced: 1 });
    }
  });
}

/**
 * Toggle a flag for a question. Adds if absent, removes if present.
 * @param {string} sessionId
 * @param {string} questionId
 * @returns {Promise<boolean>} true if now flagged, false if unflagged
 */
export async function toggleFlag(sessionId, questionId) {
  const existing = await db.flags.where({ sessionId, questionId }).first();
  if (existing) {
    await db.flags.delete(existing.id);
    return false;
  } else {
    await db.flags.add({ sessionId, questionId });
    return true;
  }
}

/**
 * Get all flagged questionIds for a session.
 * @param {string} sessionId
 * @returns {Promise<string[]>}
 */
export async function getFlaggedQuestions(sessionId) {
  const rows = await db.flags.where({ sessionId }).toArray();
  return rows.map(r => r.questionId);
}

/**
 * Save a full exam package to IndexedDB.
 * @param {string} sessionId
 * @param {Object} examData
 */
export async function saveExamPackage(sessionId, examData) {
  await db.examPackages.put({
    id: examData.id,
    sessionId,
    downloadedAt: Date.now(),
    exam: examData,
  });
}

/**
 * Load an exam package from IndexedDB.
 * @param {string} sessionId
 * @returns {Promise<ExamPackage|null>}
 */
export async function loadExamPackage(sessionId) {
  return db.examPackages.where({ sessionId }).first() ?? null;
}

/**
 * Save session record locally.
 * @param {Session} session
 */
export async function saveSession(session) {
  await db.sessions.put(session);
}

/**
 * Load a session by id.
 * @param {string} id
 * @returns {Promise<Session|null>}
 */
export async function loadSession(id) {
  return db.sessions.get(id) ?? null;
}

export default db;
