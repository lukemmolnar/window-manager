import { useState } from 'react';

export function useForceUpdate() {
    const [state, setState] = useState(0);
    return () => setState((state) => state + 1);
  }