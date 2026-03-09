import { Suspense } from "react";

import { Lobby } from "@/components/lobby";

function Page() {
  return (
    <Suspense fallback={null}>
      <Lobby />
    </Suspense>
  );
}

export default Page;
