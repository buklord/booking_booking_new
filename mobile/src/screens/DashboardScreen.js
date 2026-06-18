import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { api } from "../api";
import { useUser } from "../store";
import { colors } from "../theme";

export default function DashboardScreen({ navigation }) {
  const { user } = useUser();
  const [slots, setSlots] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    try {
      const data = await api.listSlots(user.id);
      setSlots(data);
    } catch {
      // keep last known data
    } finally {
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const currentDate = user?.current_test_date
    ? new Date(user.current_test_date)
    : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.hello}>Hi {user?.full_name || user?.email}</Text>
          <Text style={styles.badge}>
            {user?.is_premium ? "Premium" : "Free plan"}
          </Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate("Settings")}>
          <Text style={styles.settingsLink}>Settings</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Your current test date</Text>
        <Text style={styles.cardValue}>
          {currentDate ? currentDate.toLocaleString("en-GB") : "Not set"}
        </Text>
        {user?.current_test_centre ? (
          <Text style={styles.cardMuted}>{user.current_test_centre}</Text>
        ) : null}
      </View>

      <Text style={styles.sectionTitle}>Found cancellations</Text>
      <FlatList
        data={slots}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={load} />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            No cancellations found yet. Pull to refresh - we'll also push you a
            notification the moment a slot appears.
          </Text>
        }
        renderItem={({ item }) => {
          const dt = new Date(item.slot_datetime);
          const earlier = currentDate && dt < currentDate;
          return (
            <View style={[styles.slot, earlier && styles.slotEarlier]}>
              <View>
                <Text style={styles.slotDate}>
                  {dt.toLocaleString("en-GB")}
                </Text>
                <Text style={styles.slotCentre}>
                  {item.test_centres?.name || "Test centre"}
                </Text>
              </View>
              {earlier ? <Text style={styles.tag}>Earlier!</Text> : null}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  hello: { fontSize: 20, fontWeight: "700", color: colors.text },
  badge: { fontSize: 13, color: colors.muted, marginTop: 2 },
  settingsLink: { color: colors.primary, fontWeight: "600" },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  cardLabel: { fontSize: 13, color: colors.muted },
  cardValue: { fontSize: 20, fontWeight: "700", color: colors.text, marginTop: 4 },
  cardMuted: { fontSize: 14, color: colors.muted, marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 8 },
  empty: { color: colors.muted, lineHeight: 20, marginTop: 12 },
  slot: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  slotEarlier: { borderColor: colors.success, borderWidth: 2 },
  slotDate: { fontSize: 16, fontWeight: "600", color: colors.text },
  slotCentre: { fontSize: 13, color: colors.muted, marginTop: 2 },
  tag: { color: colors.success, fontWeight: "700" },
});
