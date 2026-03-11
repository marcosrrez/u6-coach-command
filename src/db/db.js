import Dexie from 'dexie';

// ─── Database Definition ──────────────────────────────────────────────────────
export const db = new Dexie('U6CoachDB');

db.version(1).stores({
  players: '++id, name, createdAt',
  sessionCompletions: '++id, sessionId, completedAt, type',
  playerNotes: '++id, sessionId, playerId, createdAt',
  developmentScores: '++id, sessionId, playerId, createdAt',
  phaseChecks: '++id, sessionId, phaseIndex, checkedAt',
  settings: 'key',
});

db.version(2).stores({
  players: '++id, name, createdAt',
  sessionCompletions: '++id, sessionId, completedAt, type',
  playerNotes: '++id, sessionId, playerId, createdAt',
  developmentScores: '++id, sessionId, playerId, createdAt',
  phaseChecks: '++id, sessionId, phaseIndex, checkedAt',
  settings: 'key',
  sessionCustomizations: 'sessionId',
});

db.version(3).stores({
  players: '++id, name, createdAt',
  sessionCompletions: '++id, sessionId, completedAt, type',
  playerNotes: '++id, sessionId, playerId, createdAt',
  developmentScores: '++id, sessionId, playerId, createdAt',
  phaseChecks: '++id, sessionId, phaseIndex, checkedAt',
  settings: 'key',
  sessionCustomizations: 'sessionId',
  // AI-created custom drills
  customDrills: '++id, name, category, framework, createdAt',
});

db.version(4).stores({
  players: '++id, name, createdAt',
  sessionCompletions: '++id, sessionId, completedAt, type',
  playerNotes: '++id, sessionId, playerId, createdAt',
  developmentScores: '++id, sessionId, playerId, createdAt',
  phaseChecks: '++id, sessionId, phaseIndex, checkedAt',
  settings: 'key',
  sessionCustomizations: 'sessionId',
  customDrills: '++id, name, category, framework, createdAt',
  // Activity-level checks within phases
  activityChecks: '++id, sessionId, phaseIndex, activityIndex, checkedAt',
});

// ─── Default Players ───────────────────────────────────────────────────────────
export const DEFAULT_PLAYERS = [
  { name: 'Player 1', emoji: '⚽', color: '#16a34a', position: 'Field', jerseyNumber: 1 },
  { name: 'Player 2', emoji: '🌟', color: '#2563eb', position: 'Field', jerseyNumber: 2 },
  { name: 'Player 3', emoji: '🦁', color: '#dc2626', position: 'Field', jerseyNumber: 3 },
  { name: 'Player 4', emoji: '⚡', color: '#d97706', position: 'Field', jerseyNumber: 4 },
  { name: 'Player 5', emoji: '🎯', color: '#7c3aed', position: 'Field', jerseyNumber: 5 },
];

// ─── Seed Function ─────────────────────────────────────────────────────────────
export async function seedDatabase() {
  const count = await db.players.count();
  if (count === 0) {
    await db.players.bulkAdd(
      DEFAULT_PLAYERS.map((p) => ({ ...p, createdAt: new Date().toISOString() }))
    );
  }
}

// ─── Player Operations ─────────────────────────────────────────────────────────
export async function getPlayers() {
  return db.players.orderBy('jerseyNumber').toArray();
}

export async function updatePlayer(id, updates) {
  return db.players.update(id, updates);
}

export async function addPlayer({ name, emoji, color, position, jerseyNumber }) {
  const players = await db.players.toArray();
  const maxJersey = players.length > 0 ? Math.max(...players.map(p => p.jerseyNumber || 0)) : 0;
  return db.players.add({
    name: name || `Player ${players.length + 1}`,
    emoji: emoji || '⚽',
    color: color || '#16a34a',
    position: position || 'Field',
    jerseyNumber: jerseyNumber || maxJersey + 1,
    createdAt: new Date().toISOString(),
  });
}

