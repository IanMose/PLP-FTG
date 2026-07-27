"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createUser, fetchRoles } from "@/lib/sentinel/api";
import type { SentinelRole, SentinelUser } from "@/lib/sentinel/auth-types";
import { useAuthStore } from "@/stores/auth/auth-store";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.string().min(1, "Please select a role"),
});

type FormValues = z.infer<typeof schema>;

interface AddUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserCreated: (user: SentinelUser) => void;
}

export function AddUserDialog({ open, onOpenChange, onUserCreated }: AddUserDialogProps) {
  const token = useAuthStore((s) => s.user?.token ?? "");
  const [roles, setRoles] = useState<SentinelRole[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "", role: "" },
  });

  // Load roles when the dialog opens
  useEffect(() => {
    if (open && token) {
      fetchRoles(token)
        .then(setRoles)
        .catch(() => {
          // Fallback to standard RBAC roles if backend is offline
          setRoles([
            { id: 1, name: "Admin", description: "Full system access" },
            { id: 2, name: "HSE Manager", description: "Manage incidents and audits" },
            { id: 3, name: "Auditor", description: "Create and manage audits" },
            { id: 4, name: "Analyst", description: "Read-only dashboard access" },
            { id: 5, name: "Viewer", description: "Read-only alert feed" },
          ]);
        });
    }
  }, [open, token]);

  async function onSubmit(data: FormValues) {
    setIsSubmitting(true);
    try {
      const newUser = await createUser(data, token);
      toast.success(`${newUser.name} has been added successfully`);
      onUserCreated(newUser);
      form.reset();
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create user";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add User</DialogTitle>
          <DialogDescription>
            Onboard a new team member. They'll receive access based on the assigned role.
          </DialogDescription>
        </DialogHeader>

        <form id="add-user-form" noValidate onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup className="gap-4 py-2">
            <Controller
              control={form.control}
              name="name"
              render={({ field, fieldState }) => (
                <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="add-user-name">Full Name</FieldLabel>
                  <Input
                    {...field}
                    id="add-user-name"
                    placeholder="Jane Doe"
                    autoComplete="off"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="email"
              render={({ field, fieldState }) => (
                <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="add-user-email">Email Address</FieldLabel>
                  <Input
                    {...field}
                    id="add-user-email"
                    type="email"
                    placeholder="jane.doe@sentinel.kpc"
                    autoComplete="off"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="password"
              render={({ field, fieldState }) => (
                <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="add-user-password">Temporary Password</FieldLabel>
                  <Input
                    {...field}
                    id="add-user-password"
                    type="password"
                    placeholder="Min. 8 characters"
                    autoComplete="new-password"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="role"
              render={({ field, fieldState }) => (
                <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="add-user-role">Role</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="add-user-role" aria-invalid={fieldState.invalid}>
                      <SelectValue placeholder="Select a role…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {roles.map((r) => (
                          <SelectItem key={r.id} value={r.name}>
                            <div className="flex flex-col">
                              <span className="font-medium">{r.name}</span>
                              {r.description && (
                                <span className="text-muted-foreground text-xs">{r.description}</span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="add-user-form" disabled={isSubmitting}>
            {isSubmitting ? "Adding…" : "Add User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
