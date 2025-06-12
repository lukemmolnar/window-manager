// src/utils/windowTypes.js
import { FolderOpen, Code, Terminal as TerminalIcon, Eye, MessageSquare, Shield, Layout, Dices, Store, Users } from 'lucide-react';
import { WINDOW_TYPES } from './constants';

// Import individually to avoid circular dependency
import { 
  EnhancedTerminalWindow,
  EnhancedExplorerWindow,
  EnhancedChatWindow,
  EnhancedAdminWindow,
  EnhancedMarketplaceWindow
} from '../components/windows';
import GameWindow from '../components/windows/GameWindow';

export { WINDOW_TYPES };

export const WINDOW_CONTENT = {
  [WINDOW_TYPES.EXPLORER]: {
    title: 'File Explorer',
    icon: FolderOpen,
    component: EnhancedExplorerWindow
  },
  [WINDOW_TYPES.TERMINAL]: {
    title: 'Terminal',
    icon: TerminalIcon,
    component: EnhancedTerminalWindow
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
  [WINDOW_TYPES.MARKETPLACE]: {
    title: 'Tileset Marketplace',
    icon: Store,
    component: EnhancedMarketplaceWindow
  },
  [WINDOW_TYPES.GAME]: {
    title: 'Game',
    icon: Users,
    component: GameWindow
  }
};
