import React, { useEffect, useState, useCallback } from "react";
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  ActivityIndicator, 
  TouchableOpacity,
  SafeAreaView,
  StatusBar
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { Ionicons } from "@expo/vector-icons";
import supabase from "../supabase";
import ToDoScreen from "./ToDoScreen";
import AssignmentManager from "./AssignmentManager";

// Dark mode color palette
const colors = {
  background: "#121212",
  surface: "#1E1E1E",
  primary: "#BB86FC",
  secondary: "#03DAC6",
  text: "#E1E1E1",
  textSecondary: "#A0A0A0",
};

// Home Screen Component
function HomeScreen({ navigation }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchUserAndGroups();
    }, [])
  );

  async function fetchUserAndGroups() {
    setLoading(true);
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) {
      Alert.alert("Error", "You must be logged in.");
      setLoading(false);
      return;
    }

    const { data: memberships, error } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", user.id);

    if (error) {
      console.error("Error:", error);
      setLoading(false);
      return;
    }

    if (!memberships?.length) {
      setGroups([]);
      setLoading(false);
      return;
    }

    const { data: groupsData } = await supabase
      .from("groups")
      .select("*")
      .in("id", memberships.map(gm => gm.group_id));

    setGroups(groupsData || []);
    setLoading(false);
  }

  const renderGroupItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.groupCard}
      onPress={() => navigation.navigate("ChatScreen", { groupId: item.id })}
    >
      <View style={styles.groupIcon}>
        <Ionicons name="people" size={24} color={colors.primary} />
      </View>
      <View style={styles.groupInfo}>
        <Text style={styles.groupName}>{item.name}</Text>
        <Text style={styles.groupDescription} numberOfLines={1}>
          {item.description || "Study group"}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <Text style={styles.title}>My Study Groups</Text>
        <TouchableOpacity 
          style={styles.createButton}
          onPress={() => navigation.navigate("CreateGroup")}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : groups.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={48} color={colors.textSecondary} />
          <Text style={styles.emptyText}>No groups yet</Text>
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={() => navigation.navigate("CreateGroup")}
          >
            <Text style={styles.buttonText}>Create Your First Group</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={groups}
          renderItem={renderGroupItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

// Drawer Navigator
const Drawer = createDrawerNavigator();

export default function AppNavigator() {
  return (
    <Drawer.Navigator
      screenOptions={{
        drawerStyle: {
          backgroundColor: colors.surface,
          width: 240,
        },
        drawerActiveTintColor: colors.primary,
        drawerInactiveTintColor: colors.text,
        drawerLabelStyle: {
          marginLeft: -16,
          fontSize: 16,
        },
        headerStyle: {
          backgroundColor: colors.surface,
          shadowColor: 'transparent',
          elevation: 0,
        },
        headerTitleStyle: {
          color: colors.text,
          fontWeight: 'bold',
        },
        headerTintColor: colors.primary,
        sceneContainerStyle: {
          backgroundColor: colors.background,
        }
      }}
    >
      <Drawer.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{
          drawerIcon: ({ color }) => (
            <Ionicons name="home" size={22} color={color} />
          ),
          title: 'Study Groups'
        }}
      />
      <Drawer.Screen 
        name="To-Do List" 
        component={ToDoScreen} 
        options={{
          drawerIcon: ({ color }) => (
            <Ionicons name="list" size={22} color={color} />
          ),
        }}
      />
      <Drawer.Screen 
        name="Assignments" 
        component={AssignmentManager} 
        options={{
          drawerIcon: ({ color }) => (
            <Ionicons name="document-text" size={22} color={color} />
          ),
        }}
      />
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  createButton: {
    backgroundColor: colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupIcon: {
    backgroundColor: '#2A2A2A',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  groupDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  loader: {
    marginTop: 40,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 16,
  },
  listContent: {
    paddingBottom: 20,
  },
});