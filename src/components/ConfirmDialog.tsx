import { ReactNode, useId, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

type ConfirmDialogProps = {
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'default' | 'destructive';
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmationText?: string;
  confirmationLabel?: string;
  confirmationPlaceholder?: string;
  confirmationHint?: ReactNode;
  confirmationCaseSensitive?: boolean;
};

export const ConfirmDialog = ({
  trigger,
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'default',
  confirmDisabled = false,
  onConfirm,
  onCancel,
  confirmationText,
  confirmationLabel,
  confirmationPlaceholder,
  confirmationHint,
  confirmationCaseSensitive = false,
}: ConfirmDialogProps) => {
  const [confirmationValue, setConfirmationValue] = useState('');
  const inputId = useId();
  const requiresConfirmation = Boolean(confirmationText);
  const normalizedExpected = !confirmationText
    ? null
    : confirmationCaseSensitive
      ? confirmationText
      : confirmationText.trim().toLowerCase();
  const normalizedValue = confirmationCaseSensitive
    ? confirmationValue
    : confirmationValue.trim().toLowerCase();
  const confirmationMet = !requiresConfirmation || normalizedValue === normalizedExpected;
  const isConfirmDisabled = confirmDisabled || !confirmationMet;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setConfirmationValue('');
    }
    onOpenChange?.(nextOpen);
  };

  const handleConfirm = () => {
    if (isConfirmDisabled) return;
    onConfirm();
  };

  const dialogProps =
    open === undefined
      ? { onOpenChange: handleOpenChange }
      : { open, onOpenChange: handleOpenChange };

  return (
    <AlertDialog {...dialogProps}>
      {trigger ? <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger> : null}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? <AlertDialogDescription>{description}</AlertDialogDescription> : null}
        </AlertDialogHeader>
        {requiresConfirmation ? (
          <div className="space-y-2">
            {confirmationLabel ? (
              <label htmlFor={inputId} className="text-sm font-medium text-foreground">
                {confirmationLabel}
              </label>
            ) : null}
            <Input
              id={inputId}
              value={confirmationValue}
              onChange={(event) => setConfirmationValue(event.target.value)}
              placeholder={confirmationPlaceholder ?? confirmationText ?? ''}
              autoComplete="off"
              spellCheck={false}
            />
            {confirmationHint ? (
              <p className="text-xs text-muted-foreground">{confirmationHint}</p>
            ) : null}
          </div>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
            className={cn(
              confirmVariant === 'destructive' &&
                'bg-destructive text-destructive-foreground hover:bg-destructive/90',
            )}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
