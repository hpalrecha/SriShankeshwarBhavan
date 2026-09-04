import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, isBefore, startOfDay } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarView } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Settings, Trash2, AlertTriangle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface TrusteeReservedDate {
  id: number;
  reservedDate: string;
  isEnabled: boolean;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export default function TrusteeReservations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const today = startOfDay(new Date());

  // Fetch trustee reserved dates
  const { data: reservedDates = [], isLoading } = useQuery<TrusteeReservedDate[]>({
    queryKey: ["/api/admin/trustee-reserved-dates"],
  });

  // Keyed by yyyy-MM-dd for fast lookup while rendering the calendar and
  // handling clicks.
  const byDateKey = useMemo(() => {
    const map = new Map<string, TrusteeReservedDate>();
    for (const d of reservedDates) {
      map.set(format(new Date(d.reservedDate), "yyyy-MM-dd"), d);
    }
    return map;
  }, [reservedDates]);

  const enabledDays = useMemo(
    () => reservedDates.filter((d) => d.isEnabled).map((d) => new Date(d.reservedDate)),
    [reservedDates]
  );
  const disabledDays = useMemo(
    () => reservedDates.filter((d) => !d.isEnabled).map((d) => new Date(d.reservedDate)),
    [reservedDates]
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/admin/trustee-reserved-dates"] });

  const createReservedDateMutation = useMutation({
    mutationFn: (data: { reservedDate: string; description: string; isEnabled: boolean }) =>
      apiRequest("POST", "/api/admin/trustee-reserved-dates", data),
    onSuccess: () => {
      toast({ title: "Date reserved", description: "This date is now blocked for trustee-only booking." });
      invalidate();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to reserve date", variant: "destructive" });
    },
  });

  const updateReservedDateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<TrusteeReservedDate> }) =>
      apiRequest("PATCH", `/api/admin/trustee-reserved-dates/${id}`, updates),
    onSuccess: () => {
      toast({ title: "Updated", description: "Trustee reserved date updated." });
      invalidate();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to update reserved date", variant: "destructive" });
    },
  });

  const deleteReservedDateMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/trustee-reserved-dates/${id}`),
    onSuccess: () => {
      toast({ title: "Removed", description: "This date is open for regular booking again." });
      invalidate();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to remove reserved date", variant: "destructive" });
    },
  });

  const [descriptionDrafts, setDescriptionDrafts] = useState<Record<number, string>>({});

  const handleDayClick = (day: Date, modifiers: Record<string, boolean>) => {
    if (modifiers.disabled) return;
    const dayKey = format(day, "yyyy-MM-dd");
    const existing = byDateKey.get(dayKey);

    if (existing) {
      if (confirm(`Remove the trustee reservation for ${format(day, "PPP")}?`)) {
        deleteReservedDateMutation.mutate(existing.id);
      }
      return;
    }
    createReservedDateMutation.mutate({
      reservedDate: dayKey,
      description: "Trustee Reserved Day",
      isEnabled: true,
    });
  };

  const handleSaveDescription = (date: TrusteeReservedDate) => {
    const draft = descriptionDrafts[date.id];
    if (draft === undefined || draft === date.description) return;
    updateReservedDateMutation.mutate({ id: date.id, updates: { description: draft } });
  };

  const sortedDates = useMemo(
    () => [...reservedDates].sort((a, b) => new Date(a.reservedDate).getTime() - new Date(b.reservedDate).getTime()),
    [reservedDates]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Calendar className="h-6 w-6" />
        <h2 className="text-2xl font-bold">Trustee Reservations</h2>
      </div>

      {/* Feature Description */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            How Trustee Reservations Work
          </CardTitle>
          <CardDescription>
            Trustee reservations block all rooms on specific dates for trustee-only bookings.
            Regular customers cannot book rooms on these dates, ensuring trustees have priority access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              • Click a date on the calendar below to reserve it for trustees<br />
              • Click a reserved date again to remove it<br />
              • Use the list below to rename a date or pause it without deleting it<br />
              • Trustees can still book on reserved dates - regular guests can't
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Calendar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Reserve Dates
          </CardTitle>
          <CardDescription>
            Click any upcoming date to reserve or un-reserve it for trustees.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4 mb-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-brand-orange" />
              <span className="text-muted-foreground">Reserved</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-muted-foreground/40" />
              <span className="text-muted-foreground">Paused (not enforced)</span>
            </div>
          </div>
          <div className="flex justify-center overflow-x-auto">
            <CalendarView
              mode="default"
              numberOfMonths={2}
              pagedNavigation
              disabled={{ before: today }}
              modifiers={{ reserved: enabledDays, reservedPaused: disabledDays }}
              modifiersStyles={{
                reserved: { backgroundColor: "hsl(16, 100%, 59%)", color: "white", borderRadius: "6px" },
                reservedPaused: { backgroundColor: "hsl(0, 0%, 60%)", color: "white", borderRadius: "6px" },
              }}
              onDayClick={handleDayClick}
            />
          </div>
        </CardContent>
      </Card>

      {/* Manage existing reservations */}
      {sortedDates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Manage Reserved Dates
            </CardTitle>
            <CardDescription>
              Rename a date, pause it without deleting it, or remove it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {sortedDates.map((date) => {
                const reservedDate = new Date(date.reservedDate);
                const formattedDate = reservedDate.toLocaleDateString("en-IN", {
                  weekday: "short",
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                });
                const dayNumber = reservedDate.getDate();

                return (
                  <div
                    key={date.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="text-2xl font-bold text-primary shrink-0">{dayNumber}</div>
                      <div className="min-w-0">
                        <Input
                          value={descriptionDrafts[date.id] ?? date.description}
                          onChange={(e) =>
                            setDescriptionDrafts((prev) => ({ ...prev, [date.id]: e.target.value }))
                          }
                          onBlur={() => handleSaveDescription(date)}
                          className="h-8 font-medium border-transparent hover:border-input focus:border-input px-2 -ml-2"
                        />
                        <div className="text-sm text-muted-foreground px-2">{formattedDate}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={date.isEnabled ? "default" : "secondary"}>
                        {date.isEnabled ? "Active" : "Paused"}
                      </Badge>
                      <Switch
                        checked={date.isEnabled}
                        onCheckedChange={() =>
                          updateReservedDateMutation.mutate({ id: date.id, updates: { isEnabled: !date.isEnabled } })
                        }
                        disabled={updateReservedDateMutation.isPending}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this trustee reserved date?")) {
                            deleteReservedDateMutation.mutate(date.id);
                          }
                        }}
                        disabled={deleteReservedDateMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      {reservedDates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">{reservedDates.length}</div>
                <div className="text-sm text-muted-foreground">Total Dates</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {reservedDates.filter((d) => d.isEnabled).length}
                </div>
                <div className="text-sm text-muted-foreground">Active</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-gray-500">
                  {reservedDates.filter((d) => !d.isEnabled).length}
                </div>
                <div className="text-sm text-muted-foreground">Paused</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {new Set(reservedDates.map((d) => new Date(d.reservedDate).getFullYear())).size}
                </div>
                <div className="text-sm text-muted-foreground">Years</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
