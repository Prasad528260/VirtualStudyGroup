import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import HomeNavigator from "./HomeNavigator"; // Home with Tabs
import CreateGroupScreen from "../screens/CreateGroupScreen";

const Stack = createStackNavigator();

export default function MainNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeTabs" component={HomeNavigator} />
      <Stack.Screen name="CreateGroup" component={CreateGroupScreen} />
    </Stack.Navigator>
  );
}
