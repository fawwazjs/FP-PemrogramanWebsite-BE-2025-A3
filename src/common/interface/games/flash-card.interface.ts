export interface IFlashCardItem {
  question_type: 'text' | 'image';
  question_text: string | null;
  question_image: string | null;
  back_type: 'text' | 'image';
  answer_text: string;
  back_image: string | null;
  is_correct: boolean;
}

export interface IFlashCard {
  id?: string;
  title: string;
  description?: string | null;
  thumbnail?: string | null;
  settings?: Record<string, unknown> | null;
  is_published?: boolean;
  total_played?: number;
  items: IFlashCardItem[];
}

export interface IFlashCardCreatePayloadProps {
  title: string;
  description?: string | null;
  settings?: Record<string, unknown> | null;
  items: IFlashCardItem[];
}
