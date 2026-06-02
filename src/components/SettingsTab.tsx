import { useState, useEffect } from 'react';
import { Panel, Button, Stack, Divider, Tag } from 'rsuite';
import FolderFillIcon from '@rsuite/icons/FolderFill';

export default function SettingsTab() {
  const [downloadPath, setDownloadPath] = useState('');

  useEffect(() => {
    window.electron.ipcRenderer.invoke('get-settings').then((s: any) => {
      setDownloadPath(s?.downloadPath || '');
    });
  }, []);

  const handleSelectDir = async () => {
    const p = await window.electron.ipcRenderer.invoke('select-directory');
    if (p) setDownloadPath(p);
  };

  return (
    <div style={{ maxWidth: 620 }}>
      <Panel
        className="glass-card"
        style={{ borderRadius: 16, padding: 8 }}
        header={<span style={{ fontWeight: 700, fontSize: 15, color: 'var(--app-text-primary)' }}>Download Location</span>}
      >
        <p style={{ color: 'var(--app-text-secondary)', fontSize: 13, marginBottom: 16 }}>
          Choose where your downloaded karaoke videos are saved.
        </p>
        <div className="path-display">{downloadPath || 'Not configured'}</div>
        <div style={{ marginTop: 14 }}>
          <Button
            startIcon={<FolderFillIcon />}
            appearance="ghost"
            color="violet"
            onClick={handleSelectDir}
          >
            Change Folder
          </Button>
        </div>
      </Panel>

      <Divider />

      <Panel
        className="glass-card"
        style={{ borderRadius: 16, padding: 8 }}
        header={<span style={{ fontWeight: 700, fontSize: 15, color: 'var(--app-text-primary)' }}>About</span>}
      >
        <Stack spacing={12} direction="column" alignItems="flex-start">
          <Stack spacing={10}>
            <span style={{ color: 'var(--app-text-secondary)', fontSize: 13, width: 120 }}>Application</span>
            <span style={{ color: 'var(--app-text-primary)', fontSize: 13 }}>Vibe YT Karaoke Tool</span>
          </Stack>
          <Stack spacing={10}>
            <span style={{ color: 'var(--app-text-secondary)', fontSize: 13, width: 120 }}>Version</span>
            <Tag color="violet" size="sm">1.0.0</Tag>
          </Stack>
          <Stack spacing={10}>
            <span style={{ color: 'var(--app-text-secondary)', fontSize: 13, width: 120 }}>Developer</span>
            <span style={{ color: 'var(--app-text-primary)', fontSize: 13 }}>KirkNetworks, LLC</span>
          </Stack>
          <Stack spacing={10}>
            <span style={{ color: 'var(--app-text-secondary)', fontSize: 13, width: 120 }}>Mode</span>
            <Tag color="green" size="sm">Native Desktop</Tag>
          </Stack>
        </Stack>
      </Panel>
    </div>
  );
}
