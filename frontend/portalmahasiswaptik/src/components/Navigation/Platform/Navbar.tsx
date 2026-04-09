import { useState, useEffect } from 'react';
import { Navbar as WebNavbar } from '../WebAndTab/Navbar';
import { NavigationMode } from '@/lib/navigationConfig';

interface NavbarProps {
    onModeChange: (mode: NavigationMode) => void;
}

import { useResponsive } from '@/hooks/useResponsive';

interface NavbarProps {
    onModeChange: (mode: NavigationMode) => void;
}

export function Navbar(props: NavbarProps) {
    const { isMobileView } = useResponsive();

    if (isMobileView) {
        return null;
    }

    return <WebNavbar {...props} />;
}
