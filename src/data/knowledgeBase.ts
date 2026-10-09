import coachKnowledge from '../../ml-service/data/knowledge_base.json';

export type KnowledgeDoc = {
  id: string;
  title: string;
  intent: string;
  topic?: string;
  category?: string;
  tags: string[];
  questions: string[];
  content: string;
  follow_up_questions?: string[];
  related_topics?: string[];
  source?: string[];
  safety_level?: string;
  answer_type?: string;
};

export const KNOWLEDGE_BASE: KnowledgeDoc[] = coachKnowledge.docs;
