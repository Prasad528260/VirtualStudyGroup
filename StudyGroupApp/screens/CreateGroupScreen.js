import React, { useState } from "react";
import { View, Text, TextInput, Button, Alert, StyleSheet } from "react-native";
import supabase from "../supabase";

export default function CreateGroupScreen({ navigation }) {
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert("Error", "Group name cannot be empty.");
      return;
    }

    const user = (await supabase.auth.getUser()).data.user;
    console.log("Current User:", user);

    if (!user) {
      Alert.alert("Error", "You must be logged in.");
      return;
    }

    // Step 1: Create the group
    const { data: newGroup, error: groupError } = await supabase
      .from("groups")
      .insert([{ name: groupName, description: description, created_by: user.id }])
      .select("id") // Only select the ID to avoid unnecessary data fetching
      .single();

    if (groupError) {
      console.error("Error creating group:", groupError);
      Alert.alert("Error", groupError.message);
      return;
    }

    console.log("Group Created:", newGroup);

    // Step 2: Add the creator to `group_members`
    const { data: addedMember, error: memberError } = await supabase
      .from("group_members")
      .insert([{ group_id: newGroup.id, user_id: user.id }])
      .select() // Fetch inserted data for debugging
      .single();

    if (memberError) {
      console.error("Error adding creator to group_members:", memberError);
      Alert.alert("Error", "Group created, but you were not added as a member.");
    } else {
      console.log("Creator added to group_members:", addedMember);
      Alert.alert("Success", "Group created successfully!");
      navigation.goBack();
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Group Name</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter group name"
        value={groupName}
        onChangeText={setGroupName}
      />
      <Text style={styles.label}>Description</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter description"
        value={description}
        onChangeText={setDescription}
      />
      <Button title="Create Group" onPress={handleCreateGroup} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  label: { fontSize: 18, fontWeight: "bold", marginBottom: 5 },
  input: {
    height: 40,
    borderColor: "gray",
    borderWidth: 1,
    marginBottom: 15,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
});
