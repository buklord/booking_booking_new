import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { api } from "../api";
import { useUser } from "../store";
import { registerForPushNotifications } from "../push";
import { colors } from "../theme";

export default function LoginScreen({ navigation }) {
  const { setUser } = useUser();
  const [form, setForm] = useState({
    email: "",
    full_name: "",
    driving_licence_no: "",
    dvsa_username: "",
    dvsa_password: "",
    current_test_date: "",
  });
  const [loading, setLoading] = useState(false);

  const update = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  async function onSubmit() {
    if (!form.email || !form.dvsa_username || !form.dvsa_password) {
      Alert.alert("Missing details", "Email and DVSA login are required.");
      return;
    }
    setLoading(true);
    try {
      const payload = { ...form };
      if (payload.current_test_date) {
        // Accept YYYY-MM-DD and normalise to ISO.
        payload.current_test_date = new Date(
          payload.current_test_date,
        ).toISOString();
      } else {
        delete payload.current_test_date;
      }
      const user = await api.upsertUser(payload);
      setUser(user);

      // Register for push and send the token to the backend (best effort).
      try {
        const token = await registerForPushNotifications();
        if (token) await api.setDeviceToken(user.id, token);
      } catch {
        // Non-fatal in dev / simulators without push support.
      }

      navigation.replace("Dashboard");
    } catch (err) {
      Alert.alert("Login failed", err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Driving Date Search</Text>
        <Text style={styles.subtitle}>
          Find UK driving test cancellations faster.
        </Text>

        <Field label="Email" value={form.email} onChangeText={update("email")} keyboardType="email-address" />
        <Field label="Full name" value={form.full_name} onChangeText={update("full_name")} />
        <Field label="Driving licence number" value={form.driving_licence_no} onChangeText={update("driving_licence_no")} />

        <Text style={styles.section}>DVSA login</Text>
        <Field label="DVSA username" value={form.dvsa_username} onChangeText={update("dvsa_username")} />
        <Field label="DVSA password" value={form.dvsa_password} onChangeText={update("dvsa_password")} secureTextEntry />

        <Field
          label="Current test date (YYYY-MM-DD, optional)"
          value={form.current_test_date}
          onChangeText={update("current_test_date")}
          placeholder="2025-09-01"
        />

        <TouchableOpacity style={styles.button} onPress={onSubmit} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Save & continue</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Your DVSA password is encrypted before storage. Automating the DVSA
          site may breach its terms of use - use at your own risk.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, ...props }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        autoCapitalize="none"
        placeholderTextColor={colors.muted}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: colors.bg, flexGrow: 1 },
  title: { fontSize: 26, fontWeight: "700", color: colors.text, marginTop: 12 },
  subtitle: { fontSize: 15, color: colors.muted, marginBottom: 16 },
  section: { fontSize: 16, fontWeight: "600", color: colors.text, marginTop: 8, marginBottom: 4 },
  fieldWrap: { marginBottom: 12 },
  label: { fontSize: 13, color: colors.muted, marginBottom: 4 },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  disclaimer: { fontSize: 12, color: colors.muted, marginTop: 16, lineHeight: 17 },
});
