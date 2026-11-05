
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Profile } from "../context/AuthContext";
import type { DashboardData } from "../services/api";

const profileKey = (userId: string) => `monetra_profile_${userId}`;
const dashboardKey = (userId: string) => `monetra_dashboard_${userId}`;

export async function saveProfileCache(
  userId: string,
  profile: Profile
) {
  try {
    await AsyncStorage.setItem(
      profileKey(userId),
      JSON.stringify(profile)
    );
  } catch (error) {
    console.warn("Profile cache save failed:", error);
  }
}

export async function getProfileCache(
  userId: string
): Promise<Profile | null> {
  try {
    const value = await AsyncStorage.getItem(profileKey(userId));
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

export async function saveDashboardCache(
  userId: string,
  dashboard: DashboardData
) {
  try {
    await AsyncStorage.setItem(
      dashboardKey(userId),
      JSON.stringify(dashboard)
    );
  } catch (error) {
    console.warn("Dashboard cache save failed:", error);
  }
}

export async function getDashboardCache(
  userId: string
): Promise<DashboardData | null> {
  try {
    const value = await AsyncStorage.getItem(dashboardKey(userId));
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}


export async function clearDashboardCache(userId: string) {
  try {
    await AsyncStorage.removeItem(dashboardKey(userId));
  } catch (error) {
    console.warn("Dashboard cache clear failed:", error);
  }
}


export async function clearUserCache(userId: string) {
  try {
    await AsyncStorage.multiRemove([
      profileKey(userId),
      dashboardKey(userId),
    ]);
  } catch (error) {
    console.warn("Cache clear failed:", error);
  }
}

