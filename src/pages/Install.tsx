import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Smartphone, Check, Apple, Chrome } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TopGeCounter from '@/components/TopGeCounter';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    setIsAndroid(/android/.test(userAgent));

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="flex-1 flex items-center justify-center">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                <Check className="w-8 h-8 text-green-500" />
              </div>
              <CardTitle className="text-2xl">აპი უკვე დაყენებულია!</CardTitle>
              <CardDescription>
                ChatSev უკვე დაყენებულია თქვენს მოწყობილობაზე
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button onClick={() => navigate('/')} className="w-full">
                გახსენი ChatSev
              </Button>
            </CardContent>
          </Card>
        </div>
        <div className="pb-8">
          <TopGeCounter />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="flex-1 flex items-center justify-center w-full">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-20 h-20 bg-primary/20 rounded-2xl flex items-center justify-center mb-4">
              <img src="/pwa-192x192.png" alt="ChatSev" className="w-16 h-16 rounded-xl" />
            </div>
            <CardTitle className="text-2xl">დააყენე ChatSev</CardTitle>
            <CardDescription>
              დააინსტალირე აპლიკაცია უფრო სწრაფი და მოხერხებული გამოყენებისთვის
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Features */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <Smartphone className="w-4 h-4 text-primary" />
                </div>
                <span>მთავარ ეკრანზე პირდაპირი ხატულა</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <Download className="w-4 h-4 text-primary" />
                </div>
                <span>სწრაფი ჩატვირთვა და offline მხარდაჭერა</span>
              </div>
            </div>

            {/* Install Button for Android/Desktop */}
            {deferredPrompt && (
              <Button onClick={handleInstall} className="w-full" size="lg">
                <Download className="w-5 h-5 mr-2" />
                დააინსტალირე
              </Button>
            )}

            {/* iOS Instructions */}
            {isIOS && !deferredPrompt && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Apple className="w-5 h-5" />
                  <span>iPhone/iPad-ზე დასაყენებლად:</span>
                </div>
                <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                  <li>დააჭირე <strong>გაზიარების</strong> ღილაკს (□↑)</li>
                  <li>აირჩიე <strong>"Add to Home Screen"</strong></li>
                  <li>დააჭირე <strong>"Add"</strong></li>
                </ol>
              </div>
            )}

            {/* Android Instructions if prompt not available */}
            {isAndroid && !deferredPrompt && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Chrome className="w-5 h-5" />
                  <span>Android-ზე დასაყენებლად:</span>
                </div>
                <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                  <li>დააჭირე ბრაუზერის <strong>მენიუს</strong> (⋮)</li>
                  <li>აირჩიე <strong>"Install app"</strong> ან <strong>"Add to Home screen"</strong></li>
                  <li>დაადასტურე ინსტალაცია</li>
                </ol>
              </div>
            )}

            {/* Desktop Instructions */}
            {!isIOS && !isAndroid && !deferredPrompt && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Chrome className="w-5 h-5" />
                  <span>კომპიუტერზე დასაყენებლად:</span>
                </div>
                <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                  <li>Chrome-ში დააჭირე მისამართის ზოლში <strong>ინსტალაციის</strong> ხატულას</li>
                  <li>ან გახსენი მენიუ (⋮) → <strong>"Install ChatSev"</strong></li>
                </ol>
              </div>
            )}

            <Button variant="outline" onClick={() => navigate('/')} className="w-full">
              გაგრძელება ბრაუზერში
            </Button>
          </CardContent>
        </Card>
      </div>
      <div className="pb-8">
        <TopGeCounter />
      </div>
    </div>
  );
};

export default Install;