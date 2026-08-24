import { Link } from '@tanstack/react-router'
import { Button, buttonVariants } from '~/components/ui/button'

export function NotFound({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="text-muted-foreground">
        {children || <p>The page you are looking for does not exist.</p>}
      </div>
      <p className="flex items-center gap-2 flex-wrap">
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => window.history.back()}
        >
          Go back
        </Button>
        <Link
          to="/"
          className={buttonVariants({ size: 'lg' })}
        >
          Start Over
        </Link>
      </p>
    </div>
  )
}
