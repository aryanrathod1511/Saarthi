
const sessionMap = new Map();

export function createSession(sessionId, promptInstance) {
  sessionMap.set(sessionId, promptInstance);
}

export function getSession(sessionId) {
  return sessionMap.get(sessionId);
}

export function deleteSession(sessionId) {
  sessionMap.delete(sessionId);
}

export function hasSession(sessionId) {
  return sessionMap.has(sessionId);
}
