import { NativeTabs } from "expo-router/unstable-native-tabs";

export default function TabLayout() {
  return (
    <NativeTabs
      blurEffect="systemChromeMaterial"
      sidebarAdaptable
      tintColor="#1D64ED"
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Início</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "house", selected: "house.fill" }}
          md={{ default: "home", selected: "home" }}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="espacos">
        <NativeTabs.Trigger.Label>Espaços</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "briefcase", selected: "briefcase.fill" }}
          md={{ default: "work", selected: "work" }}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="tarefas">
        <NativeTabs.Trigger.Label>Tarefas</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "checkmark.circle", selected: "checkmark.circle.fill" }}
          md={{ default: "check_circle", selected: "check_circle" }}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="conta">
        <NativeTabs.Trigger.Label>Perfil</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "person.crop.circle", selected: "person.crop.circle.fill" }}
          md={{ default: "person", selected: "person" }}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
