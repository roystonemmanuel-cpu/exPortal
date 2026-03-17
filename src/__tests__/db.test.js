import { describe, it, expect, beforeEach } from 'vitest';
import db, {
  writeResponse, getResponseMap, getUnsyncedResponses, markSynced,
  toggleFlag, getFlaggedQuestions,
} from '../lib/db.js';

beforeEach(async () => {
  await db.responses.clear();
  await db.flags.clear();
});

describe('writeResponse', () => {
  it('creates a new response', async () => {
    await writeResponse('session1', 'q1', 'a');
    const all = await db.responses.toArray();
    expect(all).toHaveLength(1);
    expect(all[0].responseValue).toBe('a');
    expect(all[0].synced).toBe(0);
  });

  it('updates existing response without creating duplicate', async () => {
    await writeResponse('session1', 'q1', 'a');
    await writeResponse('session1', 'q1', 'b');
    const all = await db.responses.toArray();
    expect(all).toHaveLength(1);
    expect(all[0].responseValue).toBe('b');
  });

  it('creates separate responses for different questions', async () => {
    await writeResponse('session1', 'q1', 'a');
    await writeResponse('session1', 'q2', 'b');
    const all = await db.responses.toArray();
    expect(all).toHaveLength(2);
  });
});

describe('getResponseMap', () => {
  it('returns a map of questionId to value', async () => {
    await writeResponse('session1', 'q1', 'a');
    await writeResponse('session1', 'q2', 'true');
    const map = await getResponseMap('session1');
    expect(map).toEqual({ q1: 'a', q2: 'true' });
  });

  it('only returns responses for the given session', async () => {
    await writeResponse('session1', 'q1', 'a');
    await writeResponse('session2', 'q1', 'b');
    const map = await getResponseMap('session1');
    expect(Object.keys(map)).toHaveLength(1);
    expect(map.q1).toBe('a');
  });
});

describe('getUnsyncedResponses + markSynced', () => {
  it('marks responses as synced', async () => {
    await writeResponse('s1', 'q1', 'a');
    await writeResponse('s1', 'q2', 'b');
    const unsynced = await getUnsyncedResponses();
    expect(unsynced).toHaveLength(2);
    await markSynced(unsynced.map(r => r.id));
    const stillUnsynced = await getUnsyncedResponses();
    expect(stillUnsynced).toHaveLength(0);
  });
});

describe('toggleFlag', () => {
  it('adds a flag on first toggle', async () => {
    const result = await toggleFlag('s1', 'q1');
    expect(result).toBe(true);
    const flagged = await getFlaggedQuestions('s1');
    expect(flagged).toContain('q1');
  });

  it('removes flag on second toggle', async () => {
    await toggleFlag('s1', 'q1');
    const result = await toggleFlag('s1', 'q1');
    expect(result).toBe(false);
    const flagged = await getFlaggedQuestions('s1');
    expect(flagged).not.toContain('q1');
  });

  it('only returns flags for the given session', async () => {
    await toggleFlag('s1', 'q1');
    await toggleFlag('s2', 'q2');
    const flagged = await getFlaggedQuestions('s1');
    expect(flagged).toEqual(['q1']);
  });
});
