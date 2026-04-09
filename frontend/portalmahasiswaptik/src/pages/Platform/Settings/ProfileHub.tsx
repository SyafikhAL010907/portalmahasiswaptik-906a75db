import { useResponsive } from '@/hooks/useResponsive';
import MobileHub from '../../MobilePhone/Settings/ProfileHub';

export default function ProfileHub() {
    const { isMobileView } = useResponsive();

    return isMobileView ? <MobileHub /> : null;
}
