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
  KeyboardAvoidingView,
  ActivityIndicator,
  Platform
} from "react-native";
import { Calendar } from "react-native-calendars";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
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
  success: "#4CAF50",
  info: "#2196F3",
};

export default function AssignmentManager() {
  const [assignments, setAssignments] = useState([]);
  const [assignmentName, setAssignmentName] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [userId, setUserId] = useState(null);
  const [markedDates, setMarkedDates] = useState({});
  const [loading, setLoading] = useState(false);

  // Helper function to format dates
  const formatDate = (dateString) => {
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  // Initialize notifications and fetch assignments
  useEffect(() => {
    const initialize = async () => {
      await setupNotifications();
      await fetchUserAndAssignments();
    };
    initialize();
  }, []);

  // Update marked dates when assignments change
  useEffect(() => {
    const dates = {};
    assignments.forEach(assignment => {
      const date = assignment.due_date.split('T')[0];
      dates[date] = { 
        marked: true, 
        dotColor: colors.error,
        selected: date === selectedDate
      };
    });
    dates[selectedDate] = { ...dates[selectedDate], selected: true };
    setMarkedDates(dates);
  }, [assignments, selectedDate]);

  async function setupNotifications() {
    await Notifications.requestPermissionsAsync();
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
      }),
    });
  }

  async function fetchUserAndAssignments() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    setUserId(user.id);

    const { data } = await supabase
      .from("assignments")
      .select("*")
      .eq("user_id", user.id)
      .order("due_date", { ascending: true });

    setAssignments(data || []);
    
    // Schedule notifications for all assignments
    data?.forEach(assignment => {
      scheduleDeadlineNotification(assignment);
    });
    setLoading(false);
  }

  async function scheduleDeadlineNotification(assignment) {
    const dueDate = new Date(assignment.due_date);
    
    // Schedule notification for the due date at 9 AM
    const notificationTime = new Date(dueDate);
    notificationTime.setHours(9, 0, 0);
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Assignment Due Today!",
        body: `"${assignment.name}" is due today!`,
        data: { assignmentId: assignment.id },
      },
      trigger: { date: notificationTime },
    });

    // Schedule reminder 1 day before
    const reminderTime = new Date(dueDate);
    reminderTime.setDate(reminderTime.getDate() - 1);
    reminderTime.setHours(9, 0, 0);
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Assignment Due Tomorrow",
        body: `"${assignment.name}" is due tomorrow!`,
        data: { assignmentId: assignment.id },
      },
      trigger: { date: reminderTime },
    });
  }

  async function addAssignment() {
    if (!assignmentName || !selectedDate) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("assignments")
      .insert([{
        user_id: userId,
        name: assignmentName,
        due_date: `${selectedDate}T23:59:59`, // End of day
        status: "pending"
      }])
      .select();

    if (error) {
      Alert.alert("Error", "Failed to add assignment");
      setLoading(false);
      return;
    }

    const newAssignment = data[0];
    setAssignments([...assignments, newAssignment]);
    setAssignmentName("");
    
    // Schedule notifications for this new assignment
    await scheduleDeadlineNotification(newAssignment);
    setLoading(false);
  }

  async function deleteAssignment(id) {
    await supabase.from("assignments").delete().eq("id", id);
    setAssignments(assignments.filter(assignment => assignment.id !== id));
    
    // Cancel any scheduled notifications for this assignment
    await Notifications.cancelScheduledNotificationAsync(id.toString());
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <Text style={styles.title}>Assignment Tracker</Text>

        <TouchableOpacity 
          style={styles.dateButton}
          onPress={() => setShowCalendar(!showCalendar)}
        >
          <Ionicons name="calendar" size={20} color={colors.primary} />
          <Text style={styles.dateButtonText}>
            {formatDate(selectedDate)}
          </Text>
          <Ionicons 
            name={showCalendar ? "chevron-up" : "chevron-down"} 
            size={20} 
            color={colors.textSecondary} 
          />
        </TouchableOpacity>

        {showCalendar && (
          <View style={styles.calendarContainer}>
            <Calendar
              markedDates={markedDates}
              onDayPress={(day) => {
                setSelectedDate(day.dateString);
                setShowCalendar(false);
              }}
              minDate={new Date().toISOString().split('T')[0]}
              theme={{
                backgroundColor: colors.surface,
                calendarBackground: colors.surface,
                textSectionTitleColor: colors.textSecondary,
                selectedDayBackgroundColor: colors.primary,
                selectedDayTextColor: colors.text,
                todayTextColor: colors.primary,
                dayTextColor: colors.text,
                textDisabledColor: colors.textSecondary,
                arrowColor: colors.primary,
                monthTextColor: colors.text,
              }}
            />
          </View>
        )}

        <TextInput
          style={styles.input}
          placeholder="Assignment name"
          placeholderTextColor={colors.textSecondary}
          value={assignmentName}
          onChangeText={setAssignmentName}
        />

        <TouchableOpacity 
          style={styles.addButton} 
          onPress={addAssignment}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <>
              <Ionicons name="add" size={20} color="#000" />
              <Text style={styles.addButtonText}>Add Assignment</Text>
            </>
          )}
        </TouchableOpacity>

        {loading && assignments.length === 0 ? (
          <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
        ) : assignments.filter(a => a.due_date.startsWith(selectedDate)).length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No assignments for this date</Text>
            <Text style={styles.emptySubtext}>Add an assignment above</Text>
          </View>
        ) : (
          <FlatList
            data={assignments.filter(a => a.due_date.startsWith(selectedDate))}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={styles.assignmentCard}>
                <View style={styles.assignmentContent}>
                  <Text style={styles.assignmentName}>{item.name}</Text>
                  <View style={styles.dueDateBadge}>
                    <Ionicons name="time-outline" size={14} color={colors.text} />
                    <Text style={styles.assignmentDue}>
                      {formatDate(item.due_date)}
                    </Text>
                  </View>
                </View>
                
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => deleteAssignment(item.id)}
                >
                  <Ionicons name="trash" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
          />
        )}
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
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginVertical: 24,
    textAlign: 'center',
  },
  dateButton: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateButtonText: {
    fontSize: 16,
    color: colors.text,
    marginHorizontal: 8,
    flex: 1,
  },
  calendarContainer: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    marginBottom: 16,
    overflow: 'hidden',
  },
  input: {
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: 10,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
  },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  addButtonText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  assignmentCard: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  assignmentContent: {
    flex: 1,
  },
  assignmentName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  dueDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    gap: 4,
  },
  assignmentDue: {
    color: colors.text,
    fontSize: 12,
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
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
  loader: {
    marginTop: 40,
  },
});