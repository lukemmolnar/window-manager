import { FolderOpen, Code, Terminal as TerminalIcon, Eye } from 'lucide-react';
import { 
  EnhancedExplorerWindow,
  EnhancedEditorWindow,
  EnhancedTerminalWindow,
  EnhancedPreviewWindow
} from '../components/windows';

export const WINDOW_TYPES = {
  EXPLORER: 'explorer',
  EDITOR: 'editor',
  TERMINAL: 'terminal',
  PREVIEW: 'preview'
};

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
  [WINDOW_TYPES.PREVIEW]: {
    title: 'Preview',
    icon: Eye,
    component: EnhancedPreviewWindow
  }
};
