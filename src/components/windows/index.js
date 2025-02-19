import TerminalWindow from './TerminalWindow';
import ExplorerWindow from './ExplorerWindow';
import EditorWindow from './EditorWindow';
import PreviewWindow from './PreviewWindow';
import withCommandHandling from '../../hocs/withCommandHandling';

// Create enhanced versions of each window component by wrapping them with the HOC
export const EnhancedTerminalWindow = withCommandHandling(TerminalWindow);
export const EnhancedExplorerWindow = withCommandHandling(ExplorerWindow);
export const EnhancedEditorWindow = withCommandHandling(EditorWindow);
export const EnhancedPreviewWindow = withCommandHandling(PreviewWindow);

// Also export the base components in case they're needed
export { TerminalWindow, ExplorerWindow, EditorWindow, PreviewWindow };