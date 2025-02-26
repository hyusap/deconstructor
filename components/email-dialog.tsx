"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { usePlausible } from "next-plausible";
import { useLocalStorage } from "@/utils/use-local-storage";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Spinner from "./spinner";

// Add custom styles to hide the close button
import { cn } from "@/lib/utils";

const formSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type FormValues = z.infer<typeof formSchema>;

interface EmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wordCount: number;
}

export function EmailDialog({
  open,
  onOpenChange,
  wordCount,
}: EmailDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [_, setEmailSubmitted] = useLocalStorage("emailSubmitted", false);
  const plausible = usePlausible();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);

    try {
      // Track email submission in Plausible
      plausible("email_collected", {
        props: {
          email: data.email,
        },
      });

      // Store in localStorage that the user has submitted their email
      setEmailSubmitted(true);

      // Close the dialog
      onOpenChange(false);
    } catch (error) {
      console.error("Error submitting email:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        // Only allow closing if email has been submitted
        if (newOpen === false && !form.formState.isSubmitSuccessful) {
          return;
        }
        onOpenChange(newOpen);
      }}
    >
      <DialogContent
        className={cn(
          "sm:max-w-[425px] bg-gray-800 border border-gray-700/50 text-gray-100",
          "[&>button]:hidden" // Hide the close button
        )}
        onPointerDownOutside={(e) => e.preventDefault()} // Prevent closing on outside click
        onEscapeKeyDown={(e) => e.preventDefault()} // Prevent closing on Escape key
      >
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif">
            Word Explorer Milestone!
          </DialogTitle>
          <DialogDescription className="text-gray-300">
            You&apos;ve deconstructed {wordCount} words! Enter your email to
            continue your language journey and get notified about new features.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-200">Email</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="you@example.com"
                      {...field}
                      className="bg-gray-900/50 border border-gray-700/50 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  </FormControl>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50 transition-colors flex items-center justify-center"
              >
                {isSubmitting ? <Spinner /> : "Continue exploring"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
