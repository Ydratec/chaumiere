import { ViewTransition } from "react";

// Un template est recréé à chaque navigation : le contenu glisse/fond d'une page à l'autre,
// pendant que l'en-tête et la barre d'onglets (dans le layout) restent en place.
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter="page-in" exit="page-out" default="none">
      {children}
    </ViewTransition>
  );
}
