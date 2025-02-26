import TerminalWindow from './TerminalWindow';
import ExplorerWindow from './ExplorerWindow';
import EditorWindow from './EditorWindow';
import PreviewWindow from './PreviewWindow';
import ImageWindow from './imageWindow';
import withCommandHandling from '../../hocs/withCommandHandling';
import withWindowState from '../../hocs/withWindowState';
import AudioWindow from './AudioWindow';
import { WINDOW_TYPES } from '../../utils/constants';

// Create enhanced versions of each window component by wrapping them with both HOCs
// First apply withCommandHandling, then withWindowState to provide state management
export const EnhancedTerminalWindow = withWindowState(withCommandHandling(TerminalWindow), WINDOW_TYPES.TERMINAL);
export const EnhancedExplorerWindow = withWindowState(withCommandHandling(ExplorerWindow), WINDOW_TYPES.EXPLORER);
export const EnhancedEditorWindow = withWindowState(withCommandHandling(EditorWindow), WINDOW_TYPES.EDITOR);
export const EnhancedPreviewWindow = withWindowState(withCommandHandling(PreviewWindow), WINDOW_TYPES.CHART);
export const EnhancedImageWindow = withWindowState(withCommandHandling(ImageWindow), WINDOW_TYPES.IMAGE);
export const EnhancedAudioWindow = withWindowState(withCommandHandling(AudioWindow), WINDOW_TYPES.AUDIO);

// Also export the base components in case they're needed
export { TerminalWindow, ExplorerWindow, EditorWindow, PreviewWindow };
