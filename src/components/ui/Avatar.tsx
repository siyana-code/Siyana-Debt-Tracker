/** Circular initials avatar with a deterministic brand-family tint. */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../theme/ThemeProvider';
import { avatarTint, personInitials } from '../../domain/debt';
import { typography } from '../../theme/typography';

export function Avatar({
  name,
  id,
  size = 44,
  archived,
}: {
  name: string;
  /** Stable id drives the tint so a person keeps the same colour everywhere. */
  id: string;
  size?: number;
  archived?: boolean;
}) {
  const theme = useTheme();
  const tint = avatarTint(id);

  return (
    <View
      accessibilityLabel={`${name}${archived ? ', archived' : ''}`}
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: archived ? theme.colors.surfaceMuted : `${tint}22`,
          borderColor: archived ? theme.colors.border : `${tint}55`,
        },
      ]}
    >
      <Text
        style={[
          typography.captionSemiBold,
          {
            color: archived ? theme.colors.textDisabled : tint,
            fontSize: size * 0.36,
            letterSpacing: 0.2,
          },
        ]}
      >
        {personInitials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
});

export default Avatar;