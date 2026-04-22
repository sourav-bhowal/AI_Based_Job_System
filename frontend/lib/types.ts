// ========== Auth Types ==========

export interface User {
  user_id: number;
  username: string;
  email: string;
  full_name: string | null;
  created_at?: string;
  is_admin?: number;
}

export interface AuthResponse {
  user_id: number;
  username: string;
  email: string;
  full_name: string | null;
  token: string;
}

// ========== Job Scanning Types ==========

export interface JobDetails {
  description: string;
  job_title?: string | null;
  company_name?: string | null;
  salary: string | null;
  email: string | null;
  entities?: {
    companies: string[];
    locations: string[];
    money: string[];
    dates: string[];
    persons: string[];
    entity_count: number;
    all_entities: Record<string, string[]>;
    scam_signals: string[];
  };
}

export interface ExplanationFeature {
  word: string;
  contribution?: number;
  tfidf_weight?: number;
  impact_percentage?: number;
  weight?: number;
  message?: string;
}

export interface RedFlag {
  flag: string;
  severity: "critical" | "high" | "medium" | "low";
  message: string;
}

export interface Explanation {
  prediction: "scam" | "legitimate";
  scam_probability: number;
  legit_probability?: number;
  confidence: number | string;
  top_scam_indicators?: ExplanationFeature[];
  top_legit_indicators?: ExplanationFeature[];
  top_scam_features?: ExplanationFeature[];
  top_legit_features?: ExplanationFeature[];
  red_flags: RedFlag[];
  entity_analysis?: {
    companies_found: string[];
    locations_found: string[];
    money_found: string[];
    entity_count: number;
  };
  ai_detection?: AIDetectionResult | null;
  total_features_analyzed?: number;
}

export interface SalaryAnalysis {
  anomaly_score: number;
  anomaly_level?: string;
  salary_provided?: string | null;
  currency?: string;
  detected_role?: string;
  ml_prediction?: {
    predicted_salary: number;
    model: string;
    inferred_experience_years: number;
    inferred_education: string;
    deviation_percent?: number;
  };
  analysis: string | string[];
}

export interface CompanyTrust {
  company_name?: string;
  trust_score: number;
  trust_level: string;
  confidence?: number;
  details?: {
    domain?: { score: number; confidence: number; reasons: string[] };
    email?: { score: number; confidence: number; reason: string };
    name?: { score: number; confidence: number; signals: string[] };
    community?: { score: number; confidence: number; reasons: string[] };
  };
  community_data?: {
    report_count: number;
    is_blacklisted: boolean;
  };
}

export interface ScanResult {
  risk_score: number;
  risk_level: "Safe" | "Medium Risk" | "High Risk";
  job_details?: JobDetails;
  explanation: Explanation;
  salary_analysis: SalaryAnalysis;
  company_trust?: CompanyTrust | null;
}

export interface ScanHistoryItem {
  id: number;
  user_id: number;
  url: string;
  job_title?: string | null;
  company_name?: string | null;
  risk_score: number;
  risk_level: string;
  nlp_score: number;
  salary_score: number;
  domain_score: number;
  description: string;
  salary: string | null;
  email_found: string | null;
  scanned_at: string;
}

export interface AIDetectionResult {
  ai_probability: number;
  human_probability: number;
  verdict: "likely_human" | "uncertain" | "likely_ai";
  confidence: number;
  method: string;
}

// ========== Resume Types ==========

export interface SkillCategories {
  programming_languages?: string[];
  frameworks?: string[];
  databases?: string[];
  cloud_devops?: string[];
  data_science_ml?: string[];
  data_ml?: string[];
  tools?: string[];
  soft_skills?: string[];
}

export interface ResumeUploadResult {
  resume_id: number;
  filename: string;
  skills: SkillCategories;
  total_skills_found: number;
  education: string[];
  experience_years: number;
  contact: {
    name?: string;
    email?: string;
    phone?: string;
    linkedin?: string;
    github?: string;
  };
  word_count: number;
  quality_score?: number;
  quality_feedback?: { type: "good" | "warning" | "error"; message: string }[];
  ner_entities?: {
    name?: string | null;
    organizations?: string[];
    locations?: string[];
    dates?: string[];
    skills_from_ner?: string[];
    entity_count?: number;
  };
}

