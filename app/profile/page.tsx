"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { handleApiError } from "@/lib/api/client";
import { usersApi } from "@/lib/api/users";
import { useAuthStore } from "@/lib/stores/auth";
import {
  type UserUpdateFormData,
  type UserUpdatePasswordFormData,
  userUpdatePasswordSchema,
  userUpdateSchema,
} from "@/lib/validations/schemas";

export default function ProfilePage() {
  const { user, updateProfile, isLoading } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const profileForm = useForm<UserUpdateFormData>({
    resolver: zodResolver(userUpdateSchema),
    defaultValues: {
      username: user?.username || "",
      email: user?.email || "",
    },
  });

  const passwordForm = useForm<UserUpdatePasswordFormData>({
    resolver: zodResolver(userUpdatePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const handleUpdateProfile = async (data: UserUpdateFormData) => {
    try {
      setError(null);
      setSuccess(null);

      await updateProfile(data);
      setSuccess("Profile updated successfully!");
    } catch (err) {
      setError(handleApiError(err));
    }
  };

  const handleUpdatePassword = async (data: UserUpdatePasswordFormData) => {
    try {
      setPasswordLoading(true);
      setError(null);
      setSuccess(null);

      await usersApi.updateCurrentUserPassword({
        current_password: data.currentPassword,
        new_password: data.newPassword,
      });

      setSuccess("Password updated successfully!");
      passwordForm.reset();
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setPasswordLoading(false);
    }
  };

  const getRoleBadgeVariant = (role?: string) => {
    switch (role) {
      case "admin":
        return "destructive";
      case "moderator":
        return "secondary";
      default:
        return "default";
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Alert>
          <AlertDescription>
            Unable to load user profile. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="container mx-auto py-10">
        <h1 className="text-3xl font-bold mb-8">Profile</h1>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-lg">
                  {user.email.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-semibold">
                  {user.email.split("@")[0]}
                </h2>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">
                  Username
                </h4>
                <p className="text-sm">{user.username || "Not set"}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">
                  Status
                </h4>
                <Badge variant={user.is_active ? "default" : "secondary"}>
                  {user.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">
                  Member Since
                </h4>
                <p className="text-sm">
                  {user.created_at
                    ? format(new Date(user.created_at), "MMMM yyyy")
                    : "N/A"}
                </p>
              </div>

              <div className="col-span-2">
                <h4 className="text-sm font-medium text-muted-foreground mb-1">
                  Last Updated
                </h4>
                <p className="text-sm">
                  {user.updated_at
                    ? format(new Date(user.updated_at), "MMM dd, yyyy")
                    : "N/A"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList>
            <TabsTrigger value="profile">Profile Settings</TabsTrigger>
            <TabsTrigger value="password">Change Password</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your account information here.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(error || success) && (
                  <Alert
                    variant={error ? "destructive" : "default"}
                    className={`mb-4 ${success ? "border-green-200 bg-green-50 text-green-800 [&>svg]:text-green-600" : ""}`}
                  >
                    <AlertDescription
                      className={success ? "text-green-800" : ""}
                    >
                      {error || success}
                    </AlertDescription>
                  </Alert>
                )}

                <Form {...profileForm}>
                  <form
                    onSubmit={profileForm.handleSubmit(handleUpdateProfile)}
                    className="space-y-4"
                  >
                    <FormField
                      control={profileForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              placeholder="Enter your username"
                              disabled={isLoading}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="Enter your email"
                              disabled={isLoading}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div>
                      <Button type="submit" disabled={isLoading}>
                        {isLoading ? "Updating..." : "Update Profile"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="password">
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>
                  Update your password to keep your account secure.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...passwordForm}>
                  <form
                    onSubmit={passwordForm.handleSubmit(handleUpdatePassword)}
                    className="space-y-4"
                  >
                    <FormField
                      control={passwordForm.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Enter your current password"
                              disabled={passwordLoading}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={passwordForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Enter your new password"
                              disabled={passwordLoading}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={passwordForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm New Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Confirm your new password"
                              disabled={passwordLoading}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div>
                      <Button type="submit" disabled={passwordLoading}>
                        {passwordLoading ? "Updating..." : "Update Password"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedRoute>
  );
}
