import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { RoomCategory } from "@shared/schema";
import type { TrusteeFormData } from "@/lib/types";

const trusteeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  mobile: z.string().min(10, "Valid mobile number is required"),
  trusteeAutoBookDates: z.string().optional(),
  trusteeRoomCategoryId: z.string().optional(),
});

export default function TrusteeForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: roomCategories } = useQuery<RoomCategory[]>({
    queryKey: ["/api/room-categories"],
  });

  const form = useForm<z.infer<typeof trusteeSchema>>({
    resolver: zodResolver(trusteeSchema),
    defaultValues: {
      name: "",
      email: "",
      mobile: "",
      trusteeAutoBookDates: "1,15",
      trusteeRoomCategoryId: "",
    },
  });

  const createTrusteeMutation = useMutation({
    mutationFn: async (data: TrusteeFormData) => {
      return await apiRequest("POST", "/api/trustees", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trustees"] });
      form.reset();
      toast({
        title: "Trustee Added",
        description: "Trustee has been successfully added to the system.",
      });
    },
    onError: (error) => {
      console.error("Create trustee error:", error);
      toast({
        title: "Error",
        description: "Failed to add trustee. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: z.infer<typeof trusteeSchema>) => {
    const trusteeData: TrusteeFormData = {
      ...values,
      trusteeRoomCategoryId: values.trusteeRoomCategoryId ? parseInt(values.trusteeRoomCategoryId) : undefined,
      trusteeStatus: "active",
    };
    
    createTrusteeMutation.mutate(trusteeData);
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Add New Trustee</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Trustee name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="Email address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="mobile"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mobile</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="Mobile number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex items-end">
              <Button 
                type="submit" 
                className="w-full bg-brand-orange hover:bg-brand-orange-light"
                disabled={createTrusteeMutation.isPending}
              >
                {createTrusteeMutation.isPending ? "Adding..." : "Add Trustee"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
