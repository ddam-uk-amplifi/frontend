import { apiClient } from "./client";

export interface CustomDelivery {
  id: string;
  owner_id: string;
  report_name: string;
  delivery_type: "link" | "file";
  team_name: string;
  manager: string;
  creator_email: string;
  receiver_email: string;
  thread_link: string; // Slack thread URL where bot will post
  delivery_link?: string; // Content link for message body (格納先)
  qc_link?: string;
  delivery_date: string;
  status: "draft" | "scheduled" | "sent" | "failed";
  file_path?: string;
  file_name?: string;
  file_size?: number;
  created_at: string;
  updated_at: string;
  sent_at?: string;
}

export interface CustomDeliveryCreate {
  report_name: string;
  delivery_type: "link" | "file";
  team_name: string;
  manager?: string;
  creator_email: string;
  receiver_email: string;
  thread_link: string; // Slack thread URL where bot will post
  delivery_link?: string; // Content link for message body (格納先)
  qc_link?: string;
  delivery_date: string;
  custom_message?: string; // Custom edited message from preview
}

export interface CustomDeliveryUpdate {
  report_name?: string;
  delivery_type?: "link" | "file";
  team_name?: string;
  manager?: string;
  creator_email?: string;
  receiver_email?: string;
  thread_link?: string; // Slack thread URL where bot will post
  delivery_link?: string; // Content link for message body (格納先)
  qc_link?: string;
  delivery_date?: string;
  status?: "draft" | "scheduled" | "sent" | "failed";
}

export interface ReportSuggestion {
  report_name: string;
  delivery_link?: string;
  qc_link?: string;
  primary_author?: string;
  secondary_author?: string;
  deliverer?: string;
  similarity_score: number;
}

export interface ReportSuggestionsResponse {
  suggestions: ReportSuggestion[];
  query: string;
}

export interface CustomDeliveryList {
  items: CustomDelivery[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface ValidationResponse {
  valid: boolean;
  message: string;
}

export interface SendResponse {
  message: string;
  delivery_id: string;
  slack_message_id?: string;
  channel?: string;
}

class CustomDeliveryAPI {
  private basePath = "/api/v1/custom-delivery";

  async createDelivery(data: CustomDeliveryCreate): Promise<CustomDelivery> {
    const response = await apiClient.post<CustomDelivery>(
      `${this.basePath}/`,
      data,
    );
    return response.data;
  }

  async getDeliveries(params?: {
    page?: number;
    size?: number;
    status?: string;
    team_name?: string;
  }): Promise<CustomDeliveryList> {
    const response = await apiClient.get<CustomDeliveryList>(
      `${this.basePath}/`,
      {
        params,
      },
    );
    return response.data;
  }

  async getDelivery(id: string): Promise<CustomDelivery> {
    const response = await apiClient.get<CustomDelivery>(
      `${this.basePath}/${id}`,
    );
    return response.data;
  }

  async updateDelivery(
    id: string,
    data: CustomDeliveryUpdate,
  ): Promise<CustomDelivery> {
    const response = await apiClient.put<CustomDelivery>(
      `${this.basePath}/${id}`,
      data,
    );
    return response.data;
  }

  async deleteDelivery(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(
      `${this.basePath}/${id}`,
    );
    return response.data;
  }

  async uploadFile(id: string, file: File): Promise<CustomDelivery> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await apiClient.post<CustomDelivery>(
      `${this.basePath}/${id}/upload`,
      formData,
    );
    return response.data;
  }

  async downloadFile(id: string): Promise<Blob> {
    const response = await apiClient.get(`${this.basePath}/${id}/download`, {
      responseType: "blob",
    });
    return response.data;
  }

  async sendDelivery(id: string): Promise<SendResponse> {
    const response = await apiClient.post<SendResponse>(
      `${this.basePath}/${id}/send`,
    );
    return response.data;
  }

  async getReportSuggestions(
    query: string,
    limit: number = 5,
  ): Promise<ReportSuggestionsResponse> {
    const response = await apiClient.get<ReportSuggestionsResponse>(
      `${this.basePath}/suggestions`,
      {
        params: { q: query, limit },
      },
    );
    return response.data;
  }

  async validateLink(link: string): Promise<ValidationResponse> {
    const response = await apiClient.post<ValidationResponse>(
      `${this.basePath}/validate-link`,
      {},
      {
        params: { link },
      },
    );
    return response.data;
  }
}

export const customDeliveryAPI = new CustomDeliveryAPI();
