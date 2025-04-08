import React, { useEffect, useState } from "react";
import { 
  View, Text, FlatList, Alert, StyleSheet, ActivityIndicator, TouchableOpacity 
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import supabase from "../supabase";

export default function JoinRequestsScreen() {
  const [requests, setRequests] = useState([]);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    fetchUser();
  }, []);

  async function fetchUser() {
    setLoading(true);
    const { data, error } = await supabase.auth.getUser();
    
    if (error || !data?.user) {
      console.error("Error fetching user:", error);
      Alert.alert("Error", "Could not fetch user.");
      setLoading(false);
      return;
    }

    setUserId(data.user.id);
    fetchRequests(data.user.id);
  }

  async function fetchRequests(userId) {
    setLoading(true);
    console.log("Fetching requests for user:", userId);
    
    const { data, error } = await supabase.rpc("get_join_requests", { uid: userId });

    if (error) {
      console.error("Fetch Error:", error);
      Alert.alert("Error", "Could not fetch join requests.");
    } else {
      console.log("Fetched requests:", data);
      setRequests(data || []);
    }

    setLoading(false);
  }

  async function handleApprove(requestId, groupId, joiningUserId) {
    console.log("Approving request:", { requestId, groupId, joiningUserId });

    const { error: insertError } = await supabase.from("group_members").insert([
      { group_id: groupId, user_id: joiningUserId },
    ]);

    if (!insertError) {
      const { error: deleteError } = await supabase.from("join_requests").delete().eq("id", requestId);

      if (!deleteError) {
        console.log("Request successfully deleted:", requestId);
        
        // Force refresh
        fetchRequests(userId);
        
        Alert.alert("Success", "User has been added to the group!");
        navigation.navigate("ChatScreen", { groupId });
      } else {
        console.error("Delete Error:", deleteError);
        Alert.alert("Error", "Could not remove request after approval.");
      }
    } else {
      console.error("Approval Error:", insertError);
      Alert.alert("Error", "Could not approve request.");
    }
  }

  async function handleReject(requestId) {
    console.log("Rejecting request:", requestId);

    const { error } = await supabase.from("join_requests").delete().eq("id", requestId);

    if (!error) {
      console.log("Request successfully rejected:", requestId);

      // Force refresh
      fetchRequests(userId);
      
      Alert.alert("Rejected", "Join request has been rejected.");
    } else {
      console.error("Rejection Error:", error);
      Alert.alert("Error", "Could not reject request.");
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Join Requests</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : requests.length === 0 ? (
        <Text style={styles.noRequests}>No pending requests.</Text>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.requestItem}>
              <Text>
                <Text style={styles.userName}>{item.user_name || "Unknown"}</Text> 
                {" "}wants to join <Text style={styles.groupName}>{item.group_name}</Text>
              </Text>
              <View style={styles.buttonContainer}>
                <TouchableOpacity 
                  style={styles.approveButton} 
                  onPress={() => handleApprove(item.id, item.group_id, item.user_id)}
                >
                  <Text style={styles.buttonText}>Approve</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.rejectButton} 
                  onPress={() => handleReject(item.id)}
                >
                  <Text style={styles.buttonText}>Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  header: { fontSize: 22, fontWeight: "bold", marginBottom: 15 },
  noRequests: { fontSize: 16, textAlign: "center", marginTop: 20, color: "gray" },
  requestItem: { marginVertical: 10, padding: 15, backgroundColor: "#f1f1f1", borderRadius: 8 },
  userName: { fontWeight: "bold", color: "#333" },
  groupName: { fontWeight: "bold", color: "#007bff" },
  buttonContainer: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  approveButton: { backgroundColor: "green", padding: 10, borderRadius: 5 },
  rejectButton: { backgroundColor: "red", padding: 10, borderRadius: 5 },
  buttonText: { color: "white", textAlign: "center", fontWeight: "bold" },
});

