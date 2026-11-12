import { Tabs } from "expo-router";
import { NativeTabs } from "expo-router/native-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  CheckSquare,
  Folder,
  MessageCircle,
  Plus,
  User,
} from "lucide-react-native";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";

type AndroidTabBarProps = {
  state: {
    index: number;
    routes: Array<{ key: string; name: string }>;
  };
  emitter: {
    emit: (event: {
      type: "tabPress";
      target?: string;
      canPreventDefault: true;
    }) => void;
  };
  navigateToTab: (routeKey: string) => void;
  isDark: boolean;
};

const TABS = [
  { name: "tarefas", label: "Tarefas", icon: CheckSquare },
  { name: "espacos", label: "Espaços", icon: Folder },
  { name: "novo", label: "", icon: Plus },
  { name: "index", label: "Conversas", icon: MessageCircle },
  { name: "conta", label: "Conta", icon: User },
] as const;

export default function TabLayout() {
  const isDark = useColorScheme() === "dark";

  if (Platform.OS === "android") {
    return (
      <Tabs
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <AndroidTabBar {...props} isDark={isDark} />}
      >
        {TABS.map((tab) => (
          <Tabs.Screen key={tab.name} name={tab.name} />
        ))}
      </Tabs>
    );
  }

  return (
    <NativeTabs
      blurEffect="systemChromeMaterial"
      sidebarAdaptable
      backgroundColor={isDark ? "#0D1A2B" : "#F8FAFC"}
      indicatorColor={isDark ? "#23456F" : "#DBEAFE"}
      iconColor={{
        default: isDark ? "#AFC5E2" : "#64748B",
        selected: isDark ? "#9ACBFF" : "#1D64ED",
      }}
      tintColor={isDark ? "#9ACBFF" : "#1D64ED"}
      rippleColor={isDark ? "#315B85" : "#BFDBFE"}
      labelVisibilityMode="labeled"
    >
      <NativeTabs.Trigger name="tarefas">
        <NativeTabs.Trigger.Label>Tarefas</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "checkmark.square", selected: "checkmark.square.fill" }}
          md={{ default: "check_box", selected: "check_box" }}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="espacos">
        <NativeTabs.Trigger.Label>Espaços</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "folder", selected: "folder.fill" }}
          md={{ default: "folder", selected: "folder" }}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="novo" accessibilityLabel="Criar tarefa">
        <NativeTabs.Trigger.Label hidden />
        <NativeTabs.Trigger.Icon
          sf={{ default: "plus.circle.fill", selected: "plus.circle.fill" }}
          md={{ default: "add_circle", selected: "add_circle" }}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Conversas</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{
            default: "bubble.left.and.text.bubble.right",
            selected: "bubble.left.and.text.bubble.right.fill",
          }}
          md={{ default: "assistant", selected: "assistant" }}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="conta">
        <NativeTabs.Trigger.Label>Conta</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "person", selected: "person.fill" }}
          md={{ default: "person", selected: "person" }}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function AndroidTabBar({
  state,
  emitter,
  navigateToTab,
  isDark,
}: AndroidTabBarProps) {
  const insets = useSafeAreaInsets();
  const colors = {
    background: isDark ? "#0D1A2B" : "#F8FAFC",
    border: isDark ? "#2D4664" : "#DCE7F4",
    icon: isDark ? "#AFC5E2" : "#64748B",
    active: isDark ? "#9ACBFF" : "#1D64ED",
    indicator: isDark ? "#23456F" : "#DBEAFE",
  };

  return (
    <View
      style={[
        styles.androidBar,
        {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, 8),
        },
      ]}
    >
      {TABS.map((tab, index) => {
        const selected = state.index === index;
        const Icon = tab.icon;
        const onPress = () => {
          const route = state.routes[index];
          emitter.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!selected) navigateToTab(route.key);
        };

        return (
          <Pressable
            key={tab.name}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={onPress}
            style={styles.androidTab}
          >
            <View
              style={[
                styles.androidTabIcon,
                selected && tab.name !== "novo" && { backgroundColor: colors.indicator },
                tab.name === "novo" && {
                  backgroundColor: colors.active,
                  width: 66,
                  height: 66,
                  borderRadius: 36,
                  borderWidth: 4,
                  borderColor: colors.background,
                  transform: [{ translateY: -26 }],
                },
              ]}
            >
              <Icon
                size={tab.name === "novo" ? 27 : 20}
                color={tab.name === "novo" ? "#FFFFFF" : selected ? colors.active : colors.icon}
                strokeWidth={tab.name === "novo" ? 2 : 2}
              />
            </View>
            {tab.label ? (
              <Text
                style={[
                  styles.androidTabLabel,
                  { color: selected ? colors.active : colors.icon },
                ]}
              >
                {tab.label}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  androidBar: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-around",
    borderTopWidth: 1,
    paddingTop: 6,
  },
  androidTab: {
    flex: 1,
    alignItems: "center",
    minHeight: 62,
  },
  androidTabIcon: {
    width: 44,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  androidTabLabel: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
  },
});
