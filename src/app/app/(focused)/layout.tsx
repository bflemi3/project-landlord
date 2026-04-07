export default function FocusedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-0 flex-1">
      {children}
    </div>
  )
}
