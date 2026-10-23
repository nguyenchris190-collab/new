import { useCallback, useEffect, useState } from 'react';
import { useStore } from './state/StoreContext';
import { CentralHub } from './screens/CentralHub';
import { CourseWorkspace } from './screens/CourseWorkspace';
import { QuizRunner } from './screens/QuizRunner';

type Route = { name: 'hub' } | { name: 'course'; id: string } | { name: 'session'; id: string };

function parseHash(): Route {
  const parts = window.location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
  if (parts[0] === 'course' && parts[1]) return parts[2] === 'session' ? { name: 'session', id: parts[1] } : { name: 'course', id: parts[1] };
  return { name: 'hub' };
}

const toHash = (r: Route) =>
  r.name === 'hub' ? '#/' : `#/course/${encodeURIComponent(r.id)}${r.name === 'session' ? '/session' : ''}`;

/** Minimal hash router so the mobile back gesture moves between screens. */
function useRoute() {
  const [route, setRoute] = useState<Route>(parseHash);
  useEffect(() => {
    const on = () => setRoute(parseHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const navigate = useCallback((r: Route, replace = false) => {
    const h = toHash(r);
    if (replace) window.history.replaceState(null, '', h);
    else window.location.hash = h;
    setRoute(r);
    window.scrollTo({ top: 0 });
  }, []);
  return [route, navigate] as const;
}

export default function App() {
  const { state } = useStore();
  const [route, navigate] = useRoute();

  // A session URL without a matching active session falls back to the workspace.
  useEffect(() => {
    if (route.name === 'session' && state.active?.courseId !== route.id) navigate({ name: 'course', id: route.id }, true);
  }, [route, state.active, navigate]);

  if (route.name === 'session' && state.active?.courseId === route.id) {
    return <QuizRunner goWorkspace={() => navigate({ name: 'course', id: route.id }, true)} />;
  }
  if (route.name === 'course' || route.name === 'session') {
    return (
      <CourseWorkspace
        courseId={route.id}
        goHub={() => navigate({ name: 'hub' })}
        goSession={() => navigate({ name: 'session', id: route.id })}
      />
    );
  }
  return <CentralHub openCourse={(id) => navigate({ name: 'course', id })} />;
}
