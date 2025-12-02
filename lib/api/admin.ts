import { apiClient } from "./client";

// Client Types
export interface Client {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface ClientCreate {
  name: string;
}

export interface ClientsResponse {
  total: number;
  clients: Client[];
}

// Market Types
export interface Market {
  id: number;
  code: string;
  name: string;
  created_at: string;
}

export interface MarketCreate {
  code: string;
  name: string;
}

export interface MarketsResponse {
  total: number;
  markets: Market[];
}

export interface DeleteResponse {
  message: string;
}

// Client API
export const clientsApi = {
  // Get all clients
  getClients: async (): Promise<ClientsResponse> => {
    const response = await apiClient.get("/api/v1/clients");
    return response.data;
  },

  // Get client by ID
  getClient: async (clientId: number): Promise<Client> => {
    const response = await apiClient.get(`/api/v1/clients/${clientId}`);
    return response.data;
  },

  // Create new client
  createClient: async (data: ClientCreate): Promise<Client> => {
    const response = await apiClient.post("/api/v1/clients", data);
    return response.data;
  },

  // Delete client
  deleteClient: async (clientId: number): Promise<DeleteResponse> => {
    const response = await apiClient.delete(`/api/v1/clients/${clientId}`);
    return response.data;
  },
};

// Market API
export const marketsApi = {
  // Get all markets
  getMarkets: async (): Promise<MarketsResponse> => {
    const response = await apiClient.get("/api/v1/markets");
    return response.data;
  },

  // Get market by ID
  getMarket: async (marketId: number): Promise<Market> => {
    const response = await apiClient.get(`/api/v1/markets/${marketId}`);
    return response.data;
  },

  // Create new market
  createMarket: async (data: MarketCreate): Promise<Market> => {
    const response = await apiClient.post("/api/v1/markets", data);
    return response.data;
  },

  // Delete market
  deleteMarket: async (marketId: number): Promise<DeleteResponse> => {
    const response = await apiClient.delete(`/api/v1/markets/${marketId}`);
    return response.data;
  },
};
