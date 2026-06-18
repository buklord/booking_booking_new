import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { api } from "../api";
import { useUser } from "../store";
import { colors } from "../theme";

const FREE_CENTRE_LIMIT = 3;

export default function SettingsScreen() {
  const { user, setUser } = useUser();
  const [centres, setCentres] = useState([]);
  const [name, setName] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    try {
      setCentres(await api.listTestCentres(user.id));
    } catch {
      // ignore
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const limitReached = !user?.is_premium && centres.length >= FREE_CENTRE_LIMIT;

  async function addCentre() {
    if (!name.trim()) return;
    if (limitReached) {
      Alert.alert(
        "Free plan limit",
        `Free users can watch up to ${FREE_CENTRE_LIMIT} test centres. Upgrade to Premium for more.`,
      );
      return;
    }
    try {
      await api.addTestCentre({ user_id: user.id, name: name.trim() });
      setName("");
      load();
    } catch (err) {
      Alert.alert("Could not add", err.message);
    }
  }

  async function removeCentre(id) {
    try {
      await api.removeTestCentre(id);
      load();
    } catch (err) {
      Alert.alert("Could not remove", err.message);
    }
  }

  async function upgrade() {
    try {
      const res = await api.mockUpgrade(user.id);
      setUser({ ...user, is_premium: res.is_premium });
      Alert.alert("Upgraded", "You're on Premium now (mock purchase).");
    } catch (err) {
      Alert.alert("Upgrade failed", err.message);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Watched test centres</Text>

      <View style={styles.addRow}>
        <TextInput
          style={styles.input}
          placeholder="e.g. Mill Hill (London)"
          placeholderTextColor={colors.muted}
          value={name}
          onChangeText={setName}
        />
        <TouchableOpacity style={styles.addBtn} onPress={addCentre}>
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={centres}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={styles.empty}>No test centres yet.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.centreRow}>
            <Text style={styles.centreName}>{item.name}</Text>
            <TouchableOpacity onPress={() => removeCentre(item.id)}>
              <Text style={styles.remove}>Remove</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <View style={styles.planCard}>
        <Text style={styles.planTitle}>
          {user?.is_premium ? "Premium plan" : "Free plan"}
        </Text>
        <Text style={styles.planText}>
          {user?.is_premium
            ? "Unlimited test centres and instant alerts."
            : `Watch up to ${FREE_CENTRE_LIMIT} centres. Upgrade for unlimited.`}
        </Text>
        {!user?.is_premium ? (
          <TouchableOpacity style={styles.upgradeBtn} onPress={upgrade}>
            <Text style={styles.upgradeText}>Upgrade to Premium (mock)</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 10 },
  addRow: { flexDirection: "row", marginBottom: 12 },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    marginRight: 8,
  },
  addBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 18,
    justifyContent: "center",
  },
  addBtnText: { color: "#fff", fontWeight: "700" },
  empty: { color: colors.muted, marginTop: 8 },
  centreRow: {
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  centreName: { fontSize: 15, color: colors.text },
  remove: { color: colors.danger, fontWeight: "600" },
  planCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginTop: 16,
  },
  planTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  planText: { fontSize: 14, color: colors.muted, marginTop: 4, lineHeight: 19 },
  upgradeBtn: {
    backgroundColor: colors.success,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 12,
  },
  upgradeText: { color: "#fff", fontWeight: "700" },
});
