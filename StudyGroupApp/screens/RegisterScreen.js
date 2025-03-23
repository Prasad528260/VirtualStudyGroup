import React, { useState } from "react";
import { View, Text, TextInput, Button, Alert } from "react-native";
import supabase from "../supabase";

export default function RegisterScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState(""); // Add name field

  const handleRegister = async () => {
    // Sign up user
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    // Get user ID from Supabase Auth
    const user = data?.user;
    if (!user) {
      Alert.alert("Error", "User registration failed.");
      return;
    }

    // Insert user details into the `users` table
    const { error: insertError } = await supabase.from("users").insert([
      { id: user.id, email, name }, // Ensure name is inserted
    ]);

    if (insertError) {
      Alert.alert("Error", insertError.message);
      return;
    }

    Alert.alert("Success", "Check your email to confirm your account.");
    navigation.navigate("Login");
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>Register</Text>
      <TextInput
        placeholder="Name"
        onChangeText={setName}
        value={name}
        style={{ borderWidth: 1, marginBottom: 10, padding: 8 }}
      />
      <TextInput
        placeholder="Email"
        onChangeText={setEmail}
        value={email}
        style={{ borderWidth: 1, marginBottom: 10, padding: 8 }}
      />
      <TextInput
        placeholder="Password"
        onChangeText={setPassword}
        value={password}
        secureTextEntry
        style={{ borderWidth: 1, marginBottom: 10, padding: 8 }}
      />
      <Button title="Register" onPress={handleRegister} />
      <Button title="Back to Login" onPress={() => navigation.navigate("Login")} />
    </View>
  );
}
