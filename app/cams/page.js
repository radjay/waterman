import { Suspense } from "react";
import { MainLayout } from "../../components/layout/MainLayout";
import { ScreenSkeleton } from "../../components/common/ScreenState";
import LiveContent from "./LiveContent";

export default function LivePage() {
  return (
    <Suspense
      fallback={
        <MainLayout>
          <ScreenSkeleton variant="live" />
        </MainLayout>
      }
    >
      <LiveContent />
    </Suspense>
  );
}
