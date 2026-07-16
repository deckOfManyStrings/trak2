export type UserRole = "admin" | "staff";
export type AccountStatus = "invited" | "active" | "inactive";
export type AccountPlan = "free" | "premium";

export type Profile = {
  id: string;
  role: UserRole;
  owner_id: string | null;
  email: string;
  full_name: string | null;
  status: AccountStatus;
  plan: AccountPlan;
  created_at: string;
};

export type Location = {
  id: string;
  owner_id: string;
  name: string;
  address: string | null;
  program_description: string | null;
  created_at: string;
};

export type StaffLocation = {
  id: string;
  staff_id: string;
  location_id: string;
  assigned_at: string;
};

export type Client = {
  id: string;
  owner_id: string;
  location_id: string;
  full_name: string;
  status: AccountStatus;
  date_of_birth: string | null;
  date_of_admission: string | null;
  created_at: string;
  updated_at: string;
};

export type ChecklistValue = "Y" | "N" | "H" | "NP" | "N/A";

export type Objective = {
  id: string;
  owner_id: string;
  title: string;
  position: number;
  created_at: string;
};

export type ChecklistEntry = {
  id: string;
  client_id: string;
  objective_id: string;
  owner_id: string;
  entry_date: string;
  value: ChecklistValue;
  staff_id: string | null;
  recorded_by_name: string | null;
  created_at: string;
  updated_at: string;
};

export type AnnualReport = {
  id: string;
  client_id: string;
  owner_id: string;
  review_date: string;
  period_start: string;
  period_end: string;
  summary: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type AnnualReportObjective = {
  id: string;
  annual_report_id: string;
  objective_id: string | null;
  objective_title: string;
  yes_count: number;
  no_count: number;
  tracked_days: number;
  rating_percent: number | null;
  comments: string | null;
  created_at: string;
};
