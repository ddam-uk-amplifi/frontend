"use client";

import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { UserDialog } from "@/components/users/user-dialog";
import { UserViewDialog } from "@/components/users/user-view-dialog";
import { UsersDataTable } from "@/components/users/users-data-table";
import { handleApiError } from "@/lib/api/client";
import { useAuthStore } from "@/lib/stores/auth";
import { useUsersStore } from "@/lib/stores/users";
import type { User, UserRole } from "@/lib/types/api";
import type {
  UserCreateFormData,
  UserUpdateFormData,
} from "@/lib/validations/schemas";

export default function UsersPage() {
  const { user: currentUser } = useAuthStore();
  const {
    users,
    isLoading,
    error,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    clearError,
  } = useUsersStore();

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dialogLoading, setDialogLoading] = useState(false);

  // Check if current user is admin or moderator
  const canManageUsers =
    currentUser?.role === "admin" || currentUser?.role === "moderator";
  const canCreateUsers = currentUser?.role === "admin";

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreateUser = async (data: UserCreateFormData) => {
    try {
      setDialogLoading(true);
      await createUser({
        email: data.email,
        password: data.password,
        role: data.role as UserRole,
        username: data.username,
        team: data.team,
        bpo_role: data.bpo_role,
      });
    } catch (err) {
      throw new Error(handleApiError(err));
    } finally {
      setDialogLoading(false);
    }
  };

  const handleUpdateUser = async (data: UserUpdateFormData) => {
    if (!selectedUser) return;

    try {
      setDialogLoading(true);
      await updateUser(selectedUser.id, {
        email: data.email || undefined,
        username: data.username || undefined,
        team: data.team || undefined,
        bpo_role: data.bpo_role || undefined,
        role: data.role as UserRole,
        is_active: data.is_active,
      });
    } catch (err) {
      throw new Error(handleApiError(err));
    } finally {
      setDialogLoading(false);
    }
  };

  const handleCreateNew = () => {
    setSelectedUser(null);
    setUserDialogOpen(true);
  };

  const handleDialogSubmit = async (
    data: UserCreateFormData | UserUpdateFormData,
  ) => {
    if (selectedUser) {
      await handleUpdateUser(data as UserUpdateFormData);
    } else {
      await handleCreateUser(data as UserCreateFormData);
    }
  };

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setViewDialogOpen(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setUserDialogOpen(true);
  };

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedUser) return;

    try {
      setDialogLoading(true);
      await deleteUser(selectedUser.id);
      setDeleteDialogOpen(false);
      setSelectedUser(null);
    } catch (err) {
      console.error("Failed to delete user:", err);
    } finally {
      setDialogLoading(false);
    }
  };

  if (!canManageUsers) {
    return (
      <ProtectedRoute>
        <div className="flex items-center justify-center min-h-[400px]">
          <Alert className="max-w-md">
            <AlertDescription>
              You don't have permission to view this page. Contact your
              administrator for access.
            </AlertDescription>
          </Alert>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="container mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Users</h1>
            <p className="text-muted-foreground">
              Manage user accounts and permissions
            </p>
          </div>
          {canCreateUsers && (
            <Button onClick={handleCreateNew}>
              <Plus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          )}
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>
              {error}
              <Button
                variant="link"
                className="ml-2 h-auto p-0"
                onClick={clearError}
              >
                Dismiss
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <UsersDataTable
          data={users}
          isLoading={isLoading}
          onViewUser={handleViewUser}
          onEditUser={handleEditUser}
          onDeleteUser={handleDeleteUser}
        />

        <UserDialog
          open={userDialogOpen}
          onOpenChange={setUserDialogOpen}
          user={selectedUser}
          onSubmit={handleDialogSubmit}
          isLoading={dialogLoading}
        />

        <UserViewDialog
          open={viewDialogOpen}
          onOpenChange={setViewDialogOpen}
          user={selectedUser}
        />

        <ConfirmationDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Delete User"
          description={`Are you sure you want to delete ${selectedUser?.email}? This action cannot be undone.`}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onConfirm={handleConfirmDelete}
          loading={dialogLoading}
          variant="destructive"
        />
      </div>
    </ProtectedRoute>
  );
}
