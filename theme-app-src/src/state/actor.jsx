import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ACTORS, actorById } from '../data/actors.js';

const KEY = 'munafasat-theme-actor-v1';
const Ctx = createContext(null);

export function ActorProvider({ children }) {
  const [id, setId] = useState(() => { try { return sessionStorage.getItem(KEY) || 'dept'; } catch (e) { return 'dept'; } });
  useEffect(() => { try { sessionStorage.setItem(KEY, id); } catch (e) { /* ignore */ } }, [id]);
  const value = useMemo(() => ({ actor: { ...actorById(id), me: true }, setActor: setId, actors: ACTORS }), [id]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useActor = () => useContext(Ctx);
