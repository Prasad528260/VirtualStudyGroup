import React, { useState } from "react";
import { View, Text, TextInput, Button, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import supabase from "../supabase";

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [groups, setGroups] = useState([]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    const { data, error } = await supabase
      .from("groups")
      .select("*")
      .ilike("name", `%${searchQuery}%`);

    if (error) console.error("Search Error:", error);
    else setGroups(data);
  };

  const requestToJoin = async (groupId) => {
    const { data: user } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("join_requests")
      .insert([{ user_id: user.id, group_id: groupId }]);

    if (error) console.error("Join Request Error:", error);
    else alert("Join request sent!");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Search Groups</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter group name..."
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
      <Button title="Search" onPress={handleSearch} />

      <FlatList
        data={groups}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.groupItem} onPress={() => requestToJoin(item.id)}>
            <Text style={styles.groupName}>{item.name}</Text>
            <Text>{item.description}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 10 },
  input: { borderWidth: 1, padding: 10, marginBottom: 10 },
  groupItem: { padding: 15, backgroundColor: "#ddd", marginVertical: 5, borderRadius: 5 },
  groupName: { fontSize: 18, fontWeight: "bold" },
});
