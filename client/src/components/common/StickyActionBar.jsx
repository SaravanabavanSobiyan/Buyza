export default function StickyActionBar({ children, className = "" }) {
  return (
    <div className={`fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white/95 px-4 pt-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur md:hidden ${className}`}>
      <div className="mx-auto flex max-w-6xl items-center gap-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        {children}
      </div>
    </div>
  );
}
