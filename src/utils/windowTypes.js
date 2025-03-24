// src/utils/windowTypes.js
import { FolderOpen, Code, Terminal as TerminalIcon, Eye, MessageSquare, Shield, Layout, Dices } from 'lucide-react';
import { WINDOW_TYPES } from './constants';

// Import individually to avoid circular dependency
import { 
  EnhancedTerminalWindow,
  EnhancedEditorWindow,
  EnhancedExplorerWindow,
  EnhancedAudioWindow,
  EnhancedChatWindow,
  EnhancedAdminWindow,
  EnhancedCanvasWindow,
  EnhancedDiceWindow
} from '../components/windows';

export { WINDOW_TYPES };

export const WINDOW_CONTENT = {
  [WINDOW_TYPES.EXPLORER]: {
    title: 'File Explorer',
    icon: FolderOpen,
    component: EnhancedExplorerWindow
  },
  [WINDOW_TYPES.EDITOR]: {
    title: 'Code Editor',
    icon: Code,
    component: EnhancedEditorWindow
  },
  [WINDOW_TYPES.TERMINAL]: {
    title: 'Terminal',
    icon: TerminalIcon,
    component: EnhancedTerminalWindow
  },
  [WINDOW_TYPES.AUDIO]: {
    title: 'Audio Player',
    icon: Eye,
    component: EnhancedAudioWindow
  },
  [WINDOW_TYPES.CHAT]: {
    title: 'Chat',
    icon: MessageSquare,
    component: EnhancedChatWindow
  },
  [WINDOW_TYPES.ADMIN]: {
    title: 'Admin Panel',
    icon: Shield,
    component: EnhancedAdminWindow
  },
  [WINDOW_TYPES.CANVAS]: {
    title: 'Canvas',
    icon: Layout,
    component: EnhancedCanvasWindow
  },
  [WINDOW_TYPES.DICE]: {
    title: 'Dice Roller',
    icon: Dices,
    component: EnhancedDiceWindow
  }
};
