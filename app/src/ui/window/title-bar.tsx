import * as React from 'react'
import memoizeOne from 'memoize-one'
import { WindowState } from '../../lib/window-state'
import { Octicon } from '../octicons/octicon'
import * as octicons from '../octicons/octicons.generated'
import { isMacOSBigSurOrLater, isMacOSTahoeOrLater } from '../../lib/get-os'
import {
  getAppleActionOnDoubleClick,
  isWindowMaximized,
  maximizeWindow,
  minimizeWindow,
  restoreWindow,
} from '../main-process-proxy'

/** Get the height (in pixels) of the title bar depending on the platform */
export function getTitleBarHeight() {
  if (__DARWIN__) {
    if (isMacOSTahoeOrLater()) {
      // Tahoe also has taller title bars, see #21135
      return 32
    } else if (isMacOSBigSurOrLater()) {
      // Big Sur has taller title bars, see #10980
      return 26
    } else {
      return 22
    }
  }

  return 28
}

interface ITitleBarProps {
  /**
   * The current state of the Window, ie maximized, minimized full-screen etc.
   */
  readonly windowState: WindowState | null

  /** Whether we should hide the toolbar (and show inverted window controls) */
  readonly titleBarStyle: 'light' | 'dark'

  /** Whether or not to render the app icon */
  readonly showAppIcon: boolean

  /**
   * The current zoom factor of the Window represented as a fractional number
   * where 1 equals 100% (ie actual size) and 2 represents 200%.
   *
   * This is used on macOS to scale back the title bar to its original size
   * regardless of the zoom factor.
   */
  readonly windowZoomFactor?: number
}

export class TitleBar extends React.Component<ITitleBarProps> {
  private getStyle = memoizeOne((windowZoomFactor: number | undefined) => {
    const style: React.CSSProperties = { height: getTitleBarHeight() }

    // See windowZoomFactor in ITitleBarProps, this is only applicable on macOS.
    if (__DARWIN__ && windowZoomFactor !== undefined) {
      style.zoom = 1 / windowZoomFactor
    }

    return style
  })

  private onTitlebarDoubleClickDarwin = async () => {
    const actionOnDoubleClick = await getAppleActionOnDoubleClick()

    // Electron.AppleActionOnDoubleClickPre should only be 'Minimize',
    // 'Maximize', or 'None'. But, if a user deletes their action on double
    // click setting via terminal, then it returns an empty string. The macOs
    // convention is to treat this as the default behavior of 'Maximize'.
    switch (actionOnDoubleClick) {
      case 'Minimize':
        minimizeWindow()
        break
      case 'None':
        return
      default:
        if (await isWindowMaximized()) {
          restoreWindow()
        } else {
          maximizeWindow()
        }
    }
  }

  public render() {
    // Use native title bar on Windows; no custom state-derived controls needed

    // We now use the native Windows titlebar, so don't render custom
    // Windows window controls or frameless resize handles here.
    const winControls = null
    const topResizeHandle = null
    const leftResizeHandle = null

    const titleBarClass =
      this.props.titleBarStyle === 'light' ? 'light-title-bar' : ''

    const appIcon = this.props.showAppIcon ? (
      <Octicon className="app-icon" symbol={octicons.markGithub} />
    ) : null

    const onTitlebarDoubleClick = __DARWIN__
      ? this.onTitlebarDoubleClickDarwin
      : undefined

    return (
      <div
        className={titleBarClass}
        id="desktop-app-title-bar"
        onDoubleClick={onTitlebarDoubleClick}
        style={this.getStyle(this.props.windowZoomFactor)}
      >
        {topResizeHandle}
        {leftResizeHandle}
        {appIcon}
        {this.props.children}
        {winControls}
      </div>
    )
  }
}
