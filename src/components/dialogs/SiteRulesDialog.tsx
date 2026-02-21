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
  ScrollText, 
  ShieldCheck, 
  Ban, 
  FileText, 
  MessageSquare, 
  Settings, 
  UserX, 
  AlertTriangle,
  Mail
} from 'lucide-react';

// Admin user IDs for direct profile navigation
const ADMIN_USERS = {
  CHEGE: 'b067dbd7-1235-407f-8184-e2f6aef034d3',
  PIKASO: '204eb697-6b0a-453a-beee-d32e0ab72bfd'
};

interface SiteRulesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSidebarClose?: () => void;
}

export function SiteRulesDialog({ open, onOpenChange, onSidebarClose }: SiteRulesDialogProps) {
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
              <ScrollText className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
            <div className="min-w-0">
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent font-bold">
                Chatsev.com
              </span>
              <span className="text-foreground text-base sm:text-xl"> – წესები</span>
            </div>
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-2 pl-12 sm:pl-14">ბოლო განახლება: 2026 წელი</p>
        </DialogHeader>

        <ScrollArea className="h-[60vh] px-6 py-4">
          <div className="space-y-6">
            {/* Intro */}
            <p className="text-muted-foreground leading-relaxed">
              Chatsev.com არის ქართული სოციალური ქსელი და საკომუნიკაციო პლატფორმა.
              საიტის გამოყენებით მომხმარებელი სრულად ეთანხმება ქვემოთ ჩამოთვლილ წესებს.
            </p>

            <Separator />

            {/* Section 1 */}
            <RuleSection
              icon={ShieldCheck}
              iconColor="text-emerald-500"
              iconBg="bg-emerald-500/10"
              number="1"
              title="ზოგადი პირობები"
            >
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Chatsev.com-ის გამოყენება ნებადართულია მხოლოდ <strong className="text-foreground">18 წლიდან</strong>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>რეგისტრაციისას მომხმარებელი ვალდებულია მიუთითოს რეალური და სწორი ინფორმაცია.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>ერთი მომხმარებლისთვის ნებადართულია მხოლოდ <strong className="text-foreground">ერთი აქტიური ანგარიში</strong>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>მომხმარებელი პასუხისმგებელია საკუთარი ანგარიშის უსაფრთხოებაზე.</span>
                </li>
              </ul>
            </RuleSection>

            <Separator />

            {/* Section 2 */}
            <RuleSection
              icon={Ban}
              iconColor="text-destructive"
              iconBg="bg-destructive/10"
              number="2"
              title="აკრძალული ქმედებები"
            >
              <p className="text-sm text-muted-foreground mb-3">საიტზე კატეგორიულად აკრძალულია:</p>
              <ul className="space-y-2 text-sm">
                <ProhibitedItem>შეურაცხყოფა, მუქარა, ბულინგი ან დისკრიმინაცია ნებისმიერი ნიშნით</ProhibitedItem>
                <ProhibitedItem>პორნოგრაფიული, ძალადობრივი ან არასრულწლოვნებთან დაკავშირებული კონტენტი</ProhibitedItem>
                <ProhibitedItem>სპამი, რეკლამა ან მესამე მხარის სერვისების უნებართვო პოპულარიზაცია</ProhibitedItem>
                <ProhibitedItem>ყალბი პროფილების შექმნა ან სხვისი სახელით მოქმედება</ProhibitedItem>
                <ProhibitedItem>ბოტების, სკრიპტების ან სისტემის დაზიანების მცდელობა</ProhibitedItem>
                <ProhibitedItem>სხვისი პირადი ინფორმაციის გავრცელება მისი თანხმობის გარეშე</ProhibitedItem>
              </ul>
            </RuleSection>

            <Separator />

            {/* Section 3 */}
            <RuleSection
              icon={FileText}
              iconColor="text-blue-500"
              iconBg="bg-blue-500/10"
              number="3"
              title="კონტენტი და პასუხისმგებლობა"
            >
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>მომხმარებელი სრულად არის პასუხისმგებელი მის მიერ გამოქვეყნებულ კონტენტზე.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Chatsev.com არ აგებს პასუხს მომხმარებლებს შორის პირად ურთიერთობებსა და მიმოწერაზე.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>ადმინისტრაციას აქვს უფლება წაშალოს ან შეზღუდოს ნებისმიერი კონტენტი წესების დარღვევის შემთხვევაში.</span>
                </li>
              </ul>
            </RuleSection>

            <Separator />

            {/* Section 4 */}
            <RuleSection
              icon={MessageSquare}
              iconColor="text-violet-500"
              iconBg="bg-violet-500/10"
              number="4"
              title="ჩატი და კომენტარები"
            >
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>ჩატში და კომენტარებში უნდა იყოს დაცული ეთიკური და კულტურული ნორმები.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>პირადი მიმოწერა კონფიდენციალურია.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>მიმოწერის ნახვის უფლება აქვს მხოლოდ გამგზავნსა და მიმღებს.</span>
                </li>
              </ul>
            </RuleSection>

            <Separator />

            {/* Section 5 */}
            <RuleSection
              icon={Settings}
              iconColor="text-amber-500"
              iconBg="bg-amber-500/10"
              number="5"
              title="ადმინისტრაციის უფლებები"
            >
              <p className="text-sm text-muted-foreground mb-3">Chatsev.com ადმინისტრაციას უფლება აქვს:</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>დროებით ან სამუდამოდ დაბლოკოს მომხმარებლის ანგარიში გაფრთხილების გარეშე</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>წაშალოს კონტენტი ან პროფილი წესების დარღვევის შემთხვევაში</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>ნებისმიერ დროს შეცვალოს საიტის წესები</span>
                </li>
              </ul>
              <p className="text-xs text-muted-foreground/70 mt-3 italic">
                ცვლილებების შემდეგ საიტის გამოყენება ავტომატურად ნიშნავს ახალ წესებზე თანხმობას.
              </p>
            </RuleSection>

            <Separator />

            {/* Section 6 */}
            <RuleSection
              icon={UserX}
              iconColor="text-rose-500"
              iconBg="bg-rose-500/10"
              number="6"
              title="ანგარიშის გაუქმება"
            >
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>მომხმარებელს ნებისმიერ დროს შეუძლია საკუთარი ანგარიშის გაუქმება.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>წესების მძიმე დარღვევის შემთხვევაში ადმინისტრაციას შეუძლია ანგარიშის იძულებით დახურვა.</span>
                </li>
              </ul>
            </RuleSection>

            <Separator />

            {/* Section 7 */}
            <RuleSection
              icon={AlertTriangle}
              iconColor="text-orange-500"
              iconBg="bg-orange-500/10"
              number="7"
              title="პასუხისმგებლობის შეზღუდვა"
            >
              <p className="text-sm text-muted-foreground mb-3">Chatsev.com არ არის პასუხისმგებელი:</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>მომხმარებლებს შორის კონფლიქტებზე</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>დროებით ტექნიკურ შეფერხებებზე</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>მესამე მხარის საიტებზე განთავსებულ კონტენტზე</span>
                </li>
              </ul>
            </RuleSection>

            <Separator />

            {/* Contact Section */}
            <div className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-xl p-4 border border-primary/10">
              <div className="flex items-center gap-2 mb-3">
                <Mail className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">კონტაქტი</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                საიტის წესებთან დაკავშირებულ საკითხებზე დაუკავშირდით სუპერ ადმინისტრატორებს:
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
                დაკავშირება შესაძლებელია საიტის შიდა ჩატის ან შეტყობინების მეშვეობით.
              </p>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// Sub-components
function RuleSection({ 
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

function ProhibitedItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-muted-foreground">
      <span className="text-destructive mt-0.5">❌</span>
      <span>{children}</span>
    </li>
  );
}
