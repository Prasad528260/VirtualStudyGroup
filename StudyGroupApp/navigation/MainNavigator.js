import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import HomeNavigator from "./HomeNavigator"; // Home with Tabs
import CreateGroupScreen from "../screens/CreateGroupScreen";
import ChatScreen from "../screens/ChatScreen";
import JoinRequestsScreen from '../screens/JoinRquestsScreen'
import GroupDetailsScreen from "../screens/GroupDetailsScreen";

const Stack = createStackNavigator();

export default function MainNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeTabs" component={HomeNavigator} />
      <Stack.Screen name="CreateGroup" component={CreateGroupScreen} />
      <Stack.Screen name="ChatScreen" component={ChatScreen} />
      <Stack.Screen name="JoinRequests" component={JoinRequestsScreen} />
      <Stack.Screen name="GroupDetails" component={GroupDetailsScreen} />
      <Stack.Screen name="JoinRequestsScreen" component={JoinRequestsScreen} />
    </Stack.Navigator>
  );
}
