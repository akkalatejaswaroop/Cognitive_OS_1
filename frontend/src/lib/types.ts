export interface CognitivePreferences {
  default_model: string;
  temperature: number;
  memory_retrieval_depth: number;
  agent_verbosity: 'minimal' | 'medium' | 'verbose';
  voice_enabled: boolean;
}

export interface NotificationSettings {
  email_digests: boolean;
  security_alerts: boolean;
  system_updates: boolean;
  in_app_notifications: boolean;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  density: 'default' | 'dense';
  notifications: NotificationSettings;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  name: string | null;
  avatar_url: string | null;
  role: string;
  timezone: string;
  preferences: UserPreferences;
  cognitive_preferences: CognitivePreferences;
  onboarding_completed: boolean;
  phone_number?: string;
  dob?: string;
  company?: string;
  role_title?: string;
  social_profiles?: { instagram?: string; linkedin?: string; [key: string]: string | undefined };
  interests?: string[];
  hobbies?: string[];
  public_profile_url?: string;
  app_metadata?: { provider: string; [key: string]: unknown };
}

export interface UserUpdatePayload {
  full_name?: string;
  name?: string;
  avatar_url?: string;
  timezone?: string;
  preferences?: Partial<UserPreferences>;
  cognitive_preferences?: Partial<CognitivePreferences>;
  phone_number?: string;
  dob?: string;
  company?: string;
  role_title?: string;
  social_profiles?: { instagram?: string; linkedin?: string; [key: string]: string | undefined };
  interests?: string[];
  hobbies?: string[];
  public_profile_url?: string;
}
