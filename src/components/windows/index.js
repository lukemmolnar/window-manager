import TerminalWindow from './TerminalWindow';
import ExplorerWindow from './ExplorerWindow';
import EditorWindow from './EditorWindow';
import PreviewWindow from './PreviewWindow';
import ImageWindow from './imageWindow';
import withCommandHandling from '../../hocs/withCommandHandling';
import withWindowState from '../../hocs/withWindowState';
import withCommandInput from '../../hocs/withCommandInput';
import AudioWindow from './AudioWindow';
import ChatWindow from './ChatWindow';
import AdminWindow from './AdminWindow';
import { WINDOW_TYPES } from '../../utils/constants';

// Create enhanced versions of each window component by wrapping them with HOCs
// Terminal and Explorer already have command inputs, so we don't need to add them
export const EnhancedTerminalWindow = withWindowState(withCommandHandling(TerminalWindow), WINDOW_TYPES.TERMINAL);
export const EnhancedExplorerWindow = withWindowState(withCommandHandling(ExplorerWindow), WINDOW_TYPES.EXPLORER);

// For other windows, add the command input
export const EnhancedEditorWindow = withWindowState(withCommandHandling(withCommandInput(EditorWindow)), WINDOW_TYPES.EDITOR);
export const EnhancedPreviewWindow = withWindowState(withCommandHandling(withCommandInput(PreviewWindow)), WINDOW_TYPES.CHART);
export const EnhancedImageWindow = withWindowState(withCommandHandling(withCommandInput(ImageWindow)), WINDOW_TYPES.IMAGE);
export const EnhancedAudioWindow = withWindowState(withCommandHandling(withCommandInput(AudioWindow)), WINDOW_TYPES.AUDIO);
export const EnhancedChatWindow = withWindowState(withCommandHandling(withCommandInput(ChatWindow)), WINDOW_TYPES.CHAT);
export const EnhancedAdminWindow = withWindowState(withCommandHandling(withCommandInput(AdminWindow)), WINDOW_TYPES.ADMIN);

// Also export the base components in case they're needed
export { TerminalWindow, ExplorerWindow, EditorWindow, PreviewWindow, ChatWindow, AdminWindow };
