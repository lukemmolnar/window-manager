import TerminalWindow from './TerminalWindow';
import ExplorerWindow from './explorer/ExplorerWindow';
import withCommandHandling from '../../hocs/withCommandHandling';
import withWindowState from '../../hocs/withWindowState';
import withCommandInput from '../../hocs/withCommandInput';
import ChatWindow from './ChatWindow';
import AdminWindow from './AdminWindow';
import CanvasWindow from './CanvasWindow';
import MarketplaceWindow from './MarketplaceWindow';
import { WINDOW_TYPES } from '../../utils/constants';

// Create enhanced versions of each window component by wrapping them with HOCs
// Terminal and Explorer already have command inputs, so we don't need to add them
export const EnhancedTerminalWindow = withWindowState(withCommandHandling(TerminalWindow), WINDOW_TYPES.TERMINAL);
export const EnhancedExplorerWindow = withWindowState(withCommandHandling(withCommandInput(ExplorerWindow)), WINDOW_TYPES.EXPLORER);

// For other windows, add the command input
export const EnhancedChatWindow = withWindowState(withCommandHandling(withCommandInput(ChatWindow)), WINDOW_TYPES.CHAT);
export const EnhancedAdminWindow = withWindowState(withCommandHandling(withCommandInput(AdminWindow)), WINDOW_TYPES.ADMIN);
export const EnhancedCanvasWindow = withWindowState(withCommandHandling(CanvasWindow), WINDOW_TYPES.CANVAS);
export const EnhancedMarketplaceWindow = withWindowState(withCommandHandling(withCommandInput(MarketplaceWindow)), WINDOW_TYPES.MARKETPLACE);

// Also export the base components in case they're needed
export { TerminalWindow, ExplorerWindow, ChatWindow, AdminWindow, CanvasWindow, MarketplaceWindow };
