import arrowsOutCardinal from '@iconify-icons/ph/arrows-out-cardinal';
import arrowsSplit from '@iconify-icons/ph/arrows-split';
import bell from '@iconify-icons/ph/bell';
import calendarCheck from '@iconify-icons/ph/calendar-check';
import calendarDot from '@iconify-icons/ph/calendar-dot';
import chatTeardropDots from '@iconify-icons/ph/chat-teardrop-dots';
import clock from '@iconify-icons/ph/clock';
import clockCountdown from '@iconify-icons/ph/clock-countdown';
import cloudArrowUp from '@iconify-icons/ph/cloud-arrow-up';
import code from '@iconify-icons/ph/code';
import database from '@iconify-icons/ph/database';
import envelopeSimple from '@iconify-icons/ph/envelope-simple';
import filePlus from '@iconify-icons/ph/file-plus';
import hourglassSimpleHigh from '@iconify-icons/ph/hourglass-simple-high';
import lightning from '@iconify-icons/ph/lightning';
import listChecks from '@iconify-icons/ph/list-checks';
import notification from '@iconify-icons/ph/notification';
import paperPlaneRight from '@iconify-icons/ph/paper-plane-right';
import playCircle from '@iconify-icons/ph/play-circle';
import rowsPlusTop from '@iconify-icons/ph/rows-plus-top';
import slackLogo from '@iconify-icons/ph/slack-logo';
import tag from '@iconify-icons/ph/tag';
import timer from '@iconify-icons/ph/timer';
import treeStructure from '@iconify-icons/ph/tree-structure';
import userCirclePlus from '@iconify-icons/ph/user-circle-plus';
import webhooksLogo from '@iconify-icons/ph/webhooks-logo';
import { defineIcons } from '@workflowbuilder/sdk';

export const demoIcons = defineIcons({
  ArrowsOutCardinal: arrowsOutCardinal,
  ArrowsSplit: arrowsSplit,
  Bell: bell,
  CalendarCheck: calendarCheck,
  CalendarDot: calendarDot,
  ChatTeardropDots: chatTeardropDots,
  Clock: clock,
  ClockCountdown: clockCountdown,
  CloudArrowUp: cloudArrowUp,
  Code: code,
  Database: database,
  EnvelopeSimple: envelopeSimple,
  FilePlus: filePlus,
  HourglassSimpleHigh: hourglassSimpleHigh,
  Lightning: lightning,
  ListChecks: listChecks,
  Notification: notification,
  PaperPlaneRight: paperPlaneRight,
  PlayCircle: playCircle,
  RowsPlusTop: rowsPlusTop,
  SlackLogo: slackLogo,
  Tag: tag,
  Timer: timer,
  TreeStructure: treeStructure,
  UserCirclePlus: userCirclePlus,
  WebhooksLogo: webhooksLogo,
});

declare module '@workflowbuilder/sdk' {
  interface Register {
    icons: typeof demoIcons;
  }
}
