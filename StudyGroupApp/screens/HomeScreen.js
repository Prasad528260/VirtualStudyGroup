import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Button, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import supabase from '../supabase';

export default function HomeScreen({ navigation }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchJoinedGroups();
    }, [])
  );

  async function fetchJoinedGroups() {
    setLoading(true);

    const user = (await supabase.auth.getUser()).data.user;
    if (!user) {
      Alert.alert("Error", "You must be logged in.");
      setLoading(false);
      return;
    }

    // Fetch user's group memberships
    const { data: memberships, error: membershipsError } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", user.id);

    if (membershipsError) {
      console.error("Error fetching group memberships:", membershipsError);
      setLoading(false);
      return;
    }

    if (!memberships || memberships.length === 0) {
      setGroups([]); // No groups joined
      setLoading(false);
      return;
    }

    // Extract group IDs
    const groupIds = memberships.map((gm) => gm.group_id);

    // Fetch group details
    const { data: groupsData, error: groupError } = await supabase
      .from("groups")
      .select("*")
      .in("id", groupIds);

    if (groupError) {
      console.error("Error fetching groups:", groupError);
      setGroups([]); // Reset groups on error
    } else {
      setGroups(groupsData);
    }

    setLoading(false);
  }

  // Realtime Listener for group updates
  useEffect(() => {
    const subscription = supabase
      .channel('realtime_groups')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'group_members' },
        (payload) => {
          console.log("Group membership changed:", payload);
          fetchJoinedGroups();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigation.replace('Login');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Study Groups</Text>

      {/* "Create Group" Button */}
      <Button title="Create Group" onPress={() => navigation.navigate('CreateGroup')} />

      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : groups.length === 0 ? (
        <Text style={styles.noGroupsText}>No groups found. Join or create one!</Text>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.groupItem}>
              <Text style={styles.groupName}>{item.name}</Text>
              <Text>{item.description}</Text>
            </View>
          )}
        />
      )}

      <Button title="Logout" onPress={handleLogout} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  noGroupsText: { fontSize: 16, textAlign: 'center', marginVertical: 20, color: 'gray' },
  groupItem: { padding: 15, marginBottom: 10, backgroundColor: '#f1f1f1', borderRadius: 10 },
  groupName: { fontSize: 18, fontWeight: 'bold' },
});
