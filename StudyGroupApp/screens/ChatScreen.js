import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';
import * as MediaLibrary from 'expo-media-library';
import { Buffer } from 'buffer';
import supabase from "../supabase";

export default function ChatScreen({ route }) {
  const { groupId } = route.params;
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [userId, setUserId] = useState(null);
  const [users, setUsers] = useState({});
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();

  useEffect(() => {
    const initializeChat = async () => {
      await fetchUser();
      await fetchUsers();
      await fetchMessages();
      await requestPermission();
    };

    initializeChat();

    const channel = supabase
      .channel(`chat_group_${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          const senderName = users[payload.new.user_id] || "Unknown";
          setMessages((prev) => [{ ...payload.new, senderName }, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, users]);

  const getMimeType = (filename) => {
    const extension = filename.split('.').pop().toLowerCase();
    const mimeTypes = {
      // Images
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      // Documents
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ppt: 'application/vnd.ms-powerpoint',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      txt: 'text/plain',
      // Archives
      zip: 'application/zip',
      rar: 'application/x-rar-compressed',
      // Audio
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      // Video
      mp4: 'video/mp4',
      mov: 'video/quicktime',
      // Default
      default: 'application/octet-stream'
    };
    return mimeTypes[extension] || mimeTypes.default;
  };

  async function fetchUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.error("Error fetching user:", error);
      Alert.alert("Error", "Failed to fetch user information");
      return;
    }
    if (user) {
      setUserId(user.id);
    }
  }

  async function fetchUsers() {
    const { data, error } = await supabase.from("users").select("id, name");
    if (error) {
      console.error("Error fetching users:", error);
      return;
    }
    const userMap = {};
    data.forEach((user) => {
      userMap[user.id] = user.name;
    });
    setUsers(userMap);
  }

  async function fetchMessages() {
    const { data, error } = await supabase
      .from("messages")
      .select(`
        id, 
        text, 
        file_url, 
        file_name,
        file_type,
        file_size,
        created_at, 
        user_id, 
        users(name)
      `)
      .eq("group_id", groupId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching messages:", error);
      return;
    }
    setMessages(
      data.map((msg) => ({
        ...msg,
        senderName: msg.users?.name || users[msg.user_id] || "Unknown",
      }))
    );
  }

  async function sendMessage() {
    if (!messageText.trim()) return;
    if (!userId) {
      Alert.alert("Error", "User not authenticated");
      return;
    }

    const { error } = await supabase
      .from("messages")
      .insert([{ 
        group_id: groupId, 
        user_id: userId, 
        text: messageText 
      }]);

    if (error) {
      console.error("Error sending message:", error);
      Alert.alert("Error", "Failed to send message");
      return;
    }
    setMessageText("");
  }

  async function pickFile() {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      Alert.alert("Authentication Error", "Please sign in to upload files");
      return;
    }

    setIsUploading(true);
    
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true
      });
      
      if (result.canceled) {
        setIsUploading(false);
        return;
      }

      const file = result.assets[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      const filePath = `user_uploads/${user.id}/${fileName}`;
      
      // Read file as base64
      const base64Data = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Convert to ArrayBuffer
      const arrayBuffer = Buffer.from(base64Data, 'base64').buffer;

      const fileInfo = await FileSystem.getInfoAsync(file.uri);
      const fileSize = fileInfo.size || 0;
      const mimeType = file.mimeType || getMimeType(file.name);

      // Upload to storage with proper content type
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('files')
        .upload(filePath, arrayBuffer, {
          contentType: mimeType,
          upsert: false,
          cacheControl: '3600',
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      // Get public URL (use signed URL if RLS is enabled)
      const { data: { publicUrl } } = supabase.storage
        .from('files')
        .getPublicUrl(uploadData.path);

      // Insert message record
      const { error: insertError } = await supabase
        .from('messages')
        .insert([{
          group_id: groupId,
          user_id: user.id,
          file_url: publicUrl,
          file_name: file.name,
          file_type: mimeType,
          file_size: fileSize,
          text: `File: ${file.name}`
        }]);

      if (insertError) {
        await supabase.storage.from('files').remove([filePath]);
        throw new Error(insertError.message);
      }

    } catch (error) {
      console.error("File upload error:", error);
      Alert.alert(
        "Upload Failed", 
        error.message.includes("row-level security") 
          ? "You don't have permission to upload files." 
          : `Failed to upload file: ${error.message}`
      );
    } finally {
      setIsUploading(false);
    }
  }

  function formatFileSize(bytes) {
    if (!bytes) return "Unknown size";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }

  async function handleFilePress(fileUrl, fileName, fileType) {
    Alert.alert(
      "File Options",
      `What would you like to do with this file?\n\n${fileName}`,
      [
        {
          text: "Open File",
          onPress: () => downloadAndOpenFile(fileUrl, fileName, fileType)
        },
        {
          text: "Save to Device",
          onPress: () => saveFileToDevice(fileUrl, fileName, fileType),
          style: Platform.OS === 'ios' ? 'cancel' : 'default'
        },
        {
          text: "Cancel",
          style: 'cancel'
        }
      ]
    );
  }

  async function downloadAndOpenFile(fileUrl, fileName, fileType) {
    setIsDownloading(true);
    try {
      const downloadDest = `${FileSystem.cacheDirectory}${fileName}`;
      
      // Download file if it doesn't exist
      const fileInfo = await FileSystem.getInfoAsync(downloadDest);
      if (!fileInfo.exists) {
        const downloadResumable = FileSystem.createDownloadResumable(
          fileUrl,
          downloadDest,
          {},
          (downloadProgress) => {
            const progress = Math.round(
              (downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite) * 100
            );
            console.log(`Download progress: ${progress}%`);
          }
        );
        await downloadResumable.downloadAsync();
      }

      // Determine correct MIME type
      const mimeType = fileType || getMimeType(fileName);
      
      if (Platform.OS === 'android') {
        // Use Android's intent system
        try {
          await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
            data: `file://${downloadDest}`,
            type: mimeType,
            flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
          });
        } catch (error) {
          console.log('Intent failed, trying with Sharing API:', error);
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(downloadDest, {
              mimeType,
              dialogTitle: `Open ${fileName}`
            });
          } else {
            Alert.alert("Error", "No app available to open this file type");
          }
        }
      } else {
        // For iOS, use document interaction or sharing
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(downloadDest, {
            mimeType,
            dialogTitle: `Open ${fileName}`,
            UTI: mimeType // Uniform Type Identifier for iOS
          });
        } else {
          Alert.alert("Info", "No app available to open this file type");
        }
      }
    } catch (error) {
      console.error('File opening error:', error);
      Alert.alert(
        "Cannot Open File", 
        `No app found to open this file type. ${error.message}`
      );
    } finally {
      setIsDownloading(false);
    }
  }

  async function saveFileToDevice(fileUrl, fileName, fileType) {
    setIsDownloading(true);
    try {
      const downloadDest = `${FileSystem.cacheDirectory}${fileName}`;
      
      // Download file first
      const fileInfo = await FileSystem.getInfoAsync(downloadDest);
      if (!fileInfo.exists) {
        const downloadResumable = FileSystem.createDownloadResumable(
          fileUrl,
          downloadDest
        );
        await downloadResumable.downloadAsync();
      }

      if (Platform.OS === 'android') {
        // Save to Downloads folder on Android
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (permissions.granted) {
          const fileString = await FileSystem.readAsStringAsync(downloadDest, {
            encoding: FileSystem.EncodingType.Base64,
          });
          
          await FileSystem.StorageAccessFramework.createFileAsync(
            permissions.directoryUri,
            fileName,
            fileType || '*/*'
          )
          .then(async (newUri) => {
            await FileSystem.writeAsStringAsync(newUri, fileString, {
              encoding: FileSystem.EncodingType.Base64,
            });
            Alert.alert("Success", `File saved to Downloads: ${fileName}`);
          });
        }
      } else {
        // Save to Files app on iOS
        if (permissionResponse?.granted) {
          const asset = await MediaLibrary.createAssetAsync(downloadDest);
          await MediaLibrary.createAlbumAsync('Downloads', asset, false);
          Alert.alert("Success", `File saved to Files app: ${fileName}`);
        } else {
          Alert.alert("Permission Required", "Please grant media library access to save files");
        }
      }
    } catch (error) {
      console.error('File saving error:', error);
      Alert.alert("Error", `Failed to save file: ${error.message}`);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id.toString()}
        inverted
        contentContainerStyle={styles.messagesContainer}
        renderItem={({ item }) => (
          <View
            style={[
              styles.messageContainer,
              item.user_id === userId ? styles.myMessage : styles.otherMessage
            ]}
          >
            <Text style={styles.senderName}>
              {item.senderName}
            </Text>
            
            {item.text && !item.file_url && (
              <Text style={styles.messageText}>{item.text}</Text>
            )}
            
            {item.file_url && (
              <TouchableOpacity
                onPress={() => handleFilePress(item.file_url, item.file_name, item.file_type)}
                style={styles.fileContainer}
                disabled={isDownloading}
              >
                <Text style={styles.fileText}>
                  📎 {item.file_name || "Attached File"}
                </Text>
                {item.file_type && (
                  <Text style={styles.fileMeta}>
                    {item.file_type.split('/')[1] || item.file_type} • {formatFileSize(item.file_size)}
                  </Text>
                )}
                {isDownloading && (
                  <ActivityIndicator size="small" color="#2e86de" style={styles.downloadIndicator} />
                )}
              </TouchableOpacity>
            )}
            
            <Text style={styles.timestamp}>
              {new Date(item.created_at).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </Text>
          </View>
        )}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={messageText}
          onChangeText={setMessageText}
          onSubmitEditing={sendMessage}
          editable={!isUploading}
        />
        
        <TouchableOpacity 
          onPress={pickFile} 
          style={[styles.attachButton, isUploading && styles.disabledButton]}
          disabled={isUploading}
        >
          {isUploading ? (
            <ActivityIndicator size="small" color="#2e86de" />
          ) : (
            <Text style={styles.attachButtonText}>📎</Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={sendMessage} 
          style={[styles.sendButton, (!messageText.trim() || isUploading) && styles.disabledButton]}
          disabled={!messageText.trim() || isUploading}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f0f2f5'
  },
  messagesContainer: {
    paddingBottom: 16,
    paddingHorizontal: 12
  },
  messageContainer: {
    padding: 12,
    borderRadius: 12,
    marginVertical: 6,
    maxWidth: '80%',
  },
  myMessage: { 
    alignSelf: "flex-end", 
    backgroundColor: "#dcf8c6",
    borderTopRightRadius: 0,
  },
  otherMessage: { 
    alignSelf: "flex-start", 
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 0,
    borderWidth: 1,
    borderColor: '#e5e5e5'
  },
  senderName: { 
    fontWeight: "600", 
    marginBottom: 4,
    fontSize: 13,
    color: '#555'
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  fileContainer: {
    marginTop: 4,
  },
  fileText: {
    color: "#2e86de",
    fontSize: 15,
    fontWeight: '500'
  },
  fileMeta: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  downloadIndicator: {
    marginTop: 5,
  },
  timestamp: {
    fontSize: 11,
    color: '#666',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  inputContainer: { 
    flexDirection: "row", 
    alignItems: "center", 
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#e0e0e0'
  },
  input: { 
    flex: 1, 
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    marginRight: 8,
  },
  sendButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#2e86de',
    borderRadius: 20,
  },
  sendButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  attachButton: { 
    padding: 10,
    marginRight: 8,
  },
  attachButtonText: { 
    color: "#2e86de",
    fontSize: 20,
  },
  disabledButton: {
    opacity: 0.5
  }
});