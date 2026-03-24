import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Home as HomeIcon, Plus } from "lucide-react";
import heroHome from "@/assets/hero-home.jpg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import {
  getProgress,
  getWishlist,
  createHome,
  updateHome,
  deleteHome,
  getMortgageRates,
  type Home,
} from "@/lib/api";
import {
  calculateDownPayment,
  calculateRemainingSavings,
  calculateAffordabilityTimeline,
  calculateMonthlyPayment,
} from "@/lib/affordability";
import { AddHouseModal, type HouseFormValues } from "@/components/saved-homes/AddHouseModal";
import { HomeCard } from "@/components/saved-homes/HomeCard";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4 } }),
};

export default function ListingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [addOpen, setAddOpen] = useState(false);
  const [editHome, setEditHome] = useState<Home | null>(null);
  const [deleteHomeTarget, setDeleteHomeTarget] = useState<Home | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minBeds, setMinBeds] = useState("");
  const [minBaths, setMinBaths] = useState("");
  const [minSqft, setMinSqft] = useState("");
  const [city, setCity] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [zip, setZip] = useState("");

  const hasActiveFilters = Boolean(
    minPrice || maxPrice || minBeds || minBaths || minSqft || city.trim() || stateFilter.trim() || zip.trim()
  );

  const { data: progress } = useQuery({
    queryKey: ["progress", user?.UserID],
    queryFn: () => getProgress(user!.UserID),
    enabled: !!user?.UserID,
  });

  const { data: mortgageRates, error: mortgageRatesError } = useQuery({
    queryKey: ["mortgageRates", user?.UserID, progress?.creditScore, progress?.downPaymentPercentage],
    queryFn: () => getMortgageRates(user!.UserID),
    enabled: !!user?.UserID,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const {
    data: homes,
    isLoading: loadingHomes,
  } = useQuery<Home[]>({
    queryKey: ["wishlist", user?.UserID],
    queryFn: () => getWishlist(user!.UserID),
    enabled: !!user?.UserID,
  });

  const addHomeMutation = useMutation({
    mutationFn: (values: HouseFormValues) => createHome(user!.UserID, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist", user?.UserID] });
      setAddOpen(false);
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Failed to save home";
      // eslint-disable-next-line no-alert
      alert(message);
    },
  });

  const editHomeMutation = useMutation({
    mutationFn: (values: HouseFormValues) => updateHome(user!.UserID, editHome!.HomeID, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist", user?.UserID] });
      setEditHome(null);
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Failed to update home";
      // eslint-disable-next-line no-alert
      alert(message);
    },
  });

  const deleteHomeMutation = useMutation({
    mutationFn: (homeId: number) => deleteHome(user!.UserID, homeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist", user?.UserID] });
      setDeleteHomeTarget(null);
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Failed to delete home";
      // eslint-disable-next-line no-alert
      alert(message);
    },
  });

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
    }
  }, [user, navigate]);

  if (!user) return null;

  const filteredHomes = (homes ?? []).filter((home) => {
    const price = home.Price ?? 0;
    const bedrooms = home.Bedrooms ?? 0;
    const bathrooms = home.Bathrooms ?? 0;
    const squareFeet = home.SquareFeet ?? 0;
    const homeCity = (home.City ?? "").toLowerCase();
    const homeState = (home.State ?? "").toLowerCase();
    const homeZip = home.Zip != null ? String(home.Zip) : "";

    const minPriceNum = minPrice ? Number(minPrice) : null;
    const maxPriceNum = maxPrice ? Number(maxPrice) : null;
    const minBedsNum = minBeds ? Number(minBeds) : null;
    const minBathsNum = minBaths ? Number(minBaths) : null;
    const minSqftNum = minSqft ? Number(minSqft) : null;
    const zipFilter = zip.trim();
    const query = searchTerm.trim().toLowerCase();

    if (Number.isNaN(minPriceNum ?? undefined)) return false;
    if (Number.isNaN(maxPriceNum ?? undefined)) return false;
    if (Number.isNaN(minBedsNum ?? undefined)) return false;
    if (Number.isNaN(minBathsNum ?? undefined)) return false;
    if (Number.isNaN(minSqftNum ?? undefined)) return false;

    if (minPriceNum !== null && price < minPriceNum) return false;
    if (maxPriceNum !== null && price > maxPriceNum) return false;
    if (minBedsNum !== null && bedrooms < minBedsNum) return false;
    if (minBathsNum !== null && bathrooms < minBathsNum) return false;
    if (minSqftNum !== null && squareFeet < minSqftNum) return false;

    if (city.trim() && !homeCity.includes(city.trim().toLowerCase())) return false;
    if (stateFilter.trim() && !homeState.includes(stateFilter.trim().toLowerCase())) return false;
    if (zipFilter && homeZip !== zipFilter) return false;

    if (!query) return true;
    const fields: Array<string | number | null | undefined> = [
      home.StreetAddress,
      home.City,
      home.State,
      home.Zip,
      home.ZillowURL,
      home.Bedrooms,
      home.Bathrooms,
      home.SquareFeet,
      home.Price,
    ];

    return fields.some((value) => {
      if (value == null) return false;
      return String(value).toLowerCase().includes(query);
    });
  });

  const noSavedHomes = (homes?.length ?? 0) === 0;

  return (
    <div>
      {/* Hero banner — title + subtitle only (no duplicate Add House) */}
      <div className="relative h-48 sm:h-56 w-full overflow-hidden mb-8">
        <img src={heroHome} alt="" className="w-full h-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/80 via-foreground/60 to-foreground/30" />
        <div className="absolute inset-0 flex items-center px-6 sm:px-12 max-w-5xl mx-auto w-full">
          <div>
            <h1 className="text-3xl font-bold text-primary-foreground mb-1">Saved Homes</h1>
            <p className="text-primary-foreground/80 text-sm max-w-md">
              Track homes you&apos;re considering and see how they compare to your savings and budget.
            </p>
          </div>
        </div>
      </div>

      <div className="container max-w-5xl pb-10">
        <div className="flex justify-between items-center gap-4 mb-6">
          <div className="flex-1 max-w-md">
            <Input
              placeholder="Search saved homes by address, city, price, etc."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-background"
            />
          </div>
          <div className="hidden sm:flex">
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add House
            </Button>
          </div>
        </div>

        <div className="flex justify-end mb-6 sm:hidden">
          <Button onClick={() => setAddOpen(true)} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add House
          </Button>
        </div>

        <div className="mb-6 rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-muted-foreground">Filter saved homes</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setMinPrice("");
                setMaxPrice("");
                setMinBeds("");
                setMinBaths("");
                setMinSqft("");
                setCity("");
                setStateFilter("");
                setZip("");
              }}
            >
              Clear filters
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="minPrice">
                Min price
              </label>
              <input
                id="minPrice"
                type="number"
                inputMode="numeric"
                className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="maxPrice">
                Max price
              </label>
              <input
                id="maxPrice"
                type="number"
                inputMode="numeric"
                className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="minBeds">
                Min beds
              </label>
              <input
                id="minBeds"
                type="number"
                inputMode="numeric"
                className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                value={minBeds}
                onChange={(e) => setMinBeds(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="minBaths">
                Min baths
              </label>
              <input
                id="minBaths"
                type="number"
                inputMode="numeric"
                className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                value={minBaths}
                onChange={(e) => setMinBaths(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="minSqft">
                Min square feet
              </label>
              <input
                id="minSqft"
                type="number"
                inputMode="numeric"
                className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                value={minSqft}
                onChange={(e) => setMinSqft(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="city">
                City
              </label>
              <input
                id="city"
                type="text"
                className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="state">
                State
              </label>
              <input
                id="state"
                type="text"
                className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="zip">
                Zip
              </label>
              <input
                id="zip"
                type="text"
                inputMode="numeric"
                className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
              />
            </div>
          </div>
        </div>

        {loadingHomes ? (
          <p className="text-muted-foreground">Loading your saved homes…</p>
        ) : !filteredHomes || filteredHomes.length === 0 ? (
          <div className="bg-card rounded-xl p-8 shadow-card text-center border border-dashed border-border">
            <div className="flex justify-center mb-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <HomeIcon className="h-6 w-6 text-primary" />
              </div>
            </div>
            <h2 className="text-xl font-semibold mb-1">
              {noSavedHomes ? "No homes saved yet" : "No matching homes"}
            </h2>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              {noSavedHomes && !searchTerm.trim() && !hasActiveFilters
                ? "Add homes from Zillow and we'll show how each one fits your budget, savings, and timeline."
                : "No homes match your search or filters. Try adjusting or clear filters."}
            </p>
            {noSavedHomes && !searchTerm.trim() && !hasActiveFilters && (
              <Button onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add your first house
              </Button>
            )}
          </div>
        ) : (
          <motion.div
            initial="hidden"
            animate="visible"
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {filteredHomes.map((home, index) => {
              const downPaymentNeeded = calculateDownPayment(home.Price ?? 0, progress?.downPaymentPercentage ?? null);
              const remainingSavings = calculateRemainingSavings(downPaymentNeeded, progress?.amountSaved);
              const monthlySavings = progress?.contributionGoal ?? null;
              const timeline = calculateAffordabilityTimeline(remainingSavings, monthlySavings);
              const loanPrincipal =
                home.Price != null && downPaymentNeeded > 0 ? Math.max(0, home.Price - downPaymentNeeded) : 0;
              const monthlyPaymentRange =
                mortgageRates && loanPrincipal > 0
                  ? (() => {
                      const low = calculateMonthlyPayment(loanPrincipal, mortgageRates.lowRate, 30);
                      const high = calculateMonthlyPayment(loanPrincipal, mortgageRates.highRate, 30);
                      const min = Math.min(low, high);
                      const max = Math.max(low, high);
                      return `$${Math.round(min).toLocaleString()} - $${Math.round(max).toLocaleString()}/mo`;
                    })()
                  : mortgageRatesError instanceof Error
                    ? mortgageRatesError.message
                    : null;

              return (
                <HomeCard
                  key={home.HomeID}
                  home={home}
                  index={index}
                  fadeUp={fadeUp}
                  progress={progress ?? null}
                  downPaymentNeeded={downPaymentNeeded}
                  remainingSavings={remainingSavings}
                  timelineLabel={timeline?.label ?? null}
                  monthlyPaymentRange={monthlyPaymentRange}
                  onEdit={(h) => setEditHome(h)}
                  onDelete={(h) => setDeleteHomeTarget(h)}
                />
              );
            })}
          </motion.div>
        )}

        <AddHouseModal
          open={addOpen}
          onOpenChange={setAddOpen}
          onSubmit={(values) => addHomeMutation.mutate(values)}
          submitting={addHomeMutation.isPending}
        />

        <AddHouseModal
          open={editHome != null}
          onOpenChange={(open) => {
            if (!open) setEditHome(null);
          }}
          title="Edit house"
          description="Update the details for this saved home. Zillow link is optional."
          submitLabel="Save changes"
          initialValues={
            editHome
              ? {
                  zillowUrl: editHome.ZillowURL ?? "",
                  streetAddress: editHome.StreetAddress ?? "",
                  city: editHome.City ?? "",
                  state: editHome.State ?? "",
                  zip: editHome.Zip != null ? String(editHome.Zip) : "",
                  price: editHome.Price ?? 0,
                  bedrooms: editHome.Bedrooms ?? 0,
                  bathrooms: editHome.Bathrooms ?? 0,
                  squareFeet: editHome.SquareFeet ?? 0,
                }
              : null
          }
          onSubmit={(values) => editHomeMutation.mutate(values)}
          submitting={editHomeMutation.isPending}
        />

        <AlertDialog open={deleteHomeTarget != null} onOpenChange={(open) => !open && setDeleteHomeTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this saved home?</AlertDialogTitle>
              <AlertDialogDescription>
                This removes the home from your saved list. You can always add it again later.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteHomeMutation.isPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (!deleteHomeTarget) return;
                  deleteHomeMutation.mutate(deleteHomeTarget.HomeID);
                }}
                disabled={deleteHomeMutation.isPending}
              >
                {deleteHomeMutation.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
