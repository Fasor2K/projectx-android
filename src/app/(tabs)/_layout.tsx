import { router } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';
import { useState } from 'react';
import { Animated, Modal, Platform, Pressable, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '@/lib/i18n';
import { colors, radius, shadow, spacing, typography } from '@/theme';

// iOS 26+ places the "search" tab on its own surface at the right; on older iOS it would show the system "Search" title.
const separateTab = Platform.OS === 'ios' && Number.parseInt(String(Platform.Version), 10) >= 26;
// Space above the bottom inset taken by the tab bar, so the menu opens just above it.
const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 64 : 80;

export default function TabsLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [progress] = useState(() => new Animated.Value(0));

  const openMenu = () => {
    setMenuOpen(true);
    Animated.spring(progress, { toValue: 1, speed: 20, bounciness: 4, useNativeDriver: true }).start();
  };
  // The Modal unmounts only after the closing animation.
  const closeMenu = () =>
    Animated.timing(progress, { toValue: 0, duration: 160, useNativeDriver: true }).start(
      ({ finished }) => finished && setMenuOpen(false),
    );

  return (
    <>
      <NativeTabs>
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Label>{t('tabs.home')}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="search">
          <NativeTabs.Trigger.Label>{t('tabs.search')}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="diary">
          <NativeTabs.Trigger.Label>{t('tabs.diary')}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="book.closed.fill" md="menu_book" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="profile">
          <NativeTabs.Trigger.Label>{t('tabs.profile')}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="person.fill" md="person" />
        </NativeTabs.Trigger>
        {/* Not a real tab: disabled blocks navigation, tabPress still fires and opens the menu. */}
        <NativeTabs.Trigger
          name="create"
          disabled
          role={separateTab ? 'search' : undefined}
          prominent
          accessibilityLabel={t('tabs.create')}
          listeners={{ tabPress: openMenu }}>
          <NativeTabs.Trigger.Label hidden={separateTab}>{t('tabs.create')}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="plus" md="add" />
        </NativeTabs.Trigger>
      </NativeTabs>
      <CreateMenu open={menuOpen} progress={progress} onClose={closeMenu} />
    </>
  );
}

type CreateMenuProps = { open: boolean; progress: Animated.Value; onClose: () => void };

function CreateMenu({ open, progress, onClose }: CreateMenuProps) {
  const insets = useSafeAreaInsets();
  // shortcut: Nuovo post only closes the menu, wire it when the screen exists.
  const items = [
    { label: t('tabs.newRecipe'), open: () => router.push('/new-recipe') },
    { label: t('tabs.newPost'), open: undefined },
  ];

  return (
    <Modal visible={open} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={t('common.close')} />
      {/* Glass inside a Modal has no app content behind it and renders too dark: light surface as for formSheets. */}
      <Animated.View
        style={[
          styles.menu,
          {
            bottom: insets.bottom + TAB_BAR_HEIGHT,
            opacity: progress,
            transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) }],
          },
        ]}>
        {items.map(({ label, open: openItem }) => (
          <Pressable
            key={label}
            accessibilityRole="button"
            onPress={() => {
              onClose();
              openItem?.();
            }}
            style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}>
            <Text style={styles.label}>{label}</Text>
          </Pressable>
        ))}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  menu: {
    position: 'absolute',
    right: spacing.lg,
    minWidth: 200,
    borderRadius: radius.lg,
    paddingVertical: spacing.xs,
    backgroundColor: colors.sheetBackground,
    ...shadow,
    // Grows from the "+" button: below the menu's bottom-right corner (approximate, the tab bar is native).
    transformOrigin: '86% 135%',
  },
  item: {
    marginHorizontal: spacing.xs,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  itemPressed: { backgroundColor: colors.primarySoft },
  label: { ...typography.title, fontWeight: '600', textAlign: 'center' },
});
