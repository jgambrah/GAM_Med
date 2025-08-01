"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { registerPatientAction } from "@/lib/actions";
import { Loader2 } from "lucide-react";


const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  dateOfBirth: z.string().refine((val) => !isNaN(Date.parse(val)) && val.length > 0, {
    message: "Please enter a valid date.",
  }),
  gender: z.enum(["Male", "Female", "Other"]),
  phone: z.string().min(10, "Phone number is too short."),
  email: z.string().email("Invalid email address.").optional().or(z.literal('')),
  address: z.string().min(5, "Address is too short."),
  emergencyContactName: z.string().min(2, "Contact name is too short."),
  emergencyContactPhone: z.string().min(10, "Contact phone is too short."),
  emergencyContactRelationship: z.string().min(2, "Relationship is too short."),
  bloodGroup: z.string().min(1, "Blood group is required."),
  allergies: z.string().optional(),
  admissionStatus: z.enum(["Inpatient", "Outpatient"]),
  bed: z.string().optional(),
});

type PatientFormValues = z.infer<typeof formSchema>;

interface PatientRegistrationFormProps {
  onFormSubmit: () => void;
}

export function PatientRegistrationForm({ onFormSubmit }: PatientRegistrationFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<PatientFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      dateOfBirth: "",
      gender: "Male",
      phone: "",
      email: "",
      address: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      emergencyContactRelationship: "",
      bloodGroup: "",
      allergies: "",
      admissionStatus: "Outpatient",
      bed: "",
    },
  });

  async function onSubmit(data: PatientFormValues) {
    setIsSubmitting(true);
    try {
      const result = await registerPatientAction(data);

      if (result.success) {
        toast({
          title: "Patient Registered Successfully",
          description: result.message,
        });
        form.reset();
        onFormSubmit();
      } else {
        toast({
          variant: "destructive",
          title: "Registration Failed",
          description: result.message,
        });
      }
    } catch (error) {
       toast({
          variant: "destructive",
          title: "An Error Occurred",
          description: "Something went wrong. Please try again.",
        });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                    <Input placeholder="John Doe" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="dateOfBirth"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Date of Birth</FormLabel>
                <FormControl>
                    <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        <FormField
          control={form.control}
          name="gender"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Gender</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                        <Input placeholder="024-123-4567" {...field} />
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
                    <FormLabel>Email (Optional)</FormLabel>
                    <FormControl>
                        <Input placeholder="patient@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>
        <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Residential Address</FormLabel>
                <FormControl>
                    <Input placeholder="123 Anum Street, Accra" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
        />
        <fieldset className="border p-4 rounded-md">
            <legend className="text-sm font-medium px-1">Emergency Contact</legend>
            <div className="space-y-4 mt-2">
                 <FormField
                    control={form.control}
                    name="emergencyContactName"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                            <Input placeholder="Adwoa Osei" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <FormField
                        control={form.control}
                        name="emergencyContactPhone"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                                <Input placeholder="024-765-4321" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="emergencyContactRelationship"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Relationship</FormLabel>
                            <FormControl>
                                <Input placeholder="Spouse" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            </div>
        </fieldset>
         <fieldset className="border p-4 rounded-md">
            <legend className="text-sm font-medium px-1">Medical Information</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                 <FormField
                    control={form.control}
                    name="bloodGroup"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Blood Group</FormLabel>
                        <FormControl>
                            <Input placeholder="O+" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="allergies"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Known Allergies (comma-separated)</FormLabel>
                        <FormControl>
                            <Input placeholder="Penicillin, Dust" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
        </fieldset>
         <fieldset className="border p-4 rounded-md">
            <legend className="text-sm font-medium px-1">Admission Details</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <FormField
                control={form.control}
                name="admissionStatus"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Admission Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        <SelectItem value="Inpatient">Inpatient</SelectItem>
                        <SelectItem value="Outpatient">Outpatient</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                    control={form.control}
                    name="bed"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Bed Assignment (if Inpatient)</FormLabel>
                        <FormControl>
                            <Input placeholder="Ward A, Bed 101" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
        </fieldset>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Register Patient
        </Button>
      </form>
    </Form>
  );
}
