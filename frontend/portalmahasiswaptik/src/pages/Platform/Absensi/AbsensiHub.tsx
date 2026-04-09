import { useState, useEffect } from 'react';
import MobileHub from '../../MobilePhone/Absensi/AbsensiHub';

export default function AbsensiHub() {
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // For Web, we can just show the first item (History) or redirect, 
    // but the mandate focuses on Mobile UX. For now, mobile returns the Hub.
    return isMobile ? <MobileHub /> : null;
}
