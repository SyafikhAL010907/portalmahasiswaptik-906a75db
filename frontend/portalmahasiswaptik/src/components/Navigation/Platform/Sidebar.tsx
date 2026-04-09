import { useResponsive } from '@/hooks/useResponsive';
import { BottomNav } from '../MobilePhone/BottomNav';
import { Sidebar as WebSidebar } from '../WebAndTab/Sidebar';
import { NavigationMode } from '@/lib/navigationConfig';

interface SidebarProps {
    mobileOpen: boolean;
    setMobileOpen: (open: boolean) => void;
    navigationMode?: NavigationMode;
    onModeChange?: (mode: NavigationMode) => void;
    isCollapsed?: boolean;
    onCollapseToggle?: () => void;
}

export function Sidebar(props: SidebarProps) {
    const { isMobileView } = useResponsive();

    if (isMobileView) {
        return <BottomNav />;
    }

    return <WebSidebar {...props} />;
}
