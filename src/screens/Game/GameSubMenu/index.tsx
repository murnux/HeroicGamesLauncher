import './index.css'

import React, { useContext, useEffect, useState } from 'react'

import { AppSettings } from 'src/types'
import { IpcRenderer } from 'electron'
import { Link } from 'react-router-dom'
import { SmallInfo } from 'src/components/UI'
import {
  createNewWindow,
  formatStoreUrl,
  repair
} from 'src/helpers'
import { useTranslation } from 'react-i18next'
import ContextProvider from 'src/state/ContextProvider'

const { ipcRenderer } = window.require('electron')

const renderer: IpcRenderer = ipcRenderer

interface Props {
  appName: string
  isInstalled: boolean
  title: string
}

type otherInfo = {
  prefix: string,
  wine: string
}

export default function GamesSubmenu({
  appName,
  isInstalled,
  title
}: Props) {
  const { handleGameStatus, refresh, platform } = useContext(
    ContextProvider
  )
  const isWin = platform === 'win32'
  const isLinux = platform === 'linux'
  const [info, setInfo] = useState({prefix: '', wine: ''} as otherInfo)

  const { t, i18n } = useTranslation('gamepage')
  let lang = i18n.language
  if (i18n.language === 'pt') {
    lang = 'pt-BR'
  }

  const protonDBurl = `https://www.protondb.com/search?q=${title}`

  async function handleMoveInstall() {
    const { response } = await ipcRenderer.invoke('openMessageBox', {
      buttons: [t('box.yes'), t('box.no')],
      message: t('box.move.message'),
      title: t('box.move.title')
    })
    if (response === 0) {
      const { path } = await ipcRenderer.invoke('openDialog',{
        buttonLabel: t('box.choose'),
        properties: ['openDirectory'],
        title: t('box.move.path')
      })
      if (path) {
        await handleGameStatus({ appName, status: 'moving' })
        await renderer.invoke('moveInstall', [appName, path])
        await handleGameStatus({ appName, status: 'done' })
      }
    }
  }

  async function handleChangeInstall() {
    const { response } = await ipcRenderer.invoke('openMessageBox', {
      buttons: [t('box.yes'), t('box.no')],
      message: t('box.change.message'),
      title: t('box.change.title')
    })
    if (response === 0) {
      const { path } = await ipcRenderer.invoke('openDialog',{
        buttonLabel: t('box.choose'),
        properties: ['openDirectory'],
        title: t('box.change.path')
      })
      if (path) {
        await renderer.invoke('changeInstallPath', [appName, path])
        await refresh()
      }
      return
    }
    return
  }

  async function handleRepair(appName: string) {
    const { response } = await ipcRenderer.invoke('openMessageBox', {
      buttons: [t('box.yes'), t('box.no')],
      message: t('box.repair.message'),
      title: t('box.repair.title')
    })

    if (response === 0) {
      await handleGameStatus({ appName, status: 'repairing' })
      await repair(appName)
      await handleGameStatus({ appName, status: 'done' })
    }
  }

  function handleShortcuts() {
    ipcRenderer.send('addShortcut', appName)
    return ipcRenderer.invoke('openMessageBox', {
      buttons: [t('box.ok', 'Ok')],
      message: t('box.shortcuts.message', 'Shortcuts were created on Desktop and Start Menu'),
      title: t('box.shortcuts.title', 'Shortcuts')
    })
  }

  useEffect(() => {
    if (isWin){
      return
    }
    const getWineInfo = async () => {
      try {
        const { wineVersion, winePrefix }: AppSettings = await ipcRenderer.invoke('requestSettings', appName)
        let wine = wineVersion.name.replace('Wine - ', '').replace('Proton - ', '')
        if (wine.includes('Default')){
          wine = wine.split('-')[0]
        }
        setInfo({prefix: winePrefix, wine})
      } catch (error) {
        ipcRenderer.send('logError', error)
      }
    }
    getWineInfo()
  }, [appName])

  return (
    <div className="subMenuContainer">
      <div className={`submenu`}>
        {isInstalled && (
          <>
            <Link
              className="link"
              to={{
                pathname: isWin
                  ? `/settings/${appName}/other`
                  : `/settings/${appName}/wine`,
                state: { fromGameCard: false }
              }}
            >
              {t('submenu.settings')}
            </Link>
            <span onClick={() => handleRepair(appName)} className="link">
              {t('submenu.verify')}
            </span>{' '}
            <span onClick={() => handleMoveInstall()} className="link">
              {t('submenu.move')}
            </span>{' '}
            <span onClick={() => handleChangeInstall()} className="link">
              {t('submenu.change')}
            </span>{' '}
            <span
              onClick={() => renderer.send('getLog', appName)}
              className="link"
            >
              {t('submenu.log')}
            </span>
            {isLinux && <span
              onClick={() => handleShortcuts()}
              className="link"
            >
              {t('submenu.addShortcut', 'Add shortcut')}
            </span>}
          </>
        )}
        <span
          onClick={() => createNewWindow(formatStoreUrl(title, lang))}
          className="link"
        >
          {t('submenu.store')}
        </span>
        {!isWin && <span
          onClick={() => createNewWindow(protonDBurl)}
          className="link"
        >
          {t('submenu.protondb')}
        </span>}
      </div>
      {!isWin && <div className="otherInfo">
        <SmallInfo title="Wine:" subtitle={info.wine} />
        <SmallInfo title="Prefix:" subtitle={info.prefix} handleclick={() => ipcRenderer.send('openFolder', info.prefix)} />
      </div>}
    </div>
  )
}
