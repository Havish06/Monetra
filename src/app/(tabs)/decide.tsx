
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Screen } from "../../components/ui/Screen";
import { theme } from "../../constants/theme";
import {
  askMonetra,
  MonetraAIResponse,
} from "../../services/api";

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
  result?: MonetraAIResponse;
};

export default function DecideScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: "Hi! I'm Monetra. Ask me about your spending, budgets, commitments, or a purchase you're considering.",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [previousResult, setPreviousResult] =
    useState<MonetraAIResponse | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages, loading]);

  async function sendMessage() {
    const question = input.trim();

    if (!question || loading) return;

    setInput("");

    setMessages((current) => [
      ...current,
      { role: "user", text: question },
    ]);

    setLoading(true);

    try {
      const result = await askMonetra(
        question,
        previousResult?.intent ?? null,
        previousResult ?? null
      );

      setPreviousResult(result);

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: result.response,
          result,
        },
      ]);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.";

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: errorMessage,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll={false}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Make better decisions.</Text>
          <Text style={styles.subtitle}>
            Your money, understood.
          </Text>
          <Text style={styles.description}>
            Ask Monetra before making your next financial decision.
          </Text>
        </View>

        {/* Independently scrollable conversation */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.conversation}
          contentContainerStyle={styles.conversationContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            scrollViewRef.current?.scrollToEnd({ animated: true })
          }
        >
          {messages.map((message, index) => (
            <View
              key={`${index}-${message.role}`}
              style={[
                styles.message,
                message.role === "user"
                  ? styles.userMessage
                  : styles.assistantMessage,
              ]}
            >
              <Text style={styles.messageLabel}>
                {message.role === "user" ? "YOU" : "MONETRA"}
              </Text>

              <Text style={styles.messageText}>
                {message.text}
              </Text>
            </View>
          ))}

          {loading && (
            <View style={styles.loading}>
              <ActivityIndicator color={theme.colors.secondary} />
              <Text style={styles.loadingText}>
                Reviewing your financial data...
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Fixed composer outside the ScrollView */}
        <View style={styles.composerArea}>
          <View style={styles.inputContainer}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Message Monetra..."
              placeholderTextColor={theme.colors.secondary}
              style={styles.input}
              multiline
              maxLength={2000}
              editable={!loading}
              textAlignVertical="center"
              blurOnSubmit={false}
            />

            <Pressable
              onPress={sendMessage}
              disabled={!input.trim() || loading}
              style={[
                styles.sendButton,
                (!input.trim() || loading) && styles.disabledButton,
              ]}
            >
              <Text style={styles.sendText}>↑</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  header: {
    paddingBottom: 16,
  },

  title: {
    color: theme.colors.text,
    fontSize: 26,
    fontWeight: "700",
  },

  subtitle: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: "600",
    marginTop: 6,
  },

  description: {
    color: theme.colors.secondary,
    fontSize: 13,
    marginTop: 6,
  },

  conversation: {
    flex: 1,
  },

  conversationContent: {
    flexGrow: 1,
    gap: 12,
    paddingVertical: 12,
  },

  message: {
    maxWidth: "90%",
    borderRadius: 18,
    padding: 14,
  },

  userMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#283448",
    borderBottomRightRadius: 5,
  },

  assistantMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#191D27",
    borderBottomLeftRadius: 5,
  },

  messageLabel: {
    color: theme.colors.secondary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 7,
  },

  messageText: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 21,
  },

  loading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
  },

  loadingText: {
    color: theme.colors.secondary,
    fontSize: 12,
  },

  composerArea: {
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 8 : 6,
    backgroundColor: "transparent",
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    backgroundColor: "#191D27",
    borderRadius: 26,
    paddingLeft: 18,
    paddingRight: 7,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#303746",
  },

  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 21,
    paddingVertical: 10,
    paddingRight: 4,
  },

  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 22,
    backgroundColor: "#D8E5C5",
    alignItems: "center",
    justifyContent: "center",
  },

  disabledButton: {
    opacity: 0.35,
  },

  sendText: {
    color: "#172014",
    fontSize: 25,
    fontWeight: "700",
    lineHeight: 29,
  },
});
