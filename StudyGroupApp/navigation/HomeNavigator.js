import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import HomeScreen from "../screens/HomeScreen";
import SearchScreen from "../screens/SearchScreen";
import ProfileScreen from "../screens/ProfileScreen";
import CreateGroupScreen from "../screens/CreateGroupScreen";
import { Ionicons } from "@expo/vector-icons";

const Tab = createBottomTabNavigator();

// Color palette
const colors = {
  background: "#121212",
  surface: "#1E1E1E",
  primary: "#BB86FC",
  secondary: "#03DAC6",
  text: "#E1E1E1",
  textSecondary: "#A0A0A0",
};

export default function HomeNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          
          if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Search") {
            iconName = focused ? "search" : "search-outline";
          } else if (route.name === "Profile") {
            iconName = focused ? "person" : "person-outline";
          } else if (route.name === "CreateGroup") {
            iconName = focused ? "add-circle" : "add-circle-outline";
          }
          
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          marginBottom: 4,
        },
        headerStyle: {
          backgroundColor: colors.surface,
          shadowColor: "transparent",
          elevation: 0,
        },
        headerTitleStyle: {
          color: colors.text,
          fontWeight: "bold",
        },
        headerTintColor: colors.primary,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{ title: "My Groups" }} 
      />
      <Tab.Screen 
        name="Search" 
        component={SearchScreen} 
        options={{ title: "Discover" }} 
      />
      <Tab.Screen 
        name="CreateGroup" 
        component={CreateGroupScreen} 
        options={{ title: "New Group" }} 
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ title: "Profile" }} 
      />
    </Tab.Navigator>
  );
}