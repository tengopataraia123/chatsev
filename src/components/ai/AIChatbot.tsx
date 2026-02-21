import { memo, useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { 
  Bot, Send, Loader2, X, Sparkles, 
  HelpCircle, Lightbulb, Heart, User, Trash2
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { useToast } from '@/hooks/use-toast';
import ChatSevLogo from '@/components/ui/ChatSevLogo';
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

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIChatbotProps {
  isOpen: boolean;
  onClose: () => void;
}

const QUICK_PROMPTS = [
  { icon: HelpCircle, text: 'როგორ დავამატო მეგობარი?' },
  { icon: Lightbulb, text: 'რა ფუნქციები აქვს საიტს?' },
  { icon: Heart, text: 'როგორ მუშაობს გაცნობა?' },
];

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content: 'გამარჯობა! 👋 მე ვარ ChatSev-ის AI ასისტენტი. როგორ შემიძლია დაგეხმაროთ?',
  timestamp: new Date()
};

const AIChatbot = memo(({ isOpen, onClose }: AIChatbotProps) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load chat history from database
  const loadChatHistory = useCallback(async () => {
    if (!user?.id) return;
    
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('ai_chat_messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        const loadedMessages: Message[] = data.map(msg => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: new Date(msg.created_at)
        }));
        setMessages([WELCOME_MESSAGE, ...loadedMessages]);
      } else {
        setMessages([WELCOME_MESSAGE]);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [user?.id]);

  // Load history when opened
  useEffect(() => {
    if (isOpen && user?.id) {
      loadChatHistory();
    }
  }, [isOpen, user?.id, loadChatHistory]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Body scroll locking when chatbot is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      const originalTouchAction = document.body.style.touchAction;
      
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
      
      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.touchAction = originalTouchAction;
      };
    }
  }, [isOpen]);

  // Save message to database
  const saveMessage = async (role: 'user' | 'assistant', content: string) => {
    if (!user?.id) return null;
    
    try {
      const { data, error } = await supabase
        .from('ai_chat_messages')
        .insert({
          user_id: user.id,
          role,
          content
        })
        .select()
        .single();

      if (error) throw error;
      return data?.id;
    } catch (error) {
      console.error('Error saving message:', error);
      return null;
    }
  };

  // Clear chat history
  const clearHistory = async () => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('ai_chat_messages')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setMessages([WELCOME_MESSAGE]);
      toast({
        title: 'ისტორია წაიშალა',
        description: 'ჩატის ისტორია წარმატებით წაიშალა',
      });
    } catch (error) {
      console.error('Error clearing history:', error);
      toast({
        title: 'შეცდომა',
        description: 'ვერ მოხერხდა ისტორიის წაშლა',
        variant: 'destructive',
      });
    }
  };

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;

    const userMessageId = await saveMessage('user', messageText);
    
    const userMessage: Message = {
      id: userMessageId || Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Call edge function
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { 
          message: messageText,
          history: messages.slice(-10).map(m => ({
            role: m.role,
            content: m.content
          }))
        }
      });

      if (error) throw error;

      const responseContent = data?.response || 'ვერ მოხერხდა პასუხის მიღება. გთხოვთ სცადოთ ხელახლა.';
      const assistantMessageId = await saveMessage('assistant', responseContent);

      const assistantMessage: Message = {
        id: assistantMessageId || (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseContent,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('AI chat error:', error);
      
      // Fallback response when AI is not available
      const fallbackContent = getFallbackResponse(messageText);
      const fallbackId = await saveMessage('assistant', fallbackContent);
      
      const fallbackMessage: Message = {
        id: fallbackId || (Date.now() + 1).toString(),
        role: 'assistant',
        content: fallbackContent,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, fallbackMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const getFallbackResponse = (query: string): string => {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('მეგობ') || lowerQuery.includes('friend')) {
      return `მეგობრის დასამატებლად:
1. გახსენით მომხმარებლის პროფილი
2. დააჭირეთ "მეგობრობა" ღილაკს
3. დაელოდეთ მათ დადასტურებას

ასევე შეგიძლიათ მოძებნოთ მომხმარებლები ძიების ფუნქციით.`;
    }
    
    if (lowerQuery.includes('გაცნობ') || lowerQuery.includes('dating')) {
      return `გაცნობის ფუნქცია:
1. გადადით "გაცნობა" განყოფილებაში
2. შეავსეთ თქვენი პროფილი
3. დაიწყეთ სვაიპი მარჯვნივ (მოწონება) ან მარცხნივ (გამოტოვება)
4. თუ ორივემ მოიწონეთ ერთმანეთი - მატჩი!`;
    }
    
    if (lowerQuery.includes('პოსტ') || lowerQuery.includes('post')) {
      return `პოსტის შესაქმნელად:
1. დააჭირეთ "+" ღილაკს ან "რას ფიქრობთ?" ველს
2. დაწერეთ ტექსტი
3. სურვილისამებრ დაამატეთ ფოტო ან ვიდეო
4. დააჭირეთ "გამოქვეყნება"`;
    }
    
    if (lowerQuery.includes('ფუნქცი') || lowerQuery.includes('რა აქვს')) {
      return `ChatSev-ის ძირითადი ფუნქციები:
• 📝 პოსტები და სტორები
• 💬 პირადი და ჯგუფური ჩატი
• 💕 გაცნობის სისტემა
• 🎮 თამაშები და ქვიზები
• 🎬 ფილმები და ვიდეოები
• 🎵 მუსიკა`;
    }
    
    return `გმადლობთ შეკითხვისთვის! 

თუ გჭირდებათ დახმარება კონკრეტულ საკითხზე, შეგიძლიათ:
• დასვათ შეკითხვა ქვემოთ
• მოძებნოთ პარამეტრებში
• დაუკავშირდეთ ადმინისტრაციას

რითი შემიძლია დაგეხმაროთ?`;
  };

  if (!isOpen) return null;

  const chatContent = (
    <div 
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-md"
      style={{ isolation: 'isolate' }}
    >
      <Card className="w-full sm:max-w-md h-[80vh] sm:h-[600px] sm:rounded-2xl rounded-t-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300 border-2 border-primary/20 shadow-2xl shadow-primary/10 bg-card">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50 bg-gradient-to-r from-primary/15 via-accent/10 to-primary/5 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="relative">
              <ChatSevLogo size={40} />
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
            </div>
            <div>
              <h3 className="font-semibold flex items-center gap-1">
                AI ChatSev
                <Sparkles className="w-4 h-4 text-yellow-500" />
              </h3>
              <p className="text-xs text-muted-foreground">24/7 ასისტენტი</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* Clear History Button */}
            {messages.length > 1 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="z-[110]">
                  <AlertDialogHeader>
                    <AlertDialogTitle>ისტორიის წაშლა</AlertDialogTitle>
                    <AlertDialogDescription>
                      ნამდვილად გსურთ ჩატის ისტორიის წაშლა? ეს მოქმედება ვერ გაუქმდება.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>გაუქმება</AlertDialogCancel>
                    <AlertDialogAction onClick={clearHistory} className="bg-destructive hover:bg-destructive/90">
                      წაშლა
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4 bg-background/95" ref={scrollRef}>
          {isLoadingHistory ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    message.role === 'user' ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  {message.role === 'assistant' ? (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  ) : (
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarImage src={profile?.avatar_url || ''} />
                      <AvatarFallback>
                        <User className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-2",
                      message.role === 'user'
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted rounded-bl-md"
                    )}
                  >
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Quick Prompts */}
        {messages.length <= 2 && (
          <div className="px-4 pb-3 bg-card/80 border-t border-border/30">
            <div className="flex flex-wrap gap-2 pt-2">
              {QUICK_PROMPTS.map((prompt, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => handleSend(prompt.text)}
                >
                  <prompt.icon className="w-3 h-3 mr-1" />
                  {prompt.text}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-border/50 bg-card/95 backdrop-blur-sm">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="დაწერეთ შეკითხვა..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={!input.trim() || isLoading}>
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );

  return createPortal(chatContent, document.body);
});

AIChatbot.displayName = 'AIChatbot';

export default AIChatbot;
