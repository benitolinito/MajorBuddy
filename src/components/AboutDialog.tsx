import { ReactNode } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

type AboutDialogProps = {
  trigger: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export const AboutDialog = ({ trigger, open, onOpenChange }: AboutDialogProps) => {
  const dialogProps = open === undefined ? {} : { open };

  return (
    <Dialog {...dialogProps} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader className="text-left">
          <DialogTitle>About MajorBuddy</DialogTitle>
          <DialogDescription>Learn more about who built this project.</DialogDescription>
        </DialogHeader>
        <div className="rounded-xl border border-border bg-muted/30 p-4">
          <p className="text-sm font-semibold text-foreground">Built by</p>
          <p className="mt-2 text-sm text-muted-foreground">
            <a
              href="https://github.com/aiexr"
              className="font-medium text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              aiexr
            </a>{' '}
            and{' '}
            <a
              href="https://github.com/benitolinito"
              className="font-medium text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              benitolinito
            </a>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
