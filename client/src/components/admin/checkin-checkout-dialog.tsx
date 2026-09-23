import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CheckInOutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "checkin" | "checkout";
  guestName: string;
  bookingLabel: string;
  defaultDateTime?: string | Date | null;
  isPending: boolean;
  onConfirm: (dateTimeIso: string) => void;
}

// Local (not UTC) yyyy-MM-ddTHH:mm for a native datetime-local input's value.
function toLocalInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function CheckInOutDialog({
  open,
  onOpenChange,
  mode,
  guestName,
  bookingLabel,
  defaultDateTime,
  isPending,
  onConfirm,
}: CheckInOutDialogProps) {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (open) {
      const base = defaultDateTime ? new Date(defaultDateTime) : new Date();
      setValue(toLocalInputValue(base));
    }
  }, [open, defaultDateTime]);

  const isCheckin = mode === "checkin";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isCheckin ? "Confirm Check-In" : "Confirm Check-Out"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="font-medium">{guestName}</p>
            <p className="text-sm text-gray-600">{bookingLabel}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="checkinout-datetime">
              {isCheckin ? "Check-in date & time" : "Check-out date & time"}
            </Label>
            <Input
              id="checkinout-datetime"
              type="datetime-local"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => value && onConfirm(new Date(value).toISOString())}
            disabled={isPending || !value}
            className={isCheckin ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"}
          >
            {isPending ? "Saving..." : isCheckin ? "Confirm Check-In" : "Confirm Check-Out"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