export interface ResumeListItem {
  id: number;
  filename: string;
  skills: SkillCategories;
  experience: string;
  education: string[];
  uploaded_at: string;
}

export interface CourseRecommendation {
  skill?: string;
  title: string;
  platform: string;
  url?: string;
  level: string;
}

export interface TrainingRoadmapItem {
  week: string;
  skill: string;
  priority: string;
  goal: string;
  resources: CourseRecommendation[];
}

export interface ATSFeedbackItem {
  type: "good" | "warning" | "error";
  message: string;
}

export interface ATSScore {
  score: number;
  feedback: ATSFeedbackItem[];
}

export interface StrengthItem {
  skill: string;
  status: string;
  message: string;
  bridge_skill?: string;
  similarity?: number;
}

export interface WeaknessItem {
  skill: string;
  status: string;
  message: string;
  priority?: string;
}

export interface MatchResult {
  match_score: number;
  cosine_similarity?: number;
  similarity_method?: string;
  skill_match_percentage?: number;
  total_job_skills?: number;
  matching_skills_count?: number;
  partial_match_skills_count?: number;
  missing_skills_count?: number;
  strengths: StrengthItem[];
  weaknesses: WeaknessItem[];
  recommendations: CourseRecommendation[];
  ats_score?: ATSScore;
  training_roadmap?: TrainingRoadmapItem[];
}

export interface MatchHistoryItem {
  id: number;
  user_id: number;
  resume_id: number;
  filename: string;
  job_url: string | null;
  job_title?: string | null;
  match_score: number;
  strengths: string;
  weaknesses: string;
  recommendations: string;
  matched_at: string;
}

// ========== Company Types ==========

export interface CompanyDetail {
  type: "good" | "warning" | "danger";
  message: string;
}

export interface CompanyCheckResult {
  company: string;
  trust_score: number;
  trust_level: string;
  confidence: number;
  details: {
    domain: {
      score: number;
      confidence: number;
      reasons: string[];
    };
    email: {
      score: number;
      confidence: number;
      reason: string;
    };
    name: {
      score: number;
      confidence: number;
      signals: string[];
    };
    community?: {
      score: number;
      confidence: number;
      reasons: string[];
    };
  };
  community_data?: {
    report_count: number;
    is_blacklisted: boolean;
    blacklist_entry: any | null;
  };
}

// ========== Community Reports Types ==========

export interface ScamReport {
  id: number;
  user_id: number;
  username: string;
  company_name: string;
  job_title: string | null;
  job_url: string | null;
  description: string;
  evidence: string | null;
  category: string;
  status?: string;
  upvotes: number;
  downvotes: number;
  created_at: string;
}

export interface ReportsResponse {
  reports: ScamReport[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface BlacklistItem {
  id: number;
  company_name: string;
  total_reports: number;
  added_at: string;
}

// ========== Analytics Types ==========

export interface AnalyticsOverview {
  total_users: number;
  total_scans: number;
  total_reports: number;
  total_resumes: number;
  blacklisted_companies: number;
  average_risk_score: number;
  scans_today: number;
  risk_distribution: {
    high_risk: number;
    medium_risk: number;
    safe: number;
  };
}

export interface TrendItem {
  date: string;
  count: number;
  avg_risk_score: number;
}

export interface TopReportedCompany {
  company_name: string;
  report_count: number;
  total_upvotes: number;
}

export interface ModelMetric {
  model_name: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  training_samples: number;
  test_samples: number;
}

export interface ModelComparison {
  best_model: string;
  models: ModelMetric[];
  vectorizer_features: number;
  dataset_size: number;
  trained_at: string;
}

export interface ReportCategory {
  category: string;
  count: number;
}

// ========== System Types ==========

export interface HealthCheck {
  status: string;
  version: string;
  features: string[];
}
