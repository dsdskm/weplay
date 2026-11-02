import type { ComponentType } from 'react';
import { ChosungQuiz } from './chosung-quiz';
import { ColorTrap } from './color-trap';
import { EmojiQuiz } from './emoji-quiz';
import { HighLow } from './high-low';
import { Memory } from './memory';
import { NumberTouch } from './number-touch';
import { PerfectStop } from './perfect-stop';
import { PhotoWho } from './photo-who';
import { QuickMath } from './quick-math';
import { Reaction } from './reaction';
import { Stack } from './stack';
import { TenSeconds } from './ten-seconds';

/** 게임 키 → 플레이 화면 */
export const GAME_COMPONENTS: Record<string, ComponentType<{ onFinish: (value: number) => void }>> = {
  TEN_SECONDS: TenSeconds,
  REACTION: Reaction,
  NUMBER_TOUCH: NumberTouch,
  MEMORY: Memory,
  COLOR_TRAP: ColorTrap,
  PERFECT_STOP: PerfectStop,
  STACK: Stack,
  QUICK_MATH: QuickMath,
  HIGH_LOW: HighLow,
  CHOSUNG: ChosungQuiz,
  EMOJI_QUIZ: EmojiQuiz,
  PHOTO_WHO: PhotoWho,
};
