import React, { useEffect, useState } from "react";
import { View, Text, Button, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import supabase from "../supabase";

export default function GroupDetailsScreen({ route }) {
  const { groupId, groupName, createdBy } = route.params;
  const navigation = useNavigation();
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    async function fetchUser() {
      const { data, error } = await supabase.auth.getUser();
      if (data?.user) setUserId(data.user.id);
    }
    fetchUser();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{groupName}</Text>
      <Text>Group ID: {groupId}</Text>

      {/* Show Join Requests Button Only if User is Group Creator */}
      {userId === createdBy && (
        <Button
          title="View Join Requests"
          onPress={() => navigation.navigate("JoinRequests")}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 10 },
});