export async function deletePlayer(id) {
  await db.transaction('rw', [db.players, db.playerNotes, db.developmentScores], async () => {
    await db.players.delete(id);
    await db.playerNotes.where('playerId').equals(id).delete();
    await db.developmentScores.where('playerId').equals(id).delete();
  });
}

// ─── Session Completion Operations ────────────────────────────────────────────
export async function markSessionComplete(sessionId, type = 'practice') {
  const existing = await db.sessionCompletions
    .where('sessionId')
    .equals(sessionId)
    .first();
  if (existing) return existing.id;
  return db.sessionCompletions.add({
    sessionId,
    type,
    completedAt: new Date().toISOString(),
  });
}

export async function unmarkSessionComplete(sessionId) {
  return db.sessionCompletions.where('sessionId').equals(sessionId).delete();
}

export async function getCompletedSessionIds() {
  const all = await db.sessionCompletions.toArray();
  return new Set(all.map((c) => c.sessionId));
}

export async function isSessionComplete(sessionId) {
  const count = await db.sessionCompletions
    .where('sessionId')
    .equals(sessionId)
    .count();
  return count > 0;
}

// ─── Phase Check Operations ───────────────────────────────────────────────────
export async function checkPhase(sessionId, phaseIndex) {
  const existing = await db.phaseChecks
    .where('[sessionId+phaseIndex]')
    .equals([sessionId, phaseIndex])
    .first();
  if (!existing) {
    await db.phaseChecks.add({
      sessionId,
      phaseIndex,
      checkedAt: new Date().toISOString(),
    });
  }
}

export async function uncheckPhase(sessionId, phaseIndex) {
  await db.phaseChecks
    .where('sessionId')
    .equals(sessionId)
    .and((p) => p.phaseIndex === phaseIndex)
    .delete();
}

export async function getCheckedPhases(sessionId) {
  const checks = await db.phaseChecks
    .where('sessionId')
    .equals(sessionId)
    .toArray();
  return new Set(checks.map((c) => c.phaseIndex));
}

// ─── Activity Check Operations ────────────────────────────────────────────────
export async function checkActivity(sessionId, phaseIndex, activityIndex) {
  const existing = await db.activityChecks
    .where('sessionId')
    .equals(sessionId)
    .and((a) => a.phaseIndex === phaseIndex && a.activityIndex === activityIndex)
    .first();
  if (!existing) {
    await db.activityChecks.add({
      sessionId,
      phaseIndex,
      activityIndex,
      checkedAt: new Date().toISOString(),
    });
  }
}

export async function uncheckActivity(sessionId, phaseIndex, activityIndex) {
  await db.activityChecks
    .where('sessionId')
    .equals(sessionId)
    .and((a) => a.phaseIndex === phaseIndex && a.activityIndex === activityIndex)
    .delete();
}

export async function getCheckedActivities(sessionId) {
  const checks = await db.activityChecks
    .where('sessionId')
    .equals(sessionId)
    .toArray();
  // Returns a Map: key = "phaseIndex-activityIndex", value = true
  const map = new Map();
  checks.forEach((c) => map.set(`${c.phaseIndex}-${c.activityIndex}`, true));
  return map;
}

// ─── Player Notes Operations ───────────────────────────────────────────────────
export async function savePlayerNote(sessionId, playerId, text) {
  const existing = await db.playerNotes
    .where('sessionId')
    .equals(sessionId)
    .and((n) => n.playerId === playerId)
    .first();
  if (existing) {
    await db.playerNotes.update(existing.id, { text, updatedAt: new Date().toISOString() });
    return existing.id;
  }
  return db.playerNotes.add({
    sessionId,
    playerId,
    text,
    createdAt: new Date().toISOString(),
  });
}

export async function getSessionNotes(sessionId) {
  return db.playerNotes.where('sessionId').equals(sessionId).toArray();
}

export async function getPlayerNotes(playerId) {
  return db.playerNotes.where('playerId').equals(playerId).toArray();
}

