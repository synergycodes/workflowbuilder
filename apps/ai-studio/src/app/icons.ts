import arrowsSplitIcon from '@iconify-icons/ph/arrows-split';
import broadcastIcon from '@iconify-icons/ph/broadcast';
import calendarCheckIcon from '@iconify-icons/ph/calendar-check';
import chatCircleDotsIcon from '@iconify-icons/ph/chat-circle-dots';
import envelopeIcon from '@iconify-icons/ph/envelope';
import eyeIcon from '@iconify-icons/ph/eye';
import lightningIcon from '@iconify-icons/ph/lightning';
import magnifyingGlassIcon from '@iconify-icons/ph/magnifying-glass';
import receiptIcon from '@iconify-icons/ph/receipt';
import scalesIcon from '@iconify-icons/ph/scales';
import userCheckIcon from '@iconify-icons/ph/user-check';
import { defineIcons } from '@workflowbuilder/sdk';

// The icons the AI Studio nodes and templates name. AiAgent is one of the SDK's built-in icons.
export const aiStudioIcons = defineIcons({
  ArrowsSplit: arrowsSplitIcon,
  Broadcast: broadcastIcon,
  CalendarCheck: calendarCheckIcon,
  ChatCircleDots: chatCircleDotsIcon,
  Envelope: envelopeIcon,
  Eye: eyeIcon,
  Lightning: lightningIcon,
  MagnifyingGlass: magnifyingGlassIcon,
  Receipt: receiptIcon,
  Scales: scalesIcon,
  UserCheck: userCheckIcon,
});

declare module '@workflowbuilder/sdk' {
  interface Register {
    icons: typeof aiStudioIcons;
  }
}
