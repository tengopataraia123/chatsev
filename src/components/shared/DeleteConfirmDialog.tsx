import { forwardRef } from 'react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  className?: string;
}

const DeleteConfirmDialog = forwardRef<HTMLDivElement, DeleteConfirmDialogProps>(({
  open,
  onOpenChange,
  onConfirm,
  title = 'წაშლა',
  description = 'დარწმუნებული ხართ რომ გსურთ წაშლა? ეს ქმედება ვერ გაუქმდება.',
  confirmText = 'წაშლა',
  cancelText = 'გაუქმება',
  className,
}, ref) => {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent ref={ref} className={`z-[10000] ${className || ''}`}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelText}</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleConfirm}
          >
            {confirmText}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
});

DeleteConfirmDialog.displayName = 'DeleteConfirmDialog';

export default DeleteConfirmDialog;
