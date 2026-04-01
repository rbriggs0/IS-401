const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export async function register(email: string, password: string, zipcode?: number) {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, zipcode: zipcode ?? undefined }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Registration failed");
  return data;
}

export async function login(email: string, password: string) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Login failed");
  return data;
}

export type User = {
  UserID: number;
  Email: string;
  Premium: boolean;
  Zipcode: number | null;
  UserRole: string;
};

export type Progress = {
  userId: number;
  downPaymentPercentage: number | null;
  budget: number | null;
  amountSaved: number;
  creditScore: number | null;
  contributionGoal: number | null;
  monthlyIncome: number | null;
  monthlyExpenses: number | null;
  timeHorizon: string | null;
  desiredZipCodes: string | null;
};

function progressHeaders(userId: number) {
  return {
    "Content-Type": "application/json",
    "X-User-Id": String(userId),
  };
}

export type Home = {
  HomeID: number;
  Bedrooms: number | null;
  Bathrooms: number | null;
  Price: number | null;
  StreetAddress: string | null;
  City: string | null;
  State: string | null;
  Zip: number | null;
  ZillowURL: string | null;
  SquareFeet?: number | null;
};

export async function getWishlist(userId: number): Promise<Home[]> {
  const res = await fetch(`${API_BASE}/api/homes`, {
    headers: { "X-User-Id": String(userId) },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to load saved homes");
  return data;
}

export async function createHome(
  userId: number,
  body: {
    zillowUrl?: string;
    streetAddress?: string;
    city?: string;
    state?: string;
    zip?: string;
    price?: number;
    bedrooms?: number;
    bathrooms?: number;
    squareFeet?: number;
  }
): Promise<Home> {
  const res = await fetch(`${API_BASE}/api/homes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-User-Id": String(userId),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to save home");
  return data;
}

export async function updateHome(
  userId: number,
  homeId: number,
  body: {
    zillowUrl?: string;
    streetAddress?: string;
    city?: string;
    state?: string;
    zip?: string;
    price?: number;
    bedrooms?: number;
    bathrooms?: number;
    squareFeet?: number;
  }
): Promise<Home> {
  const res = await fetch(`${API_BASE}/api/homes/${homeId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-User-Id": String(userId),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to update home");
  return data;
}

export async function deleteHome(userId: number, homeId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/homes/${homeId}`, {
    method: "DELETE",
    headers: {
      "X-User-Id": String(userId),
    },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to delete home");
  }
}

export async function getProgress(userId: number): Promise<Progress> {
  const res = await fetch(`${API_BASE}/api/progress`, {
    headers: { "X-User-Id": String(userId) },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to load progress");
  return data;
}

export async function updateProgress(
  userId: number,
  body: Partial<{
    budget: number | null;
    downPaymentPercentage: number | null;
    amountSaved: number;
    creditScore: number | null;
    monthlyIncome: number | null;
    monthlyExpenses: number | null;
    timeHorizon: string | null;
    desiredZipCodes: string | null;
  }>
): Promise<Progress> {
  const res = await fetch(`${API_BASE}/api/progress`, {
    method: "PUT",
    headers: progressHeaders(userId),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to save profile");
  return data;
}

export type MortgageRates = {
  lowRate: number;
  highRate: number;
};

export type AdminOkrMetric = {
  qualifiedUsers: number;
  completedUsers: number;
  completionRate: number;
};

/** Estimated APR range (%) for payment estimates; derived from profile credit score on the server. */
export async function getMortgageRates(userId: number): Promise<MortgageRates> {
  const res = await fetch(`${API_BASE}/api/mortgage-rates`, {
    headers: { "X-User-Id": String(userId) },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to load mortgage rates");
  return data;
}

export async function getAdminOkrMetric(userId: number): Promise<AdminOkrMetric> {
  const res = await fetch(`${API_BASE}/api/admin/okr`, {
    headers: { "X-User-Id": String(userId) },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to load OKR metric");
  return data;
}

export async function addContribution(
  userId: number,
  amount: number
): Promise<{ amountSaved: number; contributionGoal: number | null }> {
  const res = await fetch(`${API_BASE}/api/progress/contribution`, {
    method: "POST",
    headers: progressHeaders(userId),
    body: JSON.stringify({ amount }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to add contribution");
  return data;
}
