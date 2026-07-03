export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-primary border-t-transparent" />
        <span className="text-sm font-medium text-muted-foreground animate-pulse">
          Cargando...
        </span>
      </div>
    </div>
  );
}
