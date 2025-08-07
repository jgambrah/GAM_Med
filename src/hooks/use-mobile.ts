'use client';

import { useEffect, useState } from 'react';

const MOBILE_BREAKPOINT = 768; // Corresponds to md: in Tailwind

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    // Check on initial load
    checkDevice();

    // Add resize listener
    window.addEventListener('resize', checkDevice);

    // Cleanup listener
    return () => {
      window.removeEventListener('resize', checkDevice);
    };
  }, []);

  return isMobile;
}
