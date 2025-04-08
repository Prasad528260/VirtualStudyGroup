import React, { useState, useEffect, useRef } from "react";
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
  Platform,
  Animated,
  Easing
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import supabase from "../supabase";

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
  gold: "#FFD700",
  bronze: "#CD7F32"
};

const BADGES = {
  FIRST_TASK: { name: "Starter", icon: "🎯", color: colors.primary },
  FIVE_TASKS: { name: "Tasker", icon: "📚", color: colors.success },
  HOUR_GLASS: { name: "Hour Master", icon: "⏳", color: colors.gold },
  WEEK_STREAK: { name: "Consistent", icon: "🔥", color: colors.error }
};

export default function ToDoScreen() {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("30");
  const [userId, setUserId] = useState(null);
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerInterval, setTimerInterval] = useState(null);
  const [loading, setLoading] = useState(false);
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [badges, setBadges] = useState([]);
  const [streak, setStreak] = useState(0);
  const [totalStudyMinutes, setTotalStudyMinutes] = useState(0);
  const [showXpAnimation, setShowXpAnimation] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const xpAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const initialize = async () => {
      await Notifications.requestPermissionsAsync();
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
        }),
      });
      await fetchUserAndTasks();
      await fetchGamificationData();
    };
    initialize();

    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  }, []);

  useEffect(() => {
    if (activeTaskId && timeLeft > 0) {
      const interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
      setTimerInterval(interval);
      
      return () => clearInterval(interval);
    } else if (timeLeft === 0 && activeTaskId) {
      completeTask(activeTaskId);
    }
  }, [activeTaskId, timeLeft]);

  async function fetchUserAndTasks() {
    setLoading(true);
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);

      const { data } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setTasks(data || []);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      Alert.alert("Error", "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }

  async function fetchGamificationData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setXp(data.xp);
        setLevel(data.level);
        setBadges(data.badges || []);
        setStreak(data.streak);
        setTotalStudyMinutes(data.total_study_minutes || 0);
      }
    } catch (error) {
      console.error("Error fetching progress:", error);
    }
  }

  async function completeTask(taskId) {
    try {
      if (timerInterval) clearInterval(timerInterval);
      
      const task = tasks.find(t => t.id === taskId);
      if (!task || !userId) return;

      const xpEarned = await supabase.completeTaskWithProgress(
        taskId,
        userId,
        task.duration_minutes
      );

      setTasks(tasks.map(t => 
        t.id === taskId ? { ...t, status: "completed" } : t
      ));
      setActiveTaskId(null);
      
      setXpEarned(xpEarned);
      setShowXpAnimation(true);
      
      await fetchGamificationData();
      
      Alert.alert(
        "Task Completed", 
        `You earned ${xpEarned} XP!`
      );
    } catch (error) {
      console.error("Task completion error:", error);
      Alert.alert("Error", "Failed to complete task");
    }
  }

  async function addTask() {
    if (!title || !duration) {
      Alert.alert("Error", "Please enter both task and duration");
      return;
    }

    const durationNum = parseInt(duration);
    if (isNaN(durationNum) || durationNum <= 0) {
      Alert.alert("Error", "Please enter valid minutes");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("tasks")
        .insert([{
          user_id: user.id,
          title,
          duration_minutes: durationNum,
          status: "pending"
        }])
        .select();

      if (error) throw error;

      setTasks([data[0], ...tasks]);
      setTitle("");
      setDuration("30");
    } catch (error) {
      console.error("Error adding task:", error);
      Alert.alert("Error", "Failed to add task");
    } finally {
      setLoading(false);
    }
  }

  async function startTask(task) {
    if (timerInterval) clearInterval(timerInterval);
    
    const notificationTime = new Date();
    notificationTime.setMinutes(notificationTime.getMinutes() + task.duration_minutes - 5);
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Task Almost Complete",
        body: `Your "${task.title}" task has 5 minutes remaining!`,
      },
      trigger: { date: notificationTime },
    });

    setActiveTaskId(task.id);
    setTimeLeft(task.duration_minutes * 60);
    
    await supabase
      .from("tasks")
      .update({ status: "in_progress" })
      .eq("id", task.id);
    
    setTasks(tasks.map(t => 
      t.id === task.id ? { ...t, status: "in_progress" } : t
    ));
  }

  async function deleteTask(id) {
    try {
      await supabase.from("tasks").delete().eq("id", id);
      setTasks(tasks.filter(task => task.id !== id));
    } catch (error) {
      console.error("Error deleting task:", error);
      Alert.alert("Error", "Failed to delete task");
    }
  }

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  }

  const XpAnimation = () => (
    <Animated.View style={[
      styles.xpAnimation,
      {
        opacity: xpAnim,
        transform: [{
          translateY: xpAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -50]
          })
        }]
      }
    ]}>
      <Text style={styles.xpText}>+{xpEarned} XP</Text>
    </Animated.View>
  );

  useEffect(() => {
    if (showXpAnimation) {
      xpAnim.setValue(0);
      Animated.timing(xpAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true
      }).start(() => {
        setTimeout(() => setShowXpAnimation(false), 1000);
      });
    }
  }, [showXpAnimation]);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(xp % 100)}%` }]} />
          </View>
          <View style={styles.levelContainer}>
            <Text style={styles.levelText}>Lvl {level}</Text>
            <Text style={styles.xpText}>{xp}/100 XP</Text>
            {streak > 0 && (
              <View style={styles.streakContainer}>
                <Ionicons name="flame" size={16} color={colors.error} />
                <Text style={styles.streakText}>{streak}d</Text>
              </View>
            )}
          </View>
        </View>

        {showXpAnimation && <XpAnimation />}

        <Text style={styles.title}>Task Timer</Text>
        
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Task name"
            placeholderTextColor={colors.textSecondary}
            value={title}
            onChangeText={setTitle}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Duration (minutes)"
            placeholderTextColor={colors.textSecondary}
            value={duration}
            onChangeText={setDuration}
            keyboardType="numeric"
          />
          
          <TouchableOpacity 
            style={styles.addButton}
            onPress={addTask}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <Ionicons name="add" size={20} color="#000" />
                <Text style={styles.addButtonText}>Add Task</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {activeTaskId && (
          <View style={styles.timerContainer}>
            <Ionicons name="time-outline" size={24} color="#fff" />
            <Text style={styles.timerText}>
              {formatTime(timeLeft)} remaining
            </Text>
          </View>
        )}

        {loading && tasks.length === 0 ? (
          <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
        ) : tasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-done-outline" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No tasks yet</Text>
            <Text style={styles.emptySubtext}>Add your first task above</Text>
          </View>
        ) : (
          <FlatList
            data={tasks}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={[
                styles.taskCard,
                item.status === "completed" && styles.completedTask,
                item.status === "in_progress" && styles.activeTask
              ]}>
                <View style={styles.taskContent}>
                  <Text style={styles.taskTitle}>{item.title}</Text>
                  <View style={styles.taskMeta}>
                    <View style={styles.durationBadge}>
                      <Ionicons name="time-outline" size={14} color={colors.text} />
                      <Text style={styles.taskDuration}>{item.duration_minutes} min</Text>
                    </View>
                    <View style={[
                      styles.statusBadge,
                      item.status === "completed" && styles.statusCompleted,
                      item.status === "in_progress" && styles.statusActive
                    ]}>
                      <Text style={styles.statusText}>
                        {item.status.replace("_", " ")}
                      </Text>
                    </View>
                  </View>
                </View>
                
                <View style={styles.taskActions}>
                  {item.status === "pending" && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => startTask(item)}
                    >
                      <Ionicons name="play" size={20} color="#fff" />
                    </TouchableOpacity>
                  )}
                  
                  {item.status === "in_progress" && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.completeButton]}
                      onPress={() => completeTask(item.id)}
                    >
                      <Ionicons name="checkmark" size={20} color="#fff" />
                    </TouchableOpacity>
                  )}
                  
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => deleteTask(item.id)}
                  >
                    <Ionicons name="trash" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
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
  progressContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  progressBar: {
    height: 10,
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 5,
  },
  levelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  levelText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  xpText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  streakText: {
    color: colors.error,
    fontSize: 14,
    fontWeight: '600',
  },
  xpAnimation: {
    position: 'absolute',
    right: 20,
    top: 100,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    zIndex: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 24,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: 10,
    padding: 16,
    fontSize: 16,
    marginBottom: 12,
  },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addButtonText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 16,
  },
  timerContainer: {
    backgroundColor: colors.info,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 10,
    marginBottom: 16,
    justifyContent: 'center',
    gap: 8,
  },
  timerText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  taskCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  completedTask: {
    opacity: 0.7,
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
  },
  activeTask: {
    borderLeftWidth: 4,
    borderLeftColor: colors.info,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  taskMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  taskDuration: {
    color: colors.text,
    fontSize: 12,
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusCompleted: {
    backgroundColor: colors.success,
  },
  statusActive: {
    backgroundColor: colors.info,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  taskActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  completeButton: {
    backgroundColor: colors.success,
  },
  deleteButton: {
    backgroundColor: colors.error,
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
  loader: {
    marginTop: 40,
  },
  listContent: {
    paddingBottom: 20,
  },
});