import { Plus } from 'lucide-react';

interface FloatingCreateButtonProps {
  onClick: () => void;
}

const FloatingCreateButton = ({ onClick }: FloatingCreateButtonProps) => {
  return (
    <button
      onClick={onClick}
      className="hidden lg:flex fixed bottom-6 right-6 z-30 w-14 h-14 rounded-full items-center justify-center shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl bg-gradient-to-r from-primary to-accent text-white"
      aria-label="ახალი პოსტის შექმნა"
    >
      <Plus className="w-6 h-6" />
    </button>
  );
};

export default FloatingCreateButton;
