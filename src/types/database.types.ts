/**
 * Types de la base de données.
 *
 * Ce fichier reflète les migrations de `supabase/migrations/`. Une fois le
 * projet Supabase créé, il est REMPLACÉ par la sortie de :
 *
 *   npx supabase gen types typescript --project-id <ref> --schema public \
 *     > src/types/database.types.ts
 *
 * Ne pas l'éditer à la main autrement.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          first_name: string | null;
          last_name: string | null;
          avatar_url: string | null;
          role: Database['public']['Enums']['user_role'];
          level_id: string | null;
          bio: string | null;
          xp: number;
          streak_current: number;
          streak_longest: number;
          last_activity_date: string | null;
          onboarding_done: boolean;
          is_active: boolean;
          timezone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          first_name?: string | null;
          last_name?: string | null;
          avatar_url?: string | null;
          role?: Database['public']['Enums']['user_role'];
          level_id?: string | null;
          bio?: string | null;
          xp?: number;
          streak_current?: number;
          streak_longest?: number;
          last_activity_date?: string | null;
          onboarding_done?: boolean;
          is_active?: boolean;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          first_name?: string | null;
          last_name?: string | null;
          avatar_url?: string | null;
          role?: Database['public']['Enums']['user_role'];
          level_id?: string | null;
          bio?: string | null;
          xp?: number;
          streak_current?: number;
          streak_longest?: number;
          last_activity_date?: string | null;
          onboarding_done?: boolean;
          is_active?: boolean;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_level_id_fkey';
            columns: ['level_id'];
            isOneToOne: false;
            referencedRelation: 'levels';
            referencedColumns: ['id'];
          },
        ];
      };
      levels: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          sort_order: number;
          status: Database['public']['Enums']['content_status'];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description?: string | null;
          sort_order?: number;
          status?: Database['public']['Enums']['content_status'];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          description?: string | null;
          sort_order?: number;
          status?: Database['public']['Enums']['content_status'];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      subjects: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          icon: string | null;
          color: string | null;
          sort_order: number;
          status: Database['public']['Enums']['content_status'];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description?: string | null;
          icon?: string | null;
          color?: string | null;
          sort_order?: number;
          status?: Database['public']['Enums']['content_status'];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          description?: string | null;
          icon?: string | null;
          color?: string | null;
          sort_order?: number;
          status?: Database['public']['Enums']['content_status'];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      level_subjects: {
        Row: {
          level_id: string;
          subject_id: string;
          sort_order: number;
        };
        Insert: {
          level_id: string;
          subject_id: string;
          sort_order?: number;
        };
        Update: {
          level_id?: string;
          subject_id?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'level_subjects_level_id_fkey';
            columns: ['level_id'];
            isOneToOne: false;
            referencedRelation: 'levels';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'level_subjects_subject_id_fkey';
            columns: ['subject_id'];
            isOneToOne: false;
            referencedRelation: 'subjects';
            referencedColumns: ['id'];
          },
        ];
      };
      courses: {
        Row: {
          id: string;
          slug: string;
          title: string;
          summary: string | null;
          description: string | null;
          thumbnail_url: string | null;
          level_id: string;
          subject_id: string;
          difficulty: Database['public']['Enums']['difficulty_level'];
          lessons_count: number;
          duration_seconds: number;
          sort_order: number;
          status: Database['public']['Enums']['content_status'];
          published_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          summary?: string | null;
          description?: string | null;
          thumbnail_url?: string | null;
          level_id: string;
          subject_id: string;
          difficulty?: Database['public']['Enums']['difficulty_level'];
          lessons_count?: number;
          duration_seconds?: number;
          sort_order?: number;
          status?: Database['public']['Enums']['content_status'];
          published_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          summary?: string | null;
          description?: string | null;
          thumbnail_url?: string | null;
          level_id?: string;
          subject_id?: string;
          difficulty?: Database['public']['Enums']['difficulty_level'];
          lessons_count?: number;
          duration_seconds?: number;
          sort_order?: number;
          status?: Database['public']['Enums']['content_status'];
          published_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'courses_level_id_fkey';
            columns: ['level_id'];
            isOneToOne: false;
            referencedRelation: 'levels';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'courses_subject_id_fkey';
            columns: ['subject_id'];
            isOneToOne: false;
            referencedRelation: 'subjects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'courses_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      modules: {
        Row: {
          id: string;
          course_id: string;
          title: string;
          description: string | null;
          sort_order: number;
          status: Database['public']['Enums']['content_status'];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          title: string;
          description?: string | null;
          sort_order?: number;
          status?: Database['public']['Enums']['content_status'];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          title?: string;
          description?: string | null;
          sort_order?: number;
          status?: Database['public']['Enums']['content_status'];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'modules_course_id_fkey';
            columns: ['course_id'];
            isOneToOne: false;
            referencedRelation: 'courses';
            referencedColumns: ['id'];
          },
        ];
      };
      chapters: {
        Row: {
          id: string;
          module_id: string;
          course_id: string;
          title: string;
          description: string | null;
          sort_order: number;
          status: Database['public']['Enums']['content_status'];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          module_id: string;
          course_id?: string;
          title: string;
          description?: string | null;
          sort_order?: number;
          status?: Database['public']['Enums']['content_status'];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          module_id?: string;
          course_id?: string;
          title?: string;
          description?: string | null;
          sort_order?: number;
          status?: Database['public']['Enums']['content_status'];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'chapters_module_id_fkey';
            columns: ['module_id'];
            isOneToOne: false;
            referencedRelation: 'modules';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'chapters_course_id_fkey';
            columns: ['course_id'];
            isOneToOne: false;
            referencedRelation: 'courses';
            referencedColumns: ['id'];
          },
        ];
      };
      lessons: {
        Row: {
          id: string;
          chapter_id: string;
          module_id: string;
          course_id: string;
          slug: string;
          title: string;
          description: string | null;
          content_md: string | null;
          duration_seconds: number;
          sort_order: number;
          is_free_preview: boolean;
          status: Database['public']['Enums']['content_status'];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          chapter_id: string;
          module_id?: string;
          course_id?: string;
          slug: string;
          title: string;
          description?: string | null;
          content_md?: string | null;
          duration_seconds?: number;
          sort_order?: number;
          is_free_preview?: boolean;
          status?: Database['public']['Enums']['content_status'];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          chapter_id?: string;
          module_id?: string;
          course_id?: string;
          slug?: string;
          title?: string;
          description?: string | null;
          content_md?: string | null;
          duration_seconds?: number;
          sort_order?: number;
          is_free_preview?: boolean;
          status?: Database['public']['Enums']['content_status'];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'lessons_chapter_id_fkey';
            columns: ['chapter_id'];
            isOneToOne: false;
            referencedRelation: 'chapters';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lessons_module_id_fkey';
            columns: ['module_id'];
            isOneToOne: false;
            referencedRelation: 'modules';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lessons_course_id_fkey';
            columns: ['course_id'];
            isOneToOne: false;
            referencedRelation: 'courses';
            referencedColumns: ['id'];
          },
        ];
      };
      videos: {
        Row: {
          id: string;
          lesson_id: string;
          title: string;
          description: string | null;
          provider: Database['public']['Enums']['video_provider'];
          external_id: string | null;
          url: string | null;
          thumbnail_url: string | null;
          duration_seconds: number;
          sort_order: number;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          lesson_id: string;
          title: string;
          description?: string | null;
          provider?: Database['public']['Enums']['video_provider'];
          external_id?: string | null;
          url?: string | null;
          thumbnail_url?: string | null;
          duration_seconds?: number;
          sort_order?: number;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          lesson_id?: string;
          title?: string;
          description?: string | null;
          provider?: Database['public']['Enums']['video_provider'];
          external_id?: string | null;
          url?: string | null;
          thumbnail_url?: string | null;
          duration_seconds?: number;
          sort_order?: number;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'videos_lesson_id_fkey';
            columns: ['lesson_id'];
            isOneToOne: false;
            referencedRelation: 'lessons';
            referencedColumns: ['id'];
          },
        ];
      };
      resources: {
        Row: {
          id: string;
          lesson_id: string | null;
          course_id: string | null;
          type: Database['public']['Enums']['resource_type'];
          title: string;
          description: string | null;
          url: string | null;
          storage_path: string | null;
          file_size: number | null;
          mime_type: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          lesson_id?: string | null;
          course_id?: string | null;
          type: Database['public']['Enums']['resource_type'];
          title: string;
          description?: string | null;
          url?: string | null;
          storage_path?: string | null;
          file_size?: number | null;
          mime_type?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          lesson_id?: string | null;
          course_id?: string | null;
          type?: Database['public']['Enums']['resource_type'];
          title?: string;
          description?: string | null;
          url?: string | null;
          storage_path?: string | null;
          file_size?: number | null;
          mime_type?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'resources_lesson_id_fkey';
            columns: ['lesson_id'];
            isOneToOne: false;
            referencedRelation: 'lessons';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'resources_course_id_fkey';
            columns: ['course_id'];
            isOneToOne: false;
            referencedRelation: 'courses';
            referencedColumns: ['id'];
          },
        ];
      };
      quizzes: {
        Row: {
          id: string;
          scope: Database['public']['Enums']['quiz_scope'];
          lesson_id: string | null;
          chapter_id: string | null;
          course_id: string;
          title: string;
          description: string | null;
          passing_score: number;
          max_attempts: number | null;
          time_limit_seconds: number | null;
          shuffle_questions: boolean;
          show_explanations: boolean;
          sort_order: number;
          status: Database['public']['Enums']['content_status'];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          scope?: Database['public']['Enums']['quiz_scope'];
          lesson_id?: string | null;
          chapter_id?: string | null;
          course_id?: string;
          title: string;
          description?: string | null;
          passing_score?: number;
          max_attempts?: number | null;
          time_limit_seconds?: number | null;
          shuffle_questions?: boolean;
          show_explanations?: boolean;
          sort_order?: number;
          status?: Database['public']['Enums']['content_status'];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          scope?: Database['public']['Enums']['quiz_scope'];
          lesson_id?: string | null;
          chapter_id?: string | null;
          course_id?: string;
          title?: string;
          description?: string | null;
          passing_score?: number;
          max_attempts?: number | null;
          time_limit_seconds?: number | null;
          shuffle_questions?: boolean;
          show_explanations?: boolean;
          sort_order?: number;
          status?: Database['public']['Enums']['content_status'];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'quizzes_lesson_id_fkey';
            columns: ['lesson_id'];
            isOneToOne: false;
            referencedRelation: 'lessons';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'quizzes_chapter_id_fkey';
            columns: ['chapter_id'];
            isOneToOne: false;
            referencedRelation: 'chapters';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'quizzes_course_id_fkey';
            columns: ['course_id'];
            isOneToOne: false;
            referencedRelation: 'courses';
            referencedColumns: ['id'];
          },
        ];
      };
      questions: {
        Row: {
          id: string;
          quiz_id: string;
          type: Database['public']['Enums']['question_type'];
          prompt: string;
          explanation: string | null;
          media_url: string | null;
          points: number;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          quiz_id: string;
          type: Database['public']['Enums']['question_type'];
          prompt: string;
          explanation?: string | null;
          media_url?: string | null;
          points?: number;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          quiz_id?: string;
          type?: Database['public']['Enums']['question_type'];
          prompt?: string;
          explanation?: string | null;
          media_url?: string | null;
          points?: number;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'questions_quiz_id_fkey';
            columns: ['quiz_id'];
            isOneToOne: false;
            referencedRelation: 'quizzes';
            referencedColumns: ['id'];
          },
        ];
      };
      answers: {
        Row: {
          id: string;
          question_id: string;
          label: string;
          is_correct: boolean;
          match_pattern: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          question_id: string;
          label: string;
          is_correct?: boolean;
          match_pattern?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          question_id?: string;
          label?: string;
          is_correct?: boolean;
          match_pattern?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'answers_question_id_fkey';
            columns: ['question_id'];
            isOneToOne: false;
            referencedRelation: 'questions';
            referencedColumns: ['id'];
          },
        ];
      };
      quiz_attempts: {
        Row: {
          id: string;
          user_id: string;
          quiz_id: string;
          attempt_number: number;
          score: number;
          max_score: number;
          percentage: number;
          passed: boolean;
          started_at: string;
          submitted_at: string | null;
          duration_seconds: number | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          quiz_id: string;
          attempt_number: number;
          score?: number;
          max_score?: number;
          percentage?: number;
          passed?: boolean;
          started_at?: string;
          submitted_at?: string | null;
          duration_seconds?: number | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          quiz_id?: string;
          attempt_number?: number;
          score?: number;
          max_score?: number;
          percentage?: number;
          passed?: boolean;
          started_at?: string;
          submitted_at?: string | null;
          duration_seconds?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'quiz_attempts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'quiz_attempts_quiz_id_fkey';
            columns: ['quiz_id'];
            isOneToOne: false;
            referencedRelation: 'quizzes';
            referencedColumns: ['id'];
          },
        ];
      };
      quiz_attempt_answers: {
        Row: {
          id: string;
          attempt_id: string;
          question_id: string;
          selected_answer_ids: string[];
          text_answer: string | null;
          is_correct: boolean;
          points_awarded: number;
        };
        Insert: {
          id?: string;
          attempt_id: string;
          question_id: string;
          selected_answer_ids?: string[];
          text_answer?: string | null;
          is_correct?: boolean;
          points_awarded?: number;
        };
        Update: {
          id?: string;
          attempt_id?: string;
          question_id?: string;
          selected_answer_ids?: string[];
          text_answer?: string | null;
          is_correct?: boolean;
          points_awarded?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'quiz_attempt_answers_attempt_id_fkey';
            columns: ['attempt_id'];
            isOneToOne: false;
            referencedRelation: 'quiz_attempts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'quiz_attempt_answers_question_id_fkey';
            columns: ['question_id'];
            isOneToOne: false;
            referencedRelation: 'questions';
            referencedColumns: ['id'];
          },
        ];
      };
      exercises: {
        Row: {
          id: string;
          lesson_id: string;
          kind: Database['public']['Enums']['exercise_kind'];
          title: string;
          statement_md: string;
          media_url: string | null;
          attachment_path: string | null;
          expected_answer: string | null;
          tolerance: number | null;
          solution_md: string | null;
          explanation_md: string | null;
          difficulty: Database['public']['Enums']['difficulty_level'];
          sort_order: number;
          status: Database['public']['Enums']['content_status'];
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          lesson_id: string;
          kind?: Database['public']['Enums']['exercise_kind'];
          title: string;
          statement_md: string;
          media_url?: string | null;
          attachment_path?: string | null;
          expected_answer?: string | null;
          tolerance?: number | null;
          solution_md?: string | null;
          explanation_md?: string | null;
          difficulty?: Database['public']['Enums']['difficulty_level'];
          sort_order?: number;
          status?: Database['public']['Enums']['content_status'];
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          lesson_id?: string;
          kind?: Database['public']['Enums']['exercise_kind'];
          title?: string;
          statement_md?: string;
          media_url?: string | null;
          attachment_path?: string | null;
          expected_answer?: string | null;
          tolerance?: number | null;
          solution_md?: string | null;
          explanation_md?: string | null;
          difficulty?: Database['public']['Enums']['difficulty_level'];
          sort_order?: number;
          status?: Database['public']['Enums']['content_status'];
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'exercises_lesson_id_fkey';
            columns: ['lesson_id'];
            isOneToOne: false;
            referencedRelation: 'lessons';
            referencedColumns: ['id'];
          },
        ];
      };
      exercise_attempts: {
        Row: {
          id: string;
          user_id: string;
          exercise_id: string;
          response_text: string | null;
          response_path: string | null;
          is_correct: boolean | null;
          self_assessment: number | null;
          submitted_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          exercise_id: string;
          response_text?: string | null;
          response_path?: string | null;
          is_correct?: boolean | null;
          self_assessment?: number | null;
          submitted_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          exercise_id?: string;
          response_text?: string | null;
          response_path?: string | null;
          is_correct?: boolean | null;
          self_assessment?: number | null;
          submitted_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'exercise_attempts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'exercise_attempts_exercise_id_fkey';
            columns: ['exercise_id'];
            isOneToOne: false;
            referencedRelation: 'exercises';
            referencedColumns: ['id'];
          },
        ];
      };
      video_progress: {
        Row: {
          id: string;
          user_id: string;
          video_id: string;
          lesson_id: string;
          position_seconds: number;
          watched_seconds: number;
          duration_seconds: number;
          percent: number;
          completed: boolean;
          last_watched_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          video_id: string;
          lesson_id: string;
          position_seconds?: number;
          watched_seconds?: number;
          duration_seconds?: number;
          percent?: number;
          completed?: boolean;
          last_watched_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          video_id?: string;
          lesson_id?: string;
          position_seconds?: number;
          watched_seconds?: number;
          duration_seconds?: number;
          percent?: number;
          completed?: boolean;
          last_watched_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'video_progress_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'video_progress_video_id_fkey';
            columns: ['video_id'];
            isOneToOne: false;
            referencedRelation: 'videos';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'video_progress_lesson_id_fkey';
            columns: ['lesson_id'];
            isOneToOne: false;
            referencedRelation: 'lessons';
            referencedColumns: ['id'];
          },
        ];
      };
      lesson_progress: {
        Row: {
          id: string;
          user_id: string;
          lesson_id: string;
          course_id: string;
          status: Database['public']['Enums']['progress_status'];
          time_spent_seconds: number;
          last_viewed_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          lesson_id: string;
          course_id: string;
          status?: Database['public']['Enums']['progress_status'];
          time_spent_seconds?: number;
          last_viewed_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          lesson_id?: string;
          course_id?: string;
          status?: Database['public']['Enums']['progress_status'];
          time_spent_seconds?: number;
          last_viewed_at?: string;
          completed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'lesson_progress_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lesson_progress_lesson_id_fkey';
            columns: ['lesson_id'];
            isOneToOne: false;
            referencedRelation: 'lessons';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lesson_progress_course_id_fkey';
            columns: ['course_id'];
            isOneToOne: false;
            referencedRelation: 'courses';
            referencedColumns: ['id'];
          },
        ];
      };
      course_progress: {
        Row: {
          id: string;
          user_id: string;
          course_id: string;
          lessons_completed: number;
          lessons_total: number;
          percent: number;
          status: Database['public']['Enums']['progress_status'];
          last_lesson_id: string | null;
          started_at: string;
          last_activity_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id: string;
          lessons_completed?: number;
          lessons_total?: number;
          percent?: number;
          status?: Database['public']['Enums']['progress_status'];
          last_lesson_id?: string | null;
          started_at?: string;
          last_activity_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          course_id?: string;
          lessons_completed?: number;
          lessons_total?: number;
          percent?: number;
          status?: Database['public']['Enums']['progress_status'];
          last_lesson_id?: string | null;
          started_at?: string;
          last_activity_at?: string;
          completed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'course_progress_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'course_progress_course_id_fkey';
            columns: ['course_id'];
            isOneToOne: false;
            referencedRelation: 'courses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'course_progress_last_lesson_id_fkey';
            columns: ['last_lesson_id'];
            isOneToOne: false;
            referencedRelation: 'lessons';
            referencedColumns: ['id'];
          },
        ];
      };
      study_sessions: {
        Row: {
          id: string;
          user_id: string;
          course_id: string | null;
          lesson_id: string | null;
          started_at: string;
          ended_at: string | null;
          duration_seconds: number;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id?: string | null;
          lesson_id?: string | null;
          started_at?: string;
          ended_at?: string | null;
          duration_seconds?: number;
        };
        Update: {
          id?: string;
          user_id?: string;
          course_id?: string | null;
          lesson_id?: string | null;
          started_at?: string;
          ended_at?: string | null;
          duration_seconds?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'study_sessions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'study_sessions_course_id_fkey';
            columns: ['course_id'];
            isOneToOne: false;
            referencedRelation: 'courses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'study_sessions_lesson_id_fkey';
            columns: ['lesson_id'];
            isOneToOne: false;
            referencedRelation: 'lessons';
            referencedColumns: ['id'];
          },
        ];
      };
      notes: {
        Row: {
          id: string;
          user_id: string;
          lesson_id: string;
          video_id: string | null;
          timestamp_seconds: number | null;
          content: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          lesson_id: string;
          video_id?: string | null;
          timestamp_seconds?: number | null;
          content: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          lesson_id?: string;
          video_id?: string | null;
          timestamp_seconds?: number | null;
          content?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notes_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notes_lesson_id_fkey';
            columns: ['lesson_id'];
            isOneToOne: false;
            referencedRelation: 'lessons';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notes_video_id_fkey';
            columns: ['video_id'];
            isOneToOne: false;
            referencedRelation: 'videos';
            referencedColumns: ['id'];
          },
        ];
      };
      favorites: {
        Row: {
          id: string;
          user_id: string;
          course_id: string | null;
          lesson_id: string | null;
          video_id: string | null;
          resource_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id?: string | null;
          lesson_id?: string | null;
          video_id?: string | null;
          resource_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          course_id?: string | null;
          lesson_id?: string | null;
          video_id?: string | null;
          resource_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'favorites_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'favorites_course_id_fkey';
            columns: ['course_id'];
            isOneToOne: false;
            referencedRelation: 'courses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'favorites_lesson_id_fkey';
            columns: ['lesson_id'];
            isOneToOne: false;
            referencedRelation: 'lessons';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'favorites_video_id_fkey';
            columns: ['video_id'];
            isOneToOne: false;
            referencedRelation: 'videos';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'favorites_resource_id_fkey';
            columns: ['resource_id'];
            isOneToOne: false;
            referencedRelation: 'resources';
            referencedColumns: ['id'];
          },
        ];
      };
      badges: {
        Row: {
          id: string;
          code: string;
          name: string;
          description: string;
          icon: string;
          category: string;
          criteria: Json;
          xp_reward: number;
          sort_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          description: string;
          icon: string;
          category?: string;
          criteria: Json;
          xp_reward?: number;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          description?: string;
          icon?: string;
          category?: string;
          criteria?: Json;
          xp_reward?: number;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      user_badges: {
        Row: {
          user_id: string;
          badge_id: string;
          earned_at: string;
        };
        Insert: {
          user_id: string;
          badge_id: string;
          earned_at?: string;
        };
        Update: {
          user_id?: string;
          badge_id?: string;
          earned_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_badges_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_badges_badge_id_fkey';
            columns: ['badge_id'];
            isOneToOne: false;
            referencedRelation: 'badges';
            referencedColumns: ['id'];
          },
        ];
      };
      xp_events: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          reason: Database['public']['Enums']['xp_reason'];
          source_table: string | null;
          source_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          reason: Database['public']['Enums']['xp_reason'];
          source_table?: string | null;
          source_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          amount?: number;
          reason?: Database['public']['Enums']['xp_reason'];
          source_table?: string | null;
          source_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'xp_events_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      goals: {
        Row: {
          id: string;
          user_id: string;
          type: Database['public']['Enums']['goal_type'];
          target_value: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: Database['public']['Enums']['goal_type'];
          target_value: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: Database['public']['Enums']['goal_type'];
          target_value?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'goals_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      goal_periods: {
        Row: {
          id: string;
          goal_id: string;
          user_id: string;
          period_start: string;
          period_end: string;
          achieved_value: number;
          target_value: number;
          achieved: boolean;
        };
        Insert: {
          id?: string;
          goal_id: string;
          user_id: string;
          period_start: string;
          period_end: string;
          achieved_value?: number;
          target_value: number;
          achieved?: boolean;
        };
        Update: {
          id?: string;
          goal_id?: string;
          user_id?: string;
          period_start?: string;
          period_end?: string;
          achieved_value?: number;
          target_value?: number;
          achieved?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'goal_periods_goal_id_fkey';
            columns: ['goal_id'];
            isOneToOne: false;
            referencedRelation: 'goals';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'goal_periods_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: Database['public']['Enums']['notification_type'];
          title: string;
          body: string | null;
          link_url: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: Database['public']['Enums']['notification_type'];
          title: string;
          body?: string | null;
          link_url?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: Database['public']['Enums']['notification_type'];
          title?: string;
          body?: string | null;
          link_url?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      notification_preferences: {
        Row: {
          user_id: string;
          new_course: boolean;
          new_lesson: boolean;
          new_quiz: boolean;
          goal_reached: boolean;
          badge_earned: boolean;
          study_reminder: boolean;
          email_enabled: boolean;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          new_course?: boolean;
          new_lesson?: boolean;
          new_quiz?: boolean;
          goal_reached?: boolean;
          badge_earned?: boolean;
          study_reminder?: boolean;
          email_enabled?: boolean;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          new_course?: boolean;
          new_lesson?: boolean;
          new_quiz?: boolean;
          goal_reached?: boolean;
          badge_earned?: boolean;
          study_reminder?: boolean;
          email_enabled?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notification_preferences_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      user_subject_interests: {
        Row: {
          user_id: string;
          subject_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          subject_id: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          subject_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_subject_interests_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_subject_interests_subject_id_fkey';
            columns: ['subject_id'];
            isOneToOne: false;
            referencedRelation: 'subjects';
            referencedColumns: ['id'];
          },
        ];
      };
      access_codes: {
        Row: {
          id: string;
          code: string;
          label: string | null;
          scope: Database['public']['Enums']['access_scope'];
          course_id: string | null;
          subject_id: string | null;
          max_uses: number;
          uses_count: number;
          access_days: number | null;
          expires_at: string | null;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          label?: string | null;
          scope?: Database['public']['Enums']['access_scope'];
          course_id?: string | null;
          subject_id?: string | null;
          max_uses?: number;
          uses_count?: number;
          access_days?: number | null;
          expires_at?: string | null;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          label?: string | null;
          scope?: Database['public']['Enums']['access_scope'];
          course_id?: string | null;
          subject_id?: string | null;
          max_uses?: number;
          uses_count?: number;
          access_days?: number | null;
          expires_at?: string | null;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'access_codes_course_id_fkey';
            columns: ['course_id'];
            isOneToOne: false;
            referencedRelation: 'courses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'access_codes_subject_id_fkey';
            columns: ['subject_id'];
            isOneToOne: false;
            referencedRelation: 'subjects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'access_codes_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      enrollments: {
        Row: {
          id: string;
          user_id: string;
          scope: Database['public']['Enums']['access_scope'];
          course_id: string | null;
          subject_id: string | null;
          source: string;
          granted_by: string | null;
          code_id: string | null;
          granted_at: string;
          expires_at: string | null;
          revoked_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          scope: Database['public']['Enums']['access_scope'];
          course_id?: string | null;
          subject_id?: string | null;
          source?: string;
          granted_by?: string | null;
          code_id?: string | null;
          granted_at?: string;
          expires_at?: string | null;
          revoked_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          scope?: Database['public']['Enums']['access_scope'];
          course_id?: string | null;
          subject_id?: string | null;
          source?: string;
          granted_by?: string | null;
          code_id?: string | null;
          granted_at?: string;
          expires_at?: string | null;
          revoked_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'enrollments_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'enrollments_course_id_fkey';
            columns: ['course_id'];
            isOneToOne: false;
            referencedRelation: 'courses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'enrollments_subject_id_fkey';
            columns: ['subject_id'];
            isOneToOne: false;
            referencedRelation: 'subjects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'enrollments_code_id_fkey';
            columns: ['code_id'];
            isOneToOne: false;
            referencedRelation: 'access_codes';
            referencedColumns: ['id'];
          },
        ];
      };
      code_redemptions: {
        Row: {
          id: string;
          code_id: string;
          user_id: string;
          redeemed_at: string;
        };
        Insert: {
          id?: string;
          code_id: string;
          user_id: string;
          redeemed_at?: string;
        };
        Update: {
          id?: string;
          code_id?: string;
          user_id?: string;
          redeemed_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'code_redemptions_code_id_fkey';
            columns: ['code_id'];
            isOneToOne: false;
            referencedRelation: 'access_codes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'code_redemptions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      v_chapter_progress: {
        Row: {
          user_id: string | null;
          chapter_id: string | null;
          course_id: string | null;
          lessons_total: number | null;
          lessons_completed: number | null;
          completed: boolean | null;
        };
        Relationships: [];
      };
      v_module_progress: {
        Row: {
          user_id: string | null;
          module_id: string | null;
          course_id: string | null;
          lessons_total: number | null;
          lessons_completed: number | null;
          completed: boolean | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      has_course_access: { Args: { p_course_id: string }; Returns: boolean };
      get_lesson_content: { Args: { p_lesson_id: string }; Returns: string };
      redeem_access_code: { Args: { p_code: string }; Returns: Json };
      generate_access_codes: {
        Args: {
          p_count: number;
          p_scope?: Database['public']['Enums']['access_scope'];
          p_course_id?: string | null;
          p_subject_id?: string | null;
          p_max_uses?: number;
          p_access_days?: number | null;
          p_label?: string | null;
        };
        Returns: Database['public']['Tables']['access_codes']['Row'][];
      };
      submit_quiz_attempt: { Args: { p_quiz_id: string; p_responses: Json }; Returns: Json };
      upsert_video_progress: {
        Args: { p_video_id: string; p_position: number; p_watched?: number };
        Returns: Json;
      };
      set_lesson_completed: { Args: { p_lesson_id: string; p_completed?: boolean }; Returns: Json };
      record_study_time: {
        Args: { p_seconds: number; p_course_id?: string | null; p_lesson_id?: string | null };
        Returns: undefined;
      };
      reorder_entities: {
        Args: { p_entity: string; p_parent_id: string | null; p_ordered_ids: string[] };
        Returns: undefined;
      };
      check_badges: { Args: { p_user_id: string }; Returns: number };
      is_staff: { Args: Record<string, never>; Returns: boolean };
      is_admin: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: {
      user_role: 'student' | 'teacher' | 'admin';
      content_status: 'draft' | 'published' | 'archived';
      difficulty_level: 'beginner' | 'intermediate' | 'advanced';
      video_provider: 'native' | 'youtube' | 'google_drive' | 'cloudflare_stream' | 'vimeo';
      resource_type: 'pdf' | 'document' | 'image' | 'link' | 'file' | 'archive';
      question_type: 'single_choice' | 'multiple_choice' | 'true_false' | 'short_answer';
      quiz_scope: 'lesson' | 'chapter' | 'course';
      progress_status: 'not_started' | 'in_progress' | 'completed';
      exercise_kind: 'open_answer' | 'numeric' | 'file_upload' | 'interactive';
      goal_type: 'daily_minutes' | 'weekly_minutes' | 'daily_lessons' | 'weekly_lessons';
      notification_type: 'new_course' | 'new_lesson' | 'new_quiz' | 'goal_reached' | 'badge_earned' | 'study_reminder' | 'system';
      xp_reason: 'lesson_completed' | 'quiz_passed' | 'course_completed' | 'badge_earned' | 'streak_bonus' | 'goal_reached';
      access_scope: 'all' | 'subject' | 'course';
    };
    CompositeTypes: Record<string, never>;
  };
};

type PublicSchema = Database['public'];

export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row'];
export type TablesInsert<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Update'];
export type Views<T extends keyof PublicSchema['Views']> = PublicSchema['Views'][T]['Row'];
export type Enums<K extends keyof PublicSchema['Enums']> = PublicSchema['Enums'][K];
