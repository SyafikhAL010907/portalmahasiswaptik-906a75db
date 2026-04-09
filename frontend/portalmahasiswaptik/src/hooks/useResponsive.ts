import { useState, useEffect } from 'react';

export type DeviceType = 'phone' | 'tablet' | 'desktop';

export interface ResponsiveState {
  deviceType: DeviceType;
  isPortrait: boolean;
  isLandscape: boolean;
  windowWidth: number;
  isMobileView: boolean; // Phone + Tablet Portrait
}

export function useResponsive() {
  const [state, setState] = useState<ResponsiveState>({
    deviceType: 'desktop',
    isPortrait: window.innerWidth < window.innerHeight,
    isLandscape: window.innerWidth >= window.innerHeight,
    windowWidth: window.innerWidth,
    isMobileView: window.innerWidth < 768, // Initial guess
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isPortrait = width < height;
      
      let deviceType: DeviceType = 'desktop';
      if (width < 768) {
        deviceType = 'phone';
      } else if (width >= 768 && width <= 1024) {
        deviceType = 'tablet';
      } else {
        deviceType = 'desktop';
      }

      const isMobileView = deviceType === 'phone' || (deviceType === 'tablet' && isPortrait) || (height < 500);

      setState({
        deviceType,
        isPortrait,
        isLandscape: !isPortrait,
        windowWidth: width,
        isMobileView
      });
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return state;
}

export default useResponsive;
