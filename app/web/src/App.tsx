import { useEffect, useState } from "react";
import { CreatePage } from "./pages/CreatePage";
import { EditorPage } from "./pages/EditorPage";

const readRoute = () => {
  const match = window.location.hash.match(/^#\/p\/([a-z0-9-]+)$/);
  return match ? match[1] : null;
};

export const navigate = (projectId: string | null) => {
  window.location.hash = projectId ? `/p/${projectId}` : "/";
};

export const App = () => {
  const [projectId, setProjectId] = useState(readRoute);
  useEffect(() => {
    const onChange = () => setProjectId(readRoute());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return projectId ? <EditorPage key={projectId} projectId={projectId} /> : <CreatePage />;
};
