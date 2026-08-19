import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Home, MessageSquare, Clock } from "lucide-react";

const mobileSchema = z.object({
  mobile: z.string().min(10, "Please enter a valid mobile number"),
});

const otpSchema = z.object({
  otp: z.string().length(6, "OTP must be 6 digits"),
});

type MobileFormData = z.infer<typeof mobileSchema>;
type OTPFormData = z.infer<typeof otpSchema>;

export default function OTPLogin() {
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [step, setStep] = useState<"mobile" | "otp">("mobile");
  const [mobile, setMobile] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState<number>(0);

  const mobileForm = useForm<MobileFormData>({
    resolver: zodResolver(mobileSchema),
    defaultValues: {
      mobile: "",
    },
  });

  const otpForm = useForm<OTPFormData>({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      otp: "",
    },
  });

  // Countdown timer for OTP expiry
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (timeLeft > 0) {
      timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [timeLeft]);

  const sendOTPMutation = useMutation({
    mutationFn: async (data: MobileFormData) => {
      const res = await apiRequest("POST", "/api/auth/send-otp", data);
      return await res.json();
    },
    onSuccess: (response: any) => {
      const mobileNumber = response.mobile || mobileForm.getValues().mobile;
      setMobile(mobileNumber);
      setStep("otp");
      setTimeLeft(300); // 5 minutes
      if (response.channel === "whatsapp") {
        setSuccess("OTP sent successfully! Please check WhatsApp for the 6-digit code.");
      } else if (response.channel === "email") {
        setSuccess(`OTP sent successfully! Please check your email (${response.maskedEmail}) for the 6-digit code.`);
      } else {
        setSuccess("OTP sent successfully! Please check your mobile for the 6-digit code.");
      }
      setError("");
    },
    onError: (error: any) => {
      // apiRequest throws "STATUS: {json body}" - pull the real message out of that
      const raw = error.message || "";
      const jsonPart = raw.slice(raw.indexOf(":") + 1).trim();
      try {
        setError(JSON.parse(jsonPart).message || "Failed to send OTP");
      } catch {
        setError(raw || "Failed to send OTP");
      }
    },
  });

  const verifyOTPMutation = useMutation({
    mutationFn: async (data: OTPFormData) => {
      return await apiRequest("POST", "/api/auth/verify-otp", {
        mobile,
        otp: data.otp,
      });
    },
    onSuccess: () => {
      setLocation("/dashboard");
    },
    onError: (error: any) => {
      setError(error.message || "OTP verification failed");
    },
  });

  const onMobileSubmit = (data: MobileFormData) => {
    setError("");
    setSuccess("");
    sendOTPMutation.mutate(data);
  };

  const onOTPSubmit = (data: OTPFormData) => {
    setError("");
    console.log('Current mobile state:', mobile);
    console.log('OTP form data:', data);
    verifyOTPMutation.mutate(data);
  };

  const resendOTP = () => {
    if (timeLeft > 0) return;
    sendOTPMutation.mutate({ mobile });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-between items-center mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => step === "otp" ? setStep("mobile") : setLocation("/")}
              className="text-gray-500 hover:text-brand-orange"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              {step === "otp" ? "Back" : "Home"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/")}
              className="text-gray-500 hover:text-brand-orange"
            >
              <Home className="w-4 h-4" />
            </Button>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            {step === "mobile" ? "Sign In" : "Verify OTP"}
          </CardTitle>
          <CardDescription>
            {step === "mobile" 
              ? "Enter your mobile number to receive an OTP"
              : `Enter the 6-digit code sent to ${mobile || "undefined"}`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-200 bg-green-50 mb-6">
              <MessageSquare className="h-4 w-4" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          {step === "mobile" ? (
            <form onSubmit={mobileForm.handleSubmit(onMobileSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile Number</Label>
                <Input
                  id="mobile"
                  type="tel"
                  placeholder="9876543210"
                  {...mobileForm.register("mobile")}
                  className="w-full"
                />
                {mobileForm.formState.errors.mobile && (
                  <p className="text-sm text-red-600">
                    {mobileForm.formState.errors.mobile.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-brand-orange hover:bg-brand-orange/90"
                disabled={sendOTPMutation.isPending}
              >
                {sendOTPMutation.isPending ? "Sending OTP..." : "Send OTP"}
              </Button>

              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Prefer password login?{" "}
                  <Link href="/login/password" className="text-brand-orange hover:underline">
                    Use password instead
                  </Link>
                </p>
              </div>
            </form>
          ) : (
            <form onSubmit={otpForm.handleSubmit(onOTPSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="otp">6-Digit OTP</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="000000"
                  maxLength={6}
                  {...otpForm.register("otp")}
                  className="w-full text-center text-lg tracking-widest"
                />
                {otpForm.formState.errors.otp && (
                  <p className="text-sm text-red-600">
                    {otpForm.formState.errors.otp.message}
                  </p>
                )}
              </div>

              {timeLeft > 0 && (
                <div className="flex items-center justify-center text-sm text-gray-600">
                  <Clock className="w-4 h-4 mr-1" />
                  OTP expires in {formatTime(timeLeft)}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-brand-orange hover:bg-brand-orange/90"
                disabled={verifyOTPMutation.isPending}
              >
                {verifyOTPMutation.isPending ? "Verifying..." : "Verify & Sign In"}
              </Button>

              <div className="text-center">
                <Button
                  type="button"
                  variant="link"
                  onClick={resendOTP}
                  disabled={timeLeft > 0 || sendOTPMutation.isPending}
                  className="text-brand-orange"
                >
                  {timeLeft > 0 ? `Resend OTP in ${formatTime(timeLeft)}` : "Resend OTP"}
                </Button>
              </div>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              New to Sri Shankeshwar Bengaluru Bhavan?{" "}
              <Link href="/signup" className="text-brand-orange hover:underline">
                Create account
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}