export enum AppScreen {
  WELCOME = 'WELCOME',
  PRE_CHECKIN = 'PRE_CHECKIN',
  EXERCISE = 'EXERCISE',
  GENERATING = 'GENERATING',
  POST_CHECKIN = 'POST_CHECKIN',
  RESULT = 'RESULT',
  JOURNAL = 'JOURNAL',
  JOURNAL_DETAIL = 'JOURNAL_DETAIL',
  SETTINGS = 'SETTINGS',
}

export enum SenseType {
  SEE = 'SEE',
  HEAR = 'HEAR',
  TOUCH = 'TOUCH',
  SMELL = 'SMELL',
  TASTE = 'TASTE',
}

export interface GroundingData {
  [SenseType.SEE]: string;
  [SenseType.HEAR]: string;
  [SenseType.TOUCH]: string;
  [SenseType.SMELL]: string;
  [SenseType.TASTE]: string;
}

export interface JournalEntry {
  id: string;
  timestamp: number;
  data: GroundingData;
  preMood: number;
  postMood: number;
  imageUrl?: string; // Base64 or URL
}

export const SENSE_CONFIG: Record<SenseType, { label: string; count: number; instruction: string; color: string }> = {
  [SenseType.SEE]: { 
    label: 'See', 
    count: 5, 
    instruction: 'Look around and name 5 things you can see.', 
    color: 'bg-sage-400' 
  },
  [SenseType.HEAR]: { 
    label: 'Hear', 
    count: 4, 
    instruction: 'Close your eyes if you like. Name 4 things you can hear.', 
    color: 'bg-sage-300' 
  },
  [SenseType.TOUCH]: { 
    label: 'Touch', 
    count: 3, 
    instruction: 'Notice your body. Name 3 things you can touch or feel.', 
    color: 'bg-lavender-300' 
  },
  [SenseType.SMELL]: { 
    label: 'Smell', 
    count: 2, 
    instruction: 'Name 2 things you can smell right now.', 
    color: 'bg-lavender-400' 
  },
  [SenseType.TASTE]: { 
    label: 'Taste', 
    count: 1, 
    instruction: 'Name 1 thing you can taste.', 
    color: 'bg-terracotta' 
  },
};