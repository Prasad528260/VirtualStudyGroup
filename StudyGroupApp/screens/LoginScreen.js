import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import supabase from '../supabase';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    const { user, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) Alert.alert('Error', error.message);
    else navigation.replace('Home');
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>Login</Text>
      <TextInput placeholder="Email" onChangeText={setEmail} value={email} style={{ borderWidth: 1, marginBottom: 10, padding: 8 }} />
      <TextInput placeholder="Password" onChangeText={setPassword} value={password} secureTextEntry style={{ borderWidth: 1, marginBottom: 10, padding: 8 }} />
      <Button title="Login" onPress={handleLogin} />
      <Button title="Register here" onPress={() => navigation.navigate('Register')} />
    </View>
  );
}
