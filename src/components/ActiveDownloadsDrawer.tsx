import { Drawer, Stack, Tag, Progress, IconButton, Divider } from 'rsuite';
import CloseIcon from '@rsuite/icons/Close';
import { ActiveDownload } from '../types';

interface ActiveDownloadsDrawerProps {
  open: boolean;
  onClose: () => void;
  downloads: ActiveDownload[];
  onDismiss: (id: string) => void;
}

const statusColor = (status: ActiveDownload['status']) => {
  switch (status) {
    case 'complete': return 'green';
    case 'error': return 'red';
    case 'processing': return 'violet';
    case 'downloading': return 'blue';
    default: return 'orange';
  }
};

const statusLabel = (status: ActiveDownload['status']) => {
  switch (status) {
    case 'complete': return 'Complete';
    case 'error': return 'Error';
    case 'processing': return 'Processing';
    case 'downloading': return 'Downloading';
    default: return 'Queued';
  }
};

export default function ActiveDownloadsDrawer({ open, onClose, downloads, onDismiss }: ActiveDownloadsDrawerProps) {
  const active = downloads.filter(d => d.status !== 'complete' && d.status !== 'error');
  const finished = downloads.filter(d => d.status === 'complete' || d.status === 'error');

  return (
    <Drawer open={open} onClose={onClose} placement="right" size="xs">
      <Drawer.Header closeButton onClose={onClose}>
        <Drawer.Title style={{ fontWeight: 700 }}>
          Active Downloads
          {active.length > 0 && (
            <Tag color="violet" size="sm" style={{ marginLeft: 8 }}>{active.length} active</Tag>
          )}
        </Drawer.Title>
      </Drawer.Header>
      <Drawer.Body style={{ padding: '16px' }}>
        {downloads.length === 0 && (
          <div className="empty-state">
            <p>No downloads yet.</p>
            <p style={{ fontSize: 12 }}>Start a download and it will appear here.</p>
          </div>
        )}

        {active.length > 0 && (
          <>
            <div className="section-title">In Progress</div>
            {active.map(dl => (
              <div key={dl.id} className="download-item">
                <Stack justifyContent="space-between" alignItems="flex-start">
                  <div style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                    <div className="download-item-title">{dl.artist} – {dl.title}</div>
                    <div className="download-item-sub">{dl.manufacturer}</div>
                  </div>
                  <Tag color={statusColor(dl.status)} size="sm">{statusLabel(dl.status)}</Tag>
                </Stack>
                <Progress.Line
                  percent={dl.percent}
                  status={dl.status === 'error' ? 'fail' : dl.status === 'complete' ? 'success' : 'active'}
                  strokeColor={dl.status === 'processing' ? '#8b5cf6' : undefined}
                  style={{ padding: '4px 0 0' }}
                />
                {dl.error && <div style={{ fontSize: 11, color: '#f87171', marginTop: 4 }}>{dl.error}</div>}
              </div>
            ))}
          </>
        )}

        {active.length > 0 && finished.length > 0 && <Divider style={{ margin: '12px 0' }} />}

        {finished.length > 0 && (
          <>
            <div className="section-title">Completed</div>
            {finished.map(dl => (
              <div key={dl.id} className="download-item">
                <Stack justifyContent="space-between" alignItems="center">
                  <div style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                    <div className="download-item-title">{dl.artist} – {dl.title}</div>
                    <div className="download-item-sub">{dl.manufacturer}</div>
                  </div>
                  <Stack spacing={6} alignItems="center">
                    <Tag color={statusColor(dl.status)} size="sm">{statusLabel(dl.status)}</Tag>
                    <IconButton
                      icon={<CloseIcon />}
                      size="xs"
                      appearance="subtle"
                      onClick={() => onDismiss(dl.id)}
                      title="Dismiss"
                    />
                  </Stack>
                </Stack>
                {dl.error && <div style={{ fontSize: 11, color: '#f87171', marginTop: 4 }}>{dl.error}</div>}
              </div>
            ))}
          </>
        )}
      </Drawer.Body>
    </Drawer>
  );
}
