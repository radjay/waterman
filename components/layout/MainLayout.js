export function MainLayout({ children, className = "" }) {
  return (
    <main
      className={`max-w-[900px] mx-auto px-4 py-4 md:p-8 border-l border-r border-black/10 min-h-screen bg-newsprint shadow-[0_0_20px_rgba(0,0,0,0.1)] ${className}`}
    >
      {children}
    </main>
  );
}



