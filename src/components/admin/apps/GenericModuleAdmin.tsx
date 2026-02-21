import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Settings } from 'lucide-react';

interface GenericModuleAdminProps {
  moduleName: string;
  displayName: string;
  onBack: () => void;
}

export default function GenericModuleAdmin({ moduleName, displayName, onBack }: GenericModuleAdminProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            {displayName}
          </h2>
          <p className="text-sm text-muted-foreground">მოდულის მართვა</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6 text-center">
          <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">{displayName} მოდული</h3>
          <p className="text-sm text-muted-foreground">
            ამ მოდულის დეტალური მართვა მალე დაემატება
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
