import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import supabase from "../supabase";

// Enhanced color palette
const colors = {
  background: "#121212",
  surface: "#1E1E1E",
  primary: "#BB86FC",
  secondary: "#03DAC6",
  text: "#E1E1E1",
  textSecondary: "#A0A0A0",
  error: "#CF6679",
  success: "#4CAF50",
};

export default function CreateGroupScreen({ navigation }) {
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [nameError, setNameError] = useState("");
  const [isNameAvailable, setIsNameAvailable] = useState(false);

  // Check group name availability
  useEffect(() => {
    const checkGroupName = async () => {
      if (!groupName.trim()) {
        setNameError("");
        setIsNameAvailable(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("groups")
          .select("name")
          .eq("name", groupName.trim())
          .single();

        if (error && error.code !== "PGRST116") throw error;

        if (data) {
          setNameError("Group name already exists");
          setIsNameAvailable(false);
        } else {
          setNameError("");
          setIsNameAvailable(true);
        }
      } catch (error) {
        console.error("Error checking group name:", error);
        setNameError("Error checking name availability");
        setIsNameAvailable(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      checkGroupName();
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [groupName]);

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert("Error", "Group name cannot be empty.");
      return;
    }

    if (!isNameAvailable) {
      Alert.alert("Error", "Please choose a unique group name.");
      return;
    }

    setLoading(true);
    const user = (await supabase.auth.getUser()).data.user;

    if (!user) {
      Alert.alert("Error", "You must be logged in.");
      setLoading(false);
      return;
    }

    try {
      const { data: newGroup, error: groupError } = await supabase
        .from("groups")
        .insert([{ 
          name: groupName.trim(), 
          description: description.trim(), 
          created_by: user.id 
        }])
        .select("id")
        .single();

      if (groupError) throw groupError;

      const { error: memberError } = await supabase
        .from("group_members")
        .insert([{ group_id: newGroup.id, user_id: user.id }]);

      if (memberError) {
        Alert.alert("Success", "Group created! (Membership error)");
      } else {
        Alert.alert("Success", "Group created successfully!");
        navigation.goBack();
      }
    } catch (error) {
      console.error("Error:", error);
      Alert.alert("Error", error.message || "Failed to create group");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Create New Group</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <View style={styles.labelContainer}>
              <Text style={styles.label}>Group Name</Text>
              {isNameAvailable && groupName.trim() && (
                <Text style={styles.availableText}>Available</Text>
              )}
            </View>
            <TextInput
              style={[
                styles.input,
                nameError ? styles.inputError : {},
                isNameAvailable ? styles.inputSuccess : {}
              ]}
              placeholder="Enter unique group name"
              placeholderTextColor={colors.textSecondary}
              value={groupName}
              onChangeText={setGroupName}
              autoFocus={true}
              autoCapitalize="words"
              maxLength={50}
            />
            {nameError ? (
              <Text style={styles.errorText}>{nameError}</Text>
            ) : (
              <Text style={styles.hintText}>50 characters max</Text>
            )}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="Enter description (optional)"
              placeholderTextColor={colors.textSecondary}
              value={description}
              onChangeText={setDescription}
              multiline={true}
              numberOfLines={4}
              maxLength={200}
            />
            <Text style={styles.hintText}>{description.length}/200 characters</Text>
          </View>

          <TouchableOpacity
            style={[
              styles.button, 
              (!isNameAvailable || loading) && styles.buttonDisabled
            ]}
            onPress={handleCreateGroup}
            disabled={!isNameAvailable || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Create Group</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  backButton: {
    padding: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.text,
  },
  formContainer: {
    flex: 1,
    padding: 20,
  },
  inputContainer: {
    marginBottom: 25,
  },
  labelContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  input: {
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.surface,
  },
  inputError: {
    borderColor: colors.error,
  },
  inputSuccess: {
    borderColor: colors.success,
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
    marginTop: 20,
  },
  buttonDisabled: {
    backgroundColor: colors.textSecondary,
  },
  buttonText: {
    color: "#000",
    fontWeight: "600",
    fontSize: 16,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    marginTop: 5,
  },
  hintText: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 5,
  },
  availableText: {
    color: colors.success,
    fontSize: 14,
    fontWeight: "600",
  },
});