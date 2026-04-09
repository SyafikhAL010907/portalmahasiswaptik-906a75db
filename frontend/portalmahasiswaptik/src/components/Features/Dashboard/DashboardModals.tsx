import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useDashboard } from '@/SharedLogic/hooks/useDashboard';

interface DashboardModalsProps {
  dashboard: ReturnType<typeof useDashboard>;
}

export function DashboardModals({ dashboard }: DashboardModalsProps) {
  const { isQrOpen, qrData, userName, userNim, userClass, getRoleDisplay } = dashboard.state;
  const { setIsQrOpen } = dashboard.actions;

  return (
    <Dialog open={isQrOpen} onOpenChange={setIsQrOpen}>
      <DialogContent className="sm:max-w-md text-center">
        <DialogHeader>
          <DialogTitle>QR Code Saya</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center py-6 gap-4">
          <div className="p-4 bg-white rounded-xl shadow-lg">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrData)}`}
              alt="QR Code"
              className="w-48 h-48"
            />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-lg">{userName}</h3>
            <p className="text-sm text-muted-foreground">{userNim}</p>
            <p className="text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary inline-block">
              {userClass ? `Kelas ${userClass}` : getRoleDisplay()}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
