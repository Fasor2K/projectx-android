import type { ComponentProps } from 'react';

import type { Icon } from '@/components/icon';
import type { MealType } from '@/lib/notifications';

export const mealIcons: Record<MealType, Pick<ComponentProps<typeof Icon>, 'sf' | 'md'>> = {
  breakfast: { sf: 'cup.and.saucer', md: 'coffee' },
  lunch: { sf: 'sun.max', md: 'light_mode' },
  dinner: { sf: 'moon', md: 'dark_mode' },
  snack: { sf: 'carrot', md: 'nutrition' },
};
