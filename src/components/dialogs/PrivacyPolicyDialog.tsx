import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Lock, 
  Database, 
  Target, 
  MessageSquare, 
  ShieldCheck, 
  Cookie,
  Trash2,
  RefreshCw,
  Mail
} from 'lucide-react';

// Admin user IDs for direct profile navigation
const ADMIN_USERS = {
  CHEGE: 'b067dbd7-1235-407f-8184-e2f6aef034d3',
  PIKASO: '204eb697-6b0a-453a-beee-d32e0ab72bfd'
};

interface PrivacyPolicyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSidebarClose?: () => void;
}

export function PrivacyPolicyDialog({ open, onOpenChange, onSidebarClose }: PrivacyPolicyDialogProps) {
  const navigate = useNavigate();

  const handleProfileClick = (userId: string) => {
    onOpenChange(false);
    onSidebarClose?.();
    navigate(`/?view=profile&userId=${userId}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0">
        <DialogHeader className="p-6 pb-4 pr-12 bg-gradient-to-r from-primary/10 to-accent/10 border-b">
          <DialogTitle className="flex items-center gap-3 text-lg sm:text-xl">
            <div className="p-2 rounded-xl bg-primary/20 flex-shrink-0">
              <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
            <div className="min-w-0">
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent font-bold">
                Chatsev.com
              </span>
              <span className="text-foreground text-base sm:text-xl"> – კონფიდენციალურობა</span>
            </div>
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-2 pl-12 sm:pl-14">ბოლო განახლება: 2026 წელი</p>
        </DialogHeader>

        <ScrollArea className="h-[60vh] px-6 py-4">
          <div className="space-y-6">
            {/* Intro */}
            <p className="text-muted-foreground leading-relaxed">
              Chatsev.com პატივს სცემს მომხმარებლის პირად სივრცეს და იცავს მათ მონაცემებს.
            </p>

            <Separator />

            {/* Section 1 */}
            <PolicySection
              icon={Database}
              iconColor="text-blue-500"
              iconBg="bg-blue-500/10"
              number="1"
              title="რა მონაცემებს ვაგროვებთ"
            >
              <p className="text-sm text-muted-foreground mb-3">რეგისტრაციისა და გამოყენების დროს შესაძლოა დამუშავდეს:</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>მეტსახელი (ნიკი)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>პაროლი (დაცული / ჰეშირებული სახით)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>პროფილის ინფორმაცია, რომელსაც მომხმარებელი თავად აქვეყნებს</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>ტექნიკური მონაცემები (IP მისამართი, მოწყობილობა, ბრაუზერი)</span>
                </li>
              </ul>
            </PolicySection>

            <Separator />

            {/* Section 2 */}
            <PolicySection
              icon={Target}
              iconColor="text-emerald-500"
              iconBg="bg-emerald-500/10"
              number="2"
              title="მონაცემების გამოყენების მიზანი"
            >
              <p className="text-sm text-muted-foreground mb-3">მონაცემები გამოიყენება მხოლოდ:</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>საიტის ფუნქციონირებისათვის</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>უსაფრთხოების უზრუნველსაყოფად</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>ბოროტად გამოყენების თავიდან ასაცილებლად</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>მომხმარებლის გამოცდილების გასაუმჯობესებლად</span>
                </li>
              </ul>
            </PolicySection>

            <Separator />

            {/* Section 3 */}
            <PolicySection
              icon={MessageSquare}
              iconColor="text-violet-500"
              iconBg="bg-violet-500/10"
              number="3"
              title="პირადი მიმოწერა"
            >
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>მომხმარებლებს შორის პირადი მიმოწერა <strong className="text-foreground">კონფიდენციალურია</strong>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Chatsev.com არ იყენებს მიმოწერის შინაარსს კომერციული მიზნებისთვის.</span>
                </li>
              </ul>
            </PolicySection>

            <Separator />

            {/* Section 4 */}
            <PolicySection
              icon={ShieldCheck}
              iconColor="text-green-500"
              iconBg="bg-green-500/10"
              number="4"
              title="მონაცემების დაცვა"
            >
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>ყველა სენსიტიური მონაცემი დაცულია თანამედროვე უსაფრთხოების ტექნოლოგიებით.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>პაროლები ინახება <strong className="text-foreground">დაშიფრული (ჰეშირებული)</strong> სახით.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>არ ხდება მონაცემების გაყიდვა ან მესამე მხარისთვის გადაცემა კანონის გარეშე.</span>
                </li>
              </ul>
            </PolicySection>

            <Separator />

            {/* Section 5 */}
            <PolicySection
              icon={Cookie}
              iconColor="text-amber-500"
              iconBg="bg-amber-500/10"
              number="5"
              title="ქუქიები (Cookies)"
            >
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Chatsev.com იყენებს ქუქიებს ავტორიზაციისა და კომფორტული გამოყენებისთვის.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>ქუქიები არ შეიცავს პირად ან სენსიტიურ ინფორმაციას.</span>
                </li>
              </ul>
            </PolicySection>

            <Separator />

            {/* Section 6 */}
            <PolicySection
              icon={Trash2}
              iconColor="text-rose-500"
              iconBg="bg-rose-500/10"
              number="6"
              title="მონაცემების წაშლა"
            >
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>მომხმარებელს შეუძლია ნებისმიერ დროს მოითხოვოს საკუთარი ანგარიშისა და მონაცემების წაშლა.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>მოთხოვნის შემდეგ მონაცემები წაიშლება გონივრულ ვადაში.</span>
                </li>
              </ul>
            </PolicySection>

            <Separator />

            {/* Section 7 */}
            <PolicySection
              icon={RefreshCw}
              iconColor="text-orange-500"
              iconBg="bg-orange-500/10"
              number="7"
              title="პოლიტიკის ცვლილება"
            >
              <p className="text-sm text-muted-foreground">
                Chatsev.com იტოვებს უფლებას შეცვალოს კონფიდენციალურობის პოლიტიკა.
              </p>
              <p className="text-xs text-muted-foreground/70 mt-2 italic">
                ცვლილებების შემდეგ საიტის გამოყენება ნიშნავს განახლებულ პოლიტიკაზე თანხმობას.
              </p>
            </PolicySection>

            <Separator />

            {/* Contact Section */}
            <div className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-xl p-4 border border-primary/10">
              <div className="flex items-center gap-2 mb-3">
                <Mail className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">კონტაქტი</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                კონფიდენციალურობასთან დაკავშირებულ საკითხებზე დაუკავშირდით სუპერ ადმინისტრატორებს:
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleProfileClick(ADMIN_USERS.CHEGE)}
                  className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors cursor-pointer"
                >
                  CHEGE
                </button>
                <button
                  onClick={() => handleProfileClick(ADMIN_USERS.PIKASO)}
                  className="px-3 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium hover:bg-accent/20 transition-colors cursor-pointer"
                >
                  P ი კ ა S ო
                </button>
              </div>
              <p className="text-xs text-muted-foreground/70 mt-3">
                დაკავშირება შესაძლებელია საიტის შიდა ჩატის მეშვეობით.
              </p>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// Sub-component
function PolicySection({ 
  icon: Icon, 
  iconColor, 
  iconBg, 
  number, 
  title, 
  children 
}: { 
  icon: any; 
  iconColor: string; 
  iconBg: string; 
  number: string; 
  title: string; 
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${iconBg}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <h3 className="font-semibold text-foreground">
          <span className="text-primary mr-1">{number}.</span>
          {title}
        </h3>
      </div>
      <div className="pl-12">
        {children}
      </div>
    </div>
  );
}
