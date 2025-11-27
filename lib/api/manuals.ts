import { apiClient } from "./client";

export interface TitleAvailabilityResponse {
  available: boolean;
  title: string;
}

export const manualsApi = {
  /**
   * Check if a manual title is available (not already taken)
   */
  async checkTitleAvailability(
    title: string,
  ): Promise<TitleAvailabilityResponse> {
    const response = await apiClient.get(
      `/api/v1/manuals/check-title/${encodeURIComponent(title)}`,
    );
    return response.data;
  },
};
