import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ShieldAlert, Target, TrendingUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getAdminOkrMetric } from "@/lib/api";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4 } }),
};

export default function OKRPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.UserRole === "A";

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-okr", user?.UserID],
    queryFn: () => getAdminOkrMetric(user!.UserID),
    enabled: !!user?.UserID && isAdmin,
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
    }
  }, [user, navigate]);

  if (!user) return null;

  if (!isAdmin) {
    return (
      <div className="container py-10 max-w-3xl">
        <div className="bg-card rounded-xl p-8 shadow-card border text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
            <ShieldAlert className="h-7 w-7 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">
            This page is only available to admin users with the proper database role.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container py-10 max-w-4xl">
        <p className="text-muted-foreground">Loading OKR metric…</p>
      </div>
    );
  }

  if (error instanceof Error) {
    return (
      <div className="container py-10 max-w-4xl">
        <div className="bg-card rounded-xl p-6 shadow-card border">
          <h1 className="text-2xl font-bold mb-2">Admin OKR</h1>
          <p className="text-destructive">{error.message}</p>
        </div>
      </div>
    );
  }

  const completionRate = data?.completionRate ?? 0;
  const qualifiedUsers = data?.qualifiedUsers ?? 0;
  const completedUsers = data?.completedUsers ?? 0;

  return (
    <div className="container py-10 max-w-4xl">
      <motion.div initial="hidden" animate="visible" className="space-y-6">
        <motion.div variants={fadeUp} custom={0}>
          <h1 className="text-3xl font-bold mb-2">Admin OKR</h1>
          <p className="text-muted-foreground">
            Automatically tracks how many users are fully reaching their contribution goal.
          </p>
        </motion.div>

        <motion.div variants={fadeUp} custom={1} className="bg-card rounded-xl p-8 shadow-card">
          <div className="flex items-start justify-between gap-6 flex-col sm:flex-row">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Goal completion rate</p>
              <p className="text-5xl font-bold text-primary">{Math.round(completionRate)}%</p>
              <p className="text-sm text-muted-foreground mt-3">
                {completedUsers} of {qualifiedUsers} users have reached 100% of their contribution goal.
              </p>
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Target className="h-8 w-8 text-primary" />
            </div>
          </div>
        </motion.div>

        <motion.div variants={fadeUp} custom={2} className="grid gap-4 sm:grid-cols-2">
          <div className="bg-card rounded-xl p-5 shadow-card flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Users at goal</p>
              <p className="text-lg font-bold">{completedUsers}</p>
            </div>
          </div>
          <div className="bg-card rounded-xl p-5 shadow-card flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Target className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Users with active goals</p>
              <p className="text-lg font-bold">{qualifiedUsers}</p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
