export type UserRole = 'ADMIN' | 'TEACHER' | 'STUDENT';

export interface User {
  id: number;
  email: string;
  username: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Subject {
  id: number;
  name: string;
  code: string;
  description?: string;
  created_at: string;
}

export interface Course {
  id: number;
  code: string;
  name: string;
  description?: string;
  academic_term: string;
  teacher_id: number;
  teacher_name?: string;
  status: string;
  enrolled_count: number;
  created_at: string;
}

export type QuestionType = 'MCQ_SINGLE' | 'MCQ_MULTIPLE' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'ESSAY';
export type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD';

export interface QuestionOption {
  id: number;
  option_text: string;
  is_correct?: boolean;
  order_index: number;
}

export interface Question {
  id: number;
  teacher_id: number;
  subject_id?: number;
  course_id?: number;
  topic: string;
  difficulty: DifficultyLevel;
  question_type: QuestionType;
  question_text: string;
  marks: number;
  explanation?: string;
  model_answer?: string;
  options: QuestionOption[];
  created_at: string;
}

export interface Examination {
  id: number;
  title: string;
  description?: string;
  course_id: number;
  course_name?: string;
  teacher_id?: number;
  teacher_name?: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  total_marks: number;
  passing_marks: number;
  randomize_questions?: boolean;
  randomize_options?: boolean;
  max_attempts?: number;
  negative_marking?: boolean;
  negative_mark_value?: number;
  partial_credit?: boolean;
  instructions?: string;
  is_published: boolean;
  results_published: boolean;
  question_count?: number;
  status_label: string;
  has_attempted?: boolean;
  attempt_status?: string;
  attempt_id?: number;
  score_obtained?: number;
}

export interface AttemptAnswer {
  selected_option_ids: number[];
  text_response?: string;
  is_marked_for_review: boolean;
  is_evaluated?: boolean;
  marks_awarded?: number;
  feedback?: string;
}

export interface ActiveExamAttemptState {
  attempt: {
    id: number;
    exam_id: number;
    exam_title: string;
    student_id: number;
    student_name: string;
    attempt_number: number;
    status: 'IN_PROGRESS' | 'SUBMITTED' | 'EVALUATED' | 'EXPIRED';
    started_at: string;
    deadline: string;
    remaining_seconds: number;
    submitted_at?: string;
    score_obtained: number;
    percentage: number;
    passed: boolean;
    total_marks: number;
  };
  questions: {
    id: number;
    topic: string;
    difficulty: DifficultyLevel;
    question_type: QuestionType;
    question_text: string;
    marks: number;
    order_index: number;
    options: {
      id: number;
      option_text: string;
      order_index: number;
    }[];
  }[];
  answers: Record<number, AttemptAnswer>;
}

export interface NotificationItem {
  id: number;
  user_id: number;
  title: string;
  message: string;
  notification_type: 'INFO' | 'EXAM_ASSIGNED' | 'RESULT_PUBLISHED' | 'SYSTEM';
  link_url?: string;
  is_read: boolean;
  created_at: string;
}

export interface AuditLogItem {
  id: number;
  user_id?: number;
  user_name?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: any;
  ip_address?: string;
  created_at: string;
}
