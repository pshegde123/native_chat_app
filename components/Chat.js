import React, { useEffect, useState } from "react";
import { StyleSheet, View, KeyboardAvoidingView, Platform } from "react-native";
import { GiftedChat, Bubble, InputToolbar } from "react-native-gifted-chat";
import {
  collection,
  getDocs,
  addDoc,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CustomActions from "./CustomActions"; // Custom actions for sending images, etc.
import MapView from "react-native-maps";

const Chat = ({ isConnected, db, storage, route, navigation }) => {
  const { name, backgroundColor } = route.params;
  //Create a state variable to hold the messages
  const [messages, setMessages] = useState([]);
  const { userID } = route.params;

  let unsubShoppinglists;
  useEffect(() => {
    if (isConnected === true) {
      // unregister current onSnapshot() listener to avoid registering multiple listeners when
      // useEffect code is re-executed.
      if (unsubShoppinglists) unsubShoppinglists();
      unsubShoppinglists = null;
      navigation.setOptions({ title: name });
      const q = query(collection(db, "messages"), orderBy("createdAt", "desc"));
      unsubShoppinglists = onSnapshot(q, (documentsSnapshot) => {
        let newLists = [];
        documentsSnapshot.forEach((doc) => {
          newLists.push({
            id: doc.id,
            ...doc.data(),
            createdAt: new Date(doc.data().createdAt.toMillis()),
          });
        });
        cacheMessages(newLists);
        setMessages(newLists);
      });
    } else {
      loadCachedMessages();
    }
    // Clean up code
    return () => {
      if (unsubShoppinglists) unsubShoppinglists();
    };
  }, [isConnected]);

  const loadCachedMessages = async () => {
    const cachedLists = (await AsyncStorage.getItem("messages")) || [];
    setMessages(JSON.parse(cachedLists));
  };
  const cacheMessages = async (listsToCache) => {
    try {
      await AsyncStorage.setItem("messages", JSON.stringify(listsToCache));
    } catch (error) {
      console.log(error.message);
    }
  };
  /**
   * Handler to render the InputToolbar
   * @param props The default props of InputToolbar
   * @returns InputToolbar if internet connection is available, otherwise null
   */
  const renderInputToolbar = (props) => {
    if (isConnected) return <InputToolbar {...props} />;
    else return null;
  };

  const renderBubble = (props) => {
    return (
      <Bubble
        {...props}
        wrapperStyle={{
          right: {
            backgroundColor: "#000",
          },
          left: {
            backgroundColor: "#FFF",
          },
        }}
      />
    );
  };
  const onSend = (newMessages) => {
    addDoc(collection(db, "messages"), newMessages[0]);
  };
  const renderCustomActions = (props) => {
    return (
      <CustomActions
        onSend={onSend}
        storage={storage}
        userID={userID}
        {...props}
      />
    );
  };
  const renderCustomView = (props) => {
    const { currentMessage } = props;
    if (currentMessage.location) {
      return (
        <MapView
          style={{ width: 150, height: 100, borderRadius: 13, margin: 3 }}
          region={{
            latitude: currentMessage.location.latitude,
            longitude: currentMessage.location.longitude,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }}
        />
      );
    }

    return null;
  };
  return (
    <View style={[styles.container, { backgroundColor }]}>
      <GiftedChat
        messages={messages}
        renderBubble={renderBubble}
        renderUsernameOnMessage={true} // Show the username on the message
        renderInputToolbar={renderInputToolbar}
        renderActions={renderCustomActions}
        renderCustomView={renderCustomView}
        onSend={(messages) => onSend(messages)}
        user={{
          _id: 1,
        }}
      />
      {Platform.OS === "android" ? (
        <KeyboardAvoidingView behavior="height" />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
export default Chat;
