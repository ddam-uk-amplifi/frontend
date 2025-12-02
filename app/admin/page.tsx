"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Building2, Globe } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth';
import { clientsApi, marketsApi, type Client, type Market } from '@/lib/api/admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

export default function AdminPage(){
    const router = useRouter();
    const { user, isLoading: authLoading, hasHydrated } = useAuthStore();
    const [isChecking, setIsChecking] = useState(true);

    // Clients state
    const [clients, setClients] = useState<Client[]>([]);
    const [clientsLoading, setClientsLoading] = useState(false);
    const [newClientName, setNewClientName] = useState('');
    const [isAddingClient, setIsAddingClient] = useState(false);

    // Markets state
    const [markets, setMarkets] = useState<Market[]>([]);
    const [marketsLoading, setMarketsLoading] = useState(false);
    const [newMarketCode, setNewMarketCode] = useState('');
    const [newMarketName, setNewMarketName] = useState('');
    const [selectedClientId, setSelectedClientId] = useState<string>('');
    const [isAddingMarket, setIsAddingMarket] = useState(false);

    // Delete confirmation state
    const [deleteDialog, setDeleteDialog] = useState<{
        open: boolean;
        type: 'client' | 'market';
        id: number;
        name: string;
    } | null>(null);

    useEffect(() => {
        // Wait for auth store to hydrate
        if (!hasHydrated) return;

        // Check if user is superuser
        if (!authLoading) {
            if (!user || !user.is_superuser) {
                router.push('/dashboard');
                return;
            }
            setIsChecking(false);
            // Load initial data
            fetchClients();
            fetchMarkets();
        }
    }, [user, authLoading, hasHydrated, router]);

    // Fetch clients
    const fetchClients = async () => {
        try {
            setClientsLoading(true);
            const response = await clientsApi.getClients();
            setClients(response?.clients || []);
        } catch (error) {
            console.error('Error fetching clients:', error);
            setClients([]);
        } finally {
            setClientsLoading(false);
        }
    };

    // Fetch markets
    const fetchMarkets = async () => {
        try {
            setMarketsLoading(true);
            const response = await marketsApi.getMarkets();
            setMarkets(response?.markets || []);
        } catch (error) {
            console.error('Error fetching markets:', error);
            setMarkets([]);
        } finally {
            setMarketsLoading(false);
        }
    };

    // Add new client
    const handleAddClient = async () => {
        if (!newClientName.trim()) {
            alert('Please enter a client name');
            return;
        }

        try {
            setIsAddingClient(true);
            await clientsApi.createClient({ name: newClientName.trim() });
            setNewClientName('');
            await fetchClients();
        } catch (error: any) {
            alert(error.response?.data?.detail || 'Failed to create client');
        } finally {
            setIsAddingClient(false);
        }
    };

    // Add new market
    const handleAddMarket = async () => {
        if (!newMarketCode.trim() || !newMarketName.trim()) {
            alert('Please enter both market code and name');
            return;
        }

        if (!selectedClientId) {
            alert('Please select a client for this market');
            return;
        }

        try {
            setIsAddingMarket(true);
            await marketsApi.createMarket({
                code: newMarketCode.trim(),
                name: newMarketName.trim(),
                client_id: parseInt(selectedClientId),
            });
            setNewMarketCode('');
            setNewMarketName('');
            setSelectedClientId('');
            await fetchMarkets();
        } catch (error: any) {
            alert(error.response?.data?.detail || 'Failed to create market');
        } finally {
            setIsAddingMarket(false);
        }
    };

    // Delete client or market
    const handleDelete = async () => {
        if (!deleteDialog) return;

        try {
            if (deleteDialog.type === 'client') {
                await clientsApi.deleteClient(deleteDialog.id);
                await fetchClients();
            } else {
                await marketsApi.deleteMarket(deleteDialog.id);
                await fetchMarkets();
            }
            setDeleteDialog(null);
        } catch (error: any) {
            alert(error.response?.data?.detail || `Failed to delete ${deleteDialog.type}`);
        }
    };

    // Show loading state while checking permissions
    if (isChecking || authLoading || !hasHydrated) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="mt-2 text-sm text-gray-600">Verifying permissions...</p>
                </div>
            </div>
        );
    }

    // Only render if user is superuser
    if (!user?.is_superuser) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Panel</h1>
                    <p className="text-gray-600">Manage clients and markets for the report automation system.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Client Management */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Building2 className="h-5 w-5" />
                                Client Management
                            </CardTitle>
                            <CardDescription>
                                Add and manage client companies
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Add Client Form */}
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <Input
                                        placeholder="Enter client name (e.g., Arla)"
                                        value={newClientName}
                                        onChange={(e) => setNewClientName(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleAddClient()}
                                        disabled={isAddingClient}
                                    />
                                </div>
                                <Button
                                    onClick={handleAddClient}
                                    disabled={isAddingClient || !newClientName.trim()}
                                    size="sm"
                                >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Add
                                </Button>
                            </div>

                            {/* Clients List */}
                            <div className="border rounded-lg">
                                {clientsLoading ? (
                                    <div className="p-4 text-center text-sm text-gray-500">
                                        Loading clients...
                                    </div>
                                ) : !clients || clients.length === 0 ? (
                                    <div className="p-4 text-center text-sm text-gray-500">
                                        No clients yet. Add one above.
                                    </div>
                                ) : (
                                    <div className="divide-y">
                                        {(clients || []).map((client) => (
                                            <div
                                                key={client.id}
                                                className="flex items-center justify-between p-3 hover:bg-gray-50"
                                            >
                                                <div>
                                                    <p className="font-medium text-gray-900">{client.name}</p>
                                                    <p className="text-xs text-gray-500">
                                                        ID: {client.id} • Created: {new Date(client.created_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() =>
                                                        setDeleteDialog({
                                                            open: true,
                                                            type: 'client',
                                                            id: client.id,
                                                            name: client.name,
                                                        })
                                                    }
                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Market Management */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Globe className="h-5 w-5" />
                                Market Management
                            </CardTitle>
                            <CardDescription>
                                Add and manage market regions
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Add Market Form */}
                            <div className="space-y-3">
                                <div>
                                    <Label className="text-sm text-gray-600 mb-1.5 block">Select Client</Label>
                                    <Select
                                        value={selectedClientId}
                                        onValueChange={setSelectedClientId}
                                        disabled={isAddingMarket || clients.length === 0}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder={clients.length === 0 ? "No clients available" : "Select a client"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {clients.map((client) => (
                                                <SelectItem key={client.id} value={client.id.toString()}>
                                                    {client.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex gap-2">
                                    <div className="w-1/3">
                                        <Input
                                            placeholder="Code (DK)"
                                            value={newMarketCode}
                                            onChange={(e) => setNewMarketCode(e.target.value.toUpperCase())}
                                            maxLength={5}
                                            disabled={isAddingMarket}
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <Input
                                            placeholder="Name (Denmark)"
                                            value={newMarketName}
                                            onChange={(e) => setNewMarketName(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && handleAddMarket()}
                                            disabled={isAddingMarket}
                                        />
                                    </div>
                                    <Button
                                        onClick={handleAddMarket}
                                        disabled={isAddingMarket || !newMarketCode.trim() || !newMarketName.trim() || !selectedClientId}
                                        size="sm"
                                    >
                                        <Plus className="h-4 w-4 mr-1" />
                                        Add
                                    </Button>
                                </div>
                            </div>

                            {/* Markets List */}
                            <div className="border rounded-lg">
                                {marketsLoading ? (
                                    <div className="p-4 text-center text-sm text-gray-500">
                                        Loading markets...
                                    </div>
                                ) : !markets || markets.length === 0 ? (
                                    <div className="p-4 text-center text-sm text-gray-500">
                                        No markets yet. Add one above.
                                    </div>
                                ) : (
                                    <div className="divide-y">
                                        {(markets || []).map((market) => {
                                            const client = clients.find(c => c.id === market.client_id);
                                            return (
                                                <div
                                                    key={market.id}
                                                    className="flex items-center justify-between p-3 hover:bg-gray-50"
                                                >
                                                    <div>
                                                        <p className="font-medium text-gray-900">
                                                            <span className="inline-block bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-semibold mr-2">
                                                                {market.code}
                                                            </span>
                                                            {market.name}
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            ID: {market.id} • Client: <span className="font-medium">{client?.name || 'Unknown'}</span> • Created: {new Date(market.created_at).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() =>
                                                            setDeleteDialog({
                                                                open: true,
                                                                type: 'market',
                                                                id: market.id,
                                                                name: `${market.code} - ${market.name}`,
                                                            })
                                                        }
                                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialog?.open || false} onOpenChange={(open) => !open && setDeleteDialog(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the {deleteDialog?.type} "{deleteDialog?.name}".
                            {deleteDialog?.type === 'client' && (
                                <span className="block mt-2 text-red-600 font-medium">
                                    Warning: This will also delete all associated tracker files and consolidation jobs.
                                </span>
                            )}
                            {deleteDialog?.type === 'market' && (
                                <span className="block mt-2 text-red-600 font-medium">
                                    Warning: This will also delete all associated tracker files.
                                </span>
                            )}
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}