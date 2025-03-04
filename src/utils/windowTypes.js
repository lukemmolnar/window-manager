// src/utils/windowTypes.js
import { FolderOpen, Code, Terminal as TerminalIcon, Eye, MessageSquare } from 'lucide-react';
import { WINDOW_TYPES } from './constants';

// Import individually to avoid circular dependency
import { 
  EnhancedTerminalWindow,
  EnhancedEditorWindow,
  EnhancedExplorerWindow,
  EnhancedPreviewWindow,
  EnhancedImageWindow,
  EnhancedAudioWindow,
  EnhancedChatWindow
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
  [WINDOW_TYPES.CHART]: {
    title: 'Chart',
    icon: Eye,
    component: EnhancedPreviewWindow
  },
  [WINDOW_TYPES.IMAGE]: {
    title: 'Image',
    icon: Eye,
    component: EnhancedImageWindow
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
  }
};
