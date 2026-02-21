import { ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';

interface FormFieldProps {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}

const FormField = ({ id, label, error, children }: FormFieldProps) => (
  <div className="space-y-2">
    <Label htmlFor={id} className="text-sm font-medium text-foreground block leading-normal">
      {label}
    </Label>
    {children}
    <AnimatePresence mode="wait">
      {error && (
        <motion.p
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="text-xs text-destructive leading-relaxed"
        >
          {error}
        </motion.p>
      )}
    </AnimatePresence>
  </div>
);

export default FormField;
