// Facebook-style Feeling / Activity data

export interface MoodOption {
  key: string;
  emoji: string;
  label: string;
  thirdPerson?: string; // For feed display: "უყურებს ფილმს" instead of "ფილმს ვუყურებ"
  searchTerms?: string[];
}

export const FEELINGS: MoodOption[] = [
  { key: 'happy', emoji: '😊', label: 'ბედნიერად', searchTerms: ['happy', 'ბედნიერი'] },
  { key: 'sad', emoji: '😢', label: 'სევდიანად', searchTerms: ['sad', 'სევდა'] },
  { key: 'in_love', emoji: '😍', label: 'შეყვარებულად', searchTerms: ['love', 'სიყვარული'] },
  { key: 'angry', emoji: '😡', label: 'გაბრაზებულად', searchTerms: ['angry', 'ბრაზი'] },
  { key: 'cool', emoji: '😎', label: 'მაგრად', searchTerms: ['cool', 'მაგარი'] },
  { key: 'tired', emoji: '😴', label: 'დაღლილად', searchTerms: ['tired', 'დაღლილი'] },
  { key: 'sick', emoji: '🤒', label: 'ცუდად', searchTerms: ['sick', 'ავადმყოფი'] },
  { key: 'excited', emoji: '🤩', label: 'აღფრთოვანებულად', searchTerms: ['excited'] },
  { key: 'celebrating', emoji: '🥳', label: 'ზეიმობს', searchTerms: ['party', 'ზეიმი'] },
  { key: 'grateful', emoji: '😇', label: 'მადლიერი', searchTerms: ['grateful', 'მადლობა'] },
  { key: 'thinking', emoji: '🤔', label: 'დაფიქრებულად', searchTerms: ['thinking'] },
  { key: 'laughing', emoji: '😂', label: 'ეცინება', searchTerms: ['laugh', 'სიცილი'] },
  { key: 'blessed', emoji: '🙏', label: 'მადლიანი', searchTerms: ['blessed'] },
  { key: 'motivated', emoji: '💪', label: 'მოტივირებულად', searchTerms: ['motivated'] },
  { key: 'relaxed', emoji: '😌', label: 'მოდუნებულად', searchTerms: ['relaxed'] },
  { key: 'nostalgic', emoji: '🥹', label: 'ნოსტალგიურად', searchTerms: ['nostalgic'] },
  { key: 'worried', emoji: '😟', label: 'შეშფოთებულად', searchTerms: ['worried'] },
  { key: 'surprised', emoji: '😲', label: 'გაკვირვებულად', searchTerms: ['surprised'] },
];

export const ACTIVITIES: MoodOption[] = [
  { key: 'watching_movie', emoji: '🎬', label: 'ფილმს ვუყურებ', thirdPerson: 'უყურებს ფილმს', searchTerms: ['movie', 'ფილმი'] },
  { key: 'eating', emoji: '🍕', label: 'ვჭამ', thirdPerson: 'ჭამს', searchTerms: ['eat', 'ჭამა', 'საჭმელი'] },
  { key: 'gaming', emoji: '🎮', label: 'ვთამაშობ', thirdPerson: 'თამაშობს', searchTerms: ['game', 'თამაში'] },
  { key: 'listening_music', emoji: '🎧', label: 'მუსიკას ვუსმენ', thirdPerson: 'უსმენს მუსიკას', searchTerms: ['music', 'მუსიკა'] },
  { key: 'exercising', emoji: '🏃', label: 'ვვარჯიშობ', thirdPerson: 'ვარჯიშობს', searchTerms: ['exercise', 'ვარჯიში'] },
  { key: 'reading', emoji: '📚', label: 'ვკითხულობ', thirdPerson: 'კითხულობს', searchTerms: ['read', 'კითხვა', 'წიგნი'] },
  { key: 'traveling', emoji: '✈️', label: 'ვმოგზაურობ', thirdPerson: 'მოგზაურობს', searchTerms: ['travel', 'მოგზაურობა'] },
  { key: 'drinking_coffee', emoji: '☕', label: 'ყავას ვსვამ', thirdPerson: 'სვამს ყავას', searchTerms: ['coffee', 'ყავა'] },
  { key: 'watching_series', emoji: '📺', label: 'სერიალს ვუყურებ', thirdPerson: 'უყურებს სერიალს', searchTerms: ['series', 'სერიალი'] },
  { key: 'resting', emoji: '🛌', label: 'ვისვენებ', thirdPerson: 'ისვენებს', searchTerms: ['rest', 'დასვენება'] },
  { key: 'cooking', emoji: '🍳', label: 'ვამზადებ', thirdPerson: 'ამზადებს', searchTerms: ['cook', 'საჭმელი'] },
  { key: 'studying', emoji: '📖', label: 'ვსწავლობ', thirdPerson: 'სწავლობს', searchTerms: ['study', 'სწავლა'] },
  { key: 'working', emoji: '💼', label: 'ვმუშაობ', thirdPerson: 'მუშაობს', searchTerms: ['work', 'სამსახური'] },
  { key: 'shopping', emoji: '🛍️', label: 'ვყიდულობ', thirdPerson: 'ყიდულობს', searchTerms: ['shop', 'შოპინგი'] },
  { key: 'driving', emoji: '🚗', label: 'ვმგზავრობ', thirdPerson: 'მგზავრობს', searchTerms: ['drive', 'მანქანა'] },
  { key: 'singing', emoji: '🎤', label: 'ვმღერი', thirdPerson: 'მღერის', searchTerms: ['sing', 'სიმღერა'] },
];

export interface SelectedMood {
  type: 'feeling' | 'activity';
  key: string;
  emoji: string;
  label: string;
  objectText?: string;
}

export const formatMoodDisplay = (mood: SelectedMood): string => {
  if (mood.type === 'feeling') {
    return `${mood.emoji} ${mood.label}`;
  }
  const suffix = mood.objectText ? ` — ${mood.objectText}` : '';
  return `${mood.emoji} ${mood.label}${suffix}`;
};

// Build Facebook-style sentence for feed display (third person)
export const buildMoodSentence = (moodEmoji: string, moodText: string, moodType?: string): string => {
  const textWithoutEmoji = moodText.replace(moodEmoji + ' ', '').replace(/\s*—.*$/, '');
  const customSuffix = moodText.includes(' — ') ? ' — ' + moodText.split(' — ').slice(1).join(' — ') : '';
  
  if (moodType === 'feeling') {
    return `თავს გრძნობს ${textWithoutEmoji}${customSuffix}`;
  }
  
  if (moodType === 'activity') {
    // Find the activity by matching label to get thirdPerson
    const activity = ACTIVITIES.find(a => a.emoji === moodEmoji && textWithoutEmoji.includes(a.label));
    if (activity?.thirdPerson) {
      return `${activity.thirdPerson}${customSuffix}`;
    }
  }
  
  // Fallback
  return textWithoutEmoji || moodText;
};
