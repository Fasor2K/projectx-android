import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import { colors } from '@/theme';

type Props = Omit<SymbolViewProps, 'name'> & {
  /** SF Symbol (iOS). */
  sf: Extract<SymbolViewProps['name'], string>;
  /** Material Symbol (Android). */
  md: NonNullable<Exclude<SymbolViewProps['name'], string>['android']>;
};

/** Icona di sistema: SF Symbol su iOS, Material Symbol su Android. */
export function Icon({ sf, md, size = 20, tintColor = colors.primary, ...props }: Props) {
  return <SymbolView name={{ ios: sf, android: md }} size={size} tintColor={tintColor} {...props} />;
}
