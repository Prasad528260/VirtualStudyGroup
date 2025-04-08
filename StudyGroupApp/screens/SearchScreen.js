import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import supabase from "../supabase";

// Color palette
const colors = {
  background: "#121212",
  surface: "#1E1E1E",
  primary: "#BB86FC",
  secondary: "#03DAC6",
  text: "#E1E1E1",
  textSecondary: "#A0A0A0",
  error: "#CF6679",
};

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [groups, setGroups] = useState([]);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUser();
  }, []);

  async function fetchUser() {
    const { data: session, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error("Error fetching session:", error);
      return;
    }

    if (session?.session?.user) {
      setUserId(session.session.user.id);
    } else {
      console.log("User not logged in.");
      setUserId(null);
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      Alert.alert("Error", "Please enter a search term.");
      return;
    }

    if (!userId) {
      Alert.alert("Error", "You must be logged in to search.");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.rpc("search_groups", {
      search_term: `%${searchQuery}%`,
      uid: userId,
    });

    setLoading(false);
    
    if (error) {
      console.error("Search Error:", error);
      Alert.alert("Error", "Could not fetch groups.");
    } else {
      setGroups(data);
    }
  };

  const requestToJoin = async (groupId, hasRequested) => {
    if (!userId) {
      Alert.alert("Error", "You must be logged in to join a group.");
      return;
    }

    if (hasRequested) {
      Alert.alert("Info", "You have already sent a join request.");
      return;
    }

    const { error } = await supabase
      .from("join_requests")
      .insert([{ user_id: userId, group_id: groupId }]);

    if (error) {
      console.error("Join Request Error:", error);
      Alert.alert("Error", "Failed to send join request.");
    } else {
      Alert.alert("Success", "Join request sent!");
      handleSearch();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Discover Groups</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          placeholder="Search for study groups..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity onPress={handleSearch} style={styles.searchButton}>
          <Ionicons name="arrow-forward" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : groups.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={48} color={colors.textSecondary} />
          <Text style={styles.emptyText}>
            {searchQuery ? 'No matching groups found' : 'Search for study groups'}
          </Text>
          <Text style={styles.emptySubtext}>
            {searchQuery ? 'Try a different search term' : 'Enter a topic or group name'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.groupCard}
              onPress={() => requestToJoin(item.id, item.has_requested)}
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
              <View style={[
                styles.statusBadge,
                item.has_requested ? styles.statusSent : styles.statusJoin
              ]}>
                <Text style={styles.statusText}>
                  {item.has_requested ? "Request Sent" : "Join"}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 16,
  },
  header: {
    marginBottom: 24,
    marginTop: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: colors.text,
    height: '100%',
  },
  searchButton: {
    marginLeft: 8,
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
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusJoin: {
    backgroundColor: colors.primary,
  },
  statusSent: {
    backgroundColor: '#333',
  },
  statusText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 14,
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
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 20,
  },
});