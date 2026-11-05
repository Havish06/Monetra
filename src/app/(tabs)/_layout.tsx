
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../constants/theme";

const tabs = [
  { name: "index", title: "Home", icon: "grid-outline", active: "grid" },
  { name: "accounts", title: "Money", icon: "wallet-outline", active: "wallet" },
  { name: "decide", title: "Decide", icon: "scan-outline", active: "scan" },
  { name: "plans", title: "Plans", icon: "calendar-outline", active: "calendar" },
  { name: "bills", title: "Bills", icon: "repeat-outline", active: "repeat" },
  { name: "ai", title: "Monetra AI", icon: "sparkles-outline", active: "sparkles" },
] as const;

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarStyle: {
          backgroundColor: theme.colors.background,
          borderTopColor: theme.colors.border,
          height: 66,
          paddingTop: 8,
          paddingBottom: 8,
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "500",
        },
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, focused, size }) => (
              <Ionicons
                name={(focused ? tab.active : tab.icon) as any}
                size={size}
                color={color}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
