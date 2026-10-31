import { Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { routes } from './router/routes';
import AdminFab from './shared/components/AdminFab';
import ShareSheet from './shared/components/ShareSheet';

// ============================================================
// SECTION: Loading Fallback (dipakai saat pindah halaman / lazy chunk)
// ============================================================
function PageLoader() {
  return (
    <div className="min-h-screen bg-gray-100 text-gray-700 flex flex-col items-center justify-center gap-4" role="status" aria-live="polite">
      <div className="spinner" aria-hidden="true" />
      <div className="progress-track" aria-hidden="true"><div className="progress-fill" /></div>
      <span className="text-sm">Memuat halaman...</span>
    </div>
  );
}

// ============================================================
// SECTION: Render — Routes
// ============================================================
export default function App() {
  return (
    <>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {routes.map(({ path, component: Page }) => (
            <Route key={path} path={path} element={<Page />} />
          ))}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <AdminFab />
      <ShareSheet />
    </>
  );
}
