// In-memory transport for regression tests; not a Firestore rules emulator.
export function fakeFirestore(seed = {}) {
  const data = new Map(Object.entries(structuredClone(seed)));
  const listeners = new Set();
  let offline = false;
  const snapshot = path => ({ id: path.split('/').at(-1), exists: () => data.has(path), data: () => structuredClone(data.get(path)) });
  const collection = path => ({ metadata: { fromCache: false }, docs: [...data.keys()].filter(key => key.startsWith(path + '/') && key.split('/').length === path.split('/').length + 1).map(snapshot) });
  function emit() { for (const listener of listeners) queueMicrotask(listener); }
  function client(player) {
    function allowed(path, write = false) {
      if (offline) throw new Error('offline');
      const p = path.split('/');
      if ((p[0] === 'pronos' || (p[0] === 'players' && p[2] === 'settings')) && p[1] !== player) throw new Error('permission-denied');
      if (p[0] === 'groups' && p.length > 2) {
        if (!data.has(`groups/${p[1]}/members/${player}`)) throw new Error('permission-denied');
        if (write && p[3] !== player) throw new Error('permission-denied');
      }
    }
    function commit(operations) {
      operations.forEach(([, path]) => allowed(path, true));
      for (const [op, path, value] of operations) {
        if (op === 'update' && !data.has(path)) throw new Error('not-found');
        if (op === 'delete') data.delete(path);
        else data.set(path, structuredClone(op === 'update' ? { ...data.get(path), ...value } : value));
      }
      emit();
    }
    return {
      doc: (_, ...parts) => parts.join('/'), collection: (_, ...parts) => parts.join('/'),
      serverTimestamp: () => 123456789,
      getDoc: async path => { allowed(path); return snapshot(path); },
      getDocs: async path => { allowed(path); return collection(path); },
      setDoc: async (path, value) => commit([['set', path, value]]),
      deleteDoc: async path => commit([['delete', path]]),
      async runTransaction(_, task) {
        const operations = [];
        const value = await task({
          get: async path => { if (operations.length) throw new Error('read-after-write'); allowed(path); return snapshot(path); },
          set: (path, value) => operations.push(['set', path, value]),
          update: (path, value) => operations.push(['update', path, value]),
          delete: path => operations.push(['delete', path])
        });
        commit(operations);
        return value;
      },
      query: path => path, orderBy: () => {}, limit: () => {},
      onSnapshot(path, options, next, error) {
        const listener = () => { if (!listeners.has(listener)) return; try { allowed(path); next(collection(path)); } catch (e) { error?.(e); } };
        listeners.add(listener); queueMicrotask(listener);
        return () => listeners.delete(listener);
      }
    };
  }
  return { data, client, setOffline: value => { offline = value; }, listenerCount: () => listeners.size };
}