// ─── Development Score Operations ─────────────────────────────────────────────
// Barça HEART scores (1–5 each): humility, effort, ambition, respect, teamwork
// Ajax TIPS scores (1–5 each): technique, insight, personality, speed
export async function saveDevelopmentScore(sessionId, playerId, scores) {
  const existing = await db.developmentScores
    .where('sessionId')
    .equals(sessionId)
    .and((s) => s.playerId === playerId)
    .first();
  if (existing) {
    await db.developmentScores.update(existing.id, {
      ...scores,
      updatedAt: new Date().toISOString(),
    });
    return existing.id;
  }
  return db.developmentScores.add({
    sessionId,
    playerId,
    ...scores,
    createdAt: new Date().toISOString(),
  });
}

export async function getPlayerScores(playerId) {
  return db.developmentScores.where('playerId').equals(playerId).toArray();
}

export async function getSessionScores(sessionId) {
  return db.developmentScores.where('sessionId').equals(sessionId).toArray();
}

// ─── Settings Operations ───────────────────────────────────────────────────────
export async function getSetting(key) {
  const record = await db.settings.get(key);
  return record ? record.value : null;
}

export async function setSetting(key, value) {
  await db.settings.put({ key, value });
}

// ─── Session Customization Operations ─────────────────────────────────────────
export async function getSessionCustomization(sessionId) {
  return db.sessionCustomizations.get(sessionId);
}

export async function saveSessionCustomization(sessionId, phases) {
  await db.sessionCustomizations.put({
    sessionId,
    phases,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteSessionCustomization(sessionId) {
  await db.sessionCustomizations.delete(sessionId);
}

// ─── Custom Drill Operations ──────────────────────────────────────────────────
export async function addCustomDrill(drill) {
  return db.customDrills.add({
    ...drill,
    createdAt: new Date().toISOString(),
  });
}

export async function getCustomDrills() {
  return db.customDrills.toArray();
}

export async function deleteCustomDrill(id) {
  return db.customDrills.delete(id);
}

// ─── Export / Import ───────────────────────────────────────────────────────────
export async function exportData() {
  const [players, completions, notes, scores, phases, settingsAll, customizations, customDrillsAll, activityChecksAll] =
    await Promise.all([
      db.players.toArray(),
      db.sessionCompletions.toArray(),
      db.playerNotes.toArray(),
      db.developmentScores.toArray(),
      db.phaseChecks.toArray(),
      db.settings.toArray(),
      db.sessionCustomizations.toArray(),
      db.customDrills.toArray(),
      db.activityChecks.toArray(),
    ]);
  return {
    exportedAt: new Date().toISOString(),
    version: 4,
    players,
    completions,
    notes,
    scores,
    phases,
    settings: settingsAll,
    sessionCustomizations: customizations,
    customDrills: customDrillsAll,
    activityChecks: activityChecksAll,
  };
}

export async function importData(data) {
  await db.transaction(
    'rw',
    [db.players, db.sessionCompletions, db.playerNotes, db.developmentScores, db.phaseChecks, db.settings, db.sessionCustomizations, db.activityChecks],
    async () => {
      if (data.players?.length) {
        await db.players.clear();
        await db.players.bulkAdd(data.players);
      }
      if (data.completions?.length) {
        await db.sessionCompletions.clear();
        await db.sessionCompletions.bulkAdd(data.completions);
      }
      if (data.notes?.length) {
        await db.playerNotes.clear();
        await db.playerNotes.bulkAdd(data.notes);
      }
      if (data.scores?.length) {
        await db.developmentScores.clear();
        await db.developmentScores.bulkAdd(data.scores);
      }
      if (data.phases?.length) {
        await db.phaseChecks.clear();
        await db.phaseChecks.bulkAdd(data.phases);
      }
      if (data.settings?.length) {
        await db.settings.clear();
        await db.settings.bulkAdd(data.settings);
      }
      if (data.sessionCustomizations?.length) {
        await db.sessionCustomizations.clear();
        await db.sessionCustomizations.bulkAdd(data.sessionCustomizations);
      }
      if (data.activityChecks?.length) {
        await db.activityChecks.clear();
        await db.activityChecks.bulkAdd(data.activityChecks);
      }
    }
  );
}
